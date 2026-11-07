import { backupTablesToSnapshot, snapshotToBackupTables, snapshotToMonthlyTables, type BackupTables } from '../domain/backup'
import type { FinanceSnapshot } from '../domain/models'

const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets'
const API_ROOT = 'https://sheets.googleapis.com/v4/spreadsheets'
const CORE_SHEETS = ['METADATA', 'FONDOS', 'CATEGORIAS', 'MOVIMIENTOS'] as const

interface GoogleTokenResponse { access_token?: string; error?: string; error_description?: string }
interface GoogleTokenClient { requestAccessToken(options?: { prompt?: string }): void }
interface GoogleIdentityWindow extends Window {
  google?: { accounts: { oauth2: { initTokenClient(config: { client_id: string; scope: string; callback: (response: GoogleTokenResponse) => void; error_callback?: (error: { type?: string }) => void }): GoogleTokenClient } } }
}

interface SheetPropertiesResponse { sheets?: Array<{ properties?: { sheetId?: number; title?: string } }> }
interface BatchGetResponse { valueRanges?: Array<{ range?: string; values?: unknown[][] }> }

export class GoogleSheetsBackupService {
  constructor(private clientId: string, private spreadsheetId: string) {}

  async upload(snapshot: FinanceSnapshot): Promise<string> {
    const accessToken = await requestGoogleAccessToken(this.clientId)
    const monthly = snapshotToMonthlyTables(snapshot)
    await this.ensureManagedSheets(accessToken, monthly.map((table) => table.title))
    const tables = snapshotToBackupTables(snapshot)
    const entries = [
      { title: 'FONDOS', values: tables.funds },
      { title: 'CATEGORIAS', values: tables.categories },
      { title: 'MOVIMIENTOS', values: tables.movements },
      ...monthly,
      { title: 'METADATA', values: tables.metadata },
    ]
    await this.api(accessToken, '/values:batchClear', {
      method: 'POST',
      body: JSON.stringify({ ranges: entries.map((entry) => `'${entry.title}'`) }),
    })
    await this.api(accessToken, '/values:batchUpdate', {
      method: 'POST',
      body: JSON.stringify({ valueInputOption: 'RAW', data: entries.map((entry) => ({ range: `'${entry.title}'!A1`, majorDimension: 'ROWS', values: entry.values })) }),
    })
    return tables.metadata.find((row) => row[0] === 'backedUpAt')?.[1] ?? new Date().toISOString()
  }

  async download(): Promise<{ snapshot: FinanceSnapshot; backedUpAt: string }> {
    const accessToken = await requestGoogleAccessToken(this.clientId)
    const query = new URLSearchParams()
    CORE_SHEETS.forEach((sheet) => query.append('ranges', `'${sheet}'`))
    query.set('majorDimension', 'ROWS')
    const response = await this.api<BatchGetResponse>(accessToken, `/values:batchGet?${query.toString()}`)
    if (response.valueRanges?.length !== CORE_SHEETS.length) throw new Error('El Sheet no contiene todas las hojas necesarias.')
    const rows = response.valueRanges.map((range) => normalizeRows(range.values ?? []))
    const tables: BackupTables = { metadata: rows[0], funds: rows[1], categories: rows[2], movements: rows[3] }
    const snapshot = backupTablesToSnapshot(tables)
    const backedUpAt = tables.metadata.find((row) => row[0] === 'backedUpAt')?.[1] ?? ''
    return { snapshot, backedUpAt }
  }

  private async ensureManagedSheets(accessToken: string, monthlyTitles: string[]) {
    const current = await this.api<SheetPropertiesResponse>(accessToken, '?fields=sheets.properties(sheetId,title)')
    const properties = current.sheets?.flatMap((sheet) => sheet.properties?.title ? [{ title: sheet.properties.title, sheetId: sheet.properties.sheetId }] : []) ?? []
    const required = [...CORE_SHEETS, ...monthlyTitles]
    const existing = new Set(properties.map((property) => property.title))
    const requests: unknown[] = required.filter((title) => !existing.has(title)).map((title) => ({ addSheet: { properties: { title, gridProperties: { rowCount: 1000, columnCount: 12, frozenRowCount: 1 } } } }))
    properties.filter((property) => /^CM_\d{4}-\d{2}$/.test(property.title) && !monthlyTitles.includes(property.title) && property.sheetId !== undefined).forEach((property) => requests.push({ deleteSheet: { sheetId: property.sheetId } }))
    if (requests.length) await this.api(accessToken, ':batchUpdate', { method: 'POST', body: JSON.stringify({ requests }) })
  }

  private async api<T = unknown>(accessToken: string, suffix: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`${API_ROOT}/${encodeURIComponent(this.spreadsheetId)}${suffix}`, {
      ...init,
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', ...init.headers },
    })
    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null
      throw new Error(payload?.error?.message ?? `Google Sheets respondió con el error ${response.status}.`)
    }
    return response.status === 204 ? undefined as T : response.json() as Promise<T>
  }
}

export function extractSpreadsheetId(value: string): string | null {
  const trimmed = value.trim()
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  const id = match?.[1] ?? trimmed
  return /^[a-zA-Z0-9-_]{20,}$/.test(id) ? id : null
}

function requestGoogleAccessToken(clientId: string): Promise<string> {
  const google = (window as GoogleIdentityWindow).google
  if (!google?.accounts.oauth2) throw new Error('Google Identity todavía no está disponible. Revisa tu conexión e inténtalo nuevamente.')
  return new Promise((resolve, reject) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SHEETS_SCOPE,
      callback: (response) => response.access_token ? resolve(response.access_token) : reject(new Error(response.error_description ?? response.error ?? 'Google no autorizó el acceso.')),
      error_callback: () => reject(new Error('La autorización de Google fue cerrada o interrumpida.')),
    })
    client.requestAccessToken({ prompt: '' })
  })
}

function normalizeRows(values: unknown[][]): string[][] {
  return values.map((row) => row.map((cell) => String(cell ?? '')))
}

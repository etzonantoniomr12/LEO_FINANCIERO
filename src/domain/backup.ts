import { categoryDisplayName } from './categories'
import type { Category, FinanceSnapshot, Fund, Movement, MovementClassification, MovementKind } from './models'

export const BACKUP_SCHEMA_VERSION = '2'

export interface BackupTables {
  metadata: string[][]
  funds: string[][]
  categories: string[][]
  movements: string[][]
}

export interface MonthlyTable {
  title: string
  values: string[][]
}

const fundHeader = ['id', 'name', 'initialBalanceCents', 'archived', 'createdAt', 'updatedAt', 'icon']
const categoryHeader = ['id', 'name', 'kind', 'parentId', 'archived', 'createdAt', 'updatedAt', 'icon']
const movementHeader = ['id', 'kind', 'classification', 'fundId', 'toFundId', 'categoryId', 'amountCents', 'occurredAt', 'note', 'createdAt', 'updatedAt']

export function snapshotToBackupTables(snapshot: FinanceSnapshot, backedUpAt = new Date().toISOString()): BackupTables {
  return {
    metadata: [['key', 'value'], ['schemaVersion', BACKUP_SCHEMA_VERSION], ['backedUpAt', backedUpAt], ['currency', 'PEN']],
    funds: [fundHeader, ...snapshot.funds.map((fund) => [fund.id, fund.name, String(fund.initialBalanceCents), String(fund.archived), fund.createdAt, fund.updatedAt, fund.icon ?? ''])],
    categories: [categoryHeader, ...snapshot.categories.map((category) => [category.id, category.name, category.kind, category.parentId ?? '', String(category.archived), category.createdAt, category.updatedAt, category.icon ?? ''])],
    movements: [movementHeader, ...snapshot.movements.map((movement) => [movement.id, movement.kind, movement.classification ?? '', movement.fundId, movement.toFundId ?? '', movement.categoryId ?? '', String(movement.amountCents), movement.occurredAt, movement.note, movement.createdAt, movement.updatedAt])],
  }
}

export function backupTablesToSnapshot(tables: BackupTables): FinanceSnapshot {
  assertHeader(tables.metadata, ['key', 'value'], 'METADATA')
  const metadata = new Map(tables.metadata.slice(1).map((row) => [row[0], row[1]]))
  if (metadata.get('schemaVersion') !== BACKUP_SCHEMA_VERSION) throw new Error('La versión del respaldo no es compatible.')
  if (metadata.get('currency') !== 'PEN') throw new Error('La moneda del respaldo no es compatible.')
  if (!validDate(metadata.get('backedUpAt') ?? '')) throw new Error('La fecha del respaldo es inválida.')
  assertHeader(tables.funds, fundHeader, 'FONDOS')
  assertHeader(tables.categories, categoryHeader, 'CATEGORIAS')
  assertHeader(tables.movements, movementHeader, 'MOVIMIENTOS')

  const funds = tables.funds.slice(1).filter(hasValues).map(parseFund)
  const categories = tables.categories.slice(1).filter(hasValues).map(parseCategory)
  const movements = tables.movements.slice(1).filter(hasValues).map(parseMovement)
  assertUnique(funds, 'fondos')
  assertUnique(categories, 'categorías')
  assertUnique(movements, 'movimientos')

  const fundIds = new Set(funds.map((fund) => fund.id))
  const categoryById = new Map(categories.map((category) => [category.id, category]))
  for (const category of categories) {
    if (!category.parentId) continue
    const parent = categoryById.get(category.parentId)
    if (!parent || parent.kind !== 'expense' || parent.parentId !== null || category.kind !== 'expense') throw new Error(`La categoría ${category.name} tiene una relación padre inválida.`)
  }
  for (const movement of movements) validateMovementRelations(movement, fundIds, categoryById)
  return { funds, categories, movements }
}

export function snapshotToMonthlyTables(snapshot: FinanceSnapshot): MonthlyTable[] {
  const groups = new Map<string, Movement[]>()
  for (const movement of snapshot.movements) {
    const date = new Date(movement.occurredAt)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    groups.set(key, [...(groups.get(key) ?? []), movement])
  }
  return [...groups.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([key, movements]) => ({
    title: `CM_${key}`,
    values: [
      ['Fecha', 'Tipo', 'Clasificación', 'Fondo', 'Fondo destino', 'Categoría', 'Importe PEN', 'Nota'],
      ...movements.sort((left, right) => left.occurredAt.localeCompare(right.occurredAt)).map((movement) => {
        const fund = snapshot.funds.find((item) => item.id === movement.fundId)?.name ?? movement.fundId
        const toFund = snapshot.funds.find((item) => item.id === movement.toFundId)?.name ?? ''
        const category = categoryDisplayName(snapshot.categories.find((item) => item.id === movement.categoryId), snapshot.categories) ?? ''
        return [movement.occurredAt, movement.kind, movement.classification ?? '', fund, toFund, category, (movement.amountCents / 100).toFixed(2), movement.note]
      }),
    ],
  }))
}

function parseFund(row: string[], index: number): Fund {
  assertLength(row, fundHeader.length - 1, 'FONDOS', index)
  return { id: required(row[0], 'ID de fondo'), name: required(row[1], 'nombre de fondo'), initialBalanceCents: integer(row[2], 'saldo inicial', true), archived: boolean(row[3]), createdAt: date(row[4]), updatedAt: date(row[5]), ...(row[6] ? { icon: row[6] } : {}) }
}

function parseCategory(row: string[], index: number): Category {
  assertLength(row, categoryHeader.length - 1, 'CATEGORIAS', index)
  if (row[2] !== 'income' && row[2] !== 'expense') throw new Error('Existe una categoría con naturaleza inválida.')
  return { id: required(row[0], 'ID de categoría'), name: required(row[1], 'nombre de categoría'), kind: row[2], parentId: row[3] || null, archived: boolean(row[4]), createdAt: date(row[5]), updatedAt: date(row[6]), ...(row[7] ? { icon: row[7] } : {}) }
}

function parseMovement(row: string[], index: number): Movement {
  assertLength(row, movementHeader.length, 'MOVIMIENTOS', index)
  if (!['income', 'expense', 'transfer'].includes(row[1])) throw new Error('Existe un movimiento con naturaleza inválida.')
  if (row[2] && !['daily', 'monthly', 'one_time'].includes(row[2])) throw new Error('Existe un movimiento con clasificación inválida.')
  return { id: required(row[0], 'ID de movimiento'), kind: row[1] as MovementKind, classification: (row[2] || null) as MovementClassification | null, fundId: required(row[3], 'fondo del movimiento'), toFundId: row[4] || null, categoryId: row[5] || null, amountCents: integer(row[6], 'importe'), occurredAt: date(row[7]), note: row[8] ?? '', createdAt: date(row[9]), updatedAt: date(row[10]) }
}

function validateMovementRelations(movement: Movement, fundIds: Set<string>, categories: Map<string, Category>) {
  if (!fundIds.has(movement.fundId)) throw new Error('Un movimiento referencia un fondo inexistente.')
  if (movement.kind === 'transfer') {
    if (!movement.toFundId || !fundIds.has(movement.toFundId) || movement.toFundId === movement.fundId || movement.categoryId || movement.classification) throw new Error('Existe una transferencia inválida.')
    return
  }
  const category = movement.categoryId ? categories.get(movement.categoryId) : null
  if (!category || category.kind !== movement.kind) throw new Error('Un movimiento referencia una categoría inválida.')
  if (movement.toFundId) throw new Error('Un ingreso o egreso no puede tener fondo de destino.')
  const validClassifications = movement.kind === 'income' ? ['monthly', 'one_time'] : ['daily', 'monthly', 'one_time']
  if (!movement.classification || !validClassifications.includes(movement.classification)) throw new Error('Un movimiento tiene una clasificación incompatible.')
}

function assertHeader(rows: string[][], expected: string[], sheet: string) {
  if (!rows.length || expected.some((value, index) => rows[0]?.[index] !== value)) throw new Error(`La hoja ${sheet} no tiene el formato esperado.`)
}
function assertLength(row: string[], length: number, sheet: string, index: number) { if (row.length < length) throw new Error(`La fila ${index + 2} de ${sheet} está incompleta.`) }
function assertUnique(items: { id: string }[], label: string) { if (new Set(items.map((item) => item.id)).size !== items.length) throw new Error(`El respaldo contiene ${label} duplicados.`) }
function hasValues(row: string[]) { return row.some((cell) => String(cell ?? '').trim() !== '') }
function required(value: string, label: string) { if (!value?.trim()) throw new Error(`Falta ${label} en el respaldo.`); return value.trim() }
function integer(value: string, label: string, allowZero = false) { const parsed = Number(value); if (!Number.isSafeInteger(parsed) || parsed < (allowZero ? 0 : 1)) throw new Error(`El ${label} es inválido.`); return parsed }
function boolean(value: string) { if (value === 'true') return true; if (value === 'false') return false; throw new Error('Existe un estado archivado inválido.') }
function date(value: string) { if (!validDate(value)) throw new Error('Existe una fecha inválida en el respaldo.'); return value }
function validDate(value: string) { return Boolean(value) && Number.isFinite(Date.parse(value)) }

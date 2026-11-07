import { describe, expect, it } from 'vitest'
import { extractSpreadsheetId } from './googleSheetsBackup'

describe('configuración de Google Sheets', () => {
  it('extrae el identificador desde una URL o un ID directo', () => {
    const id = '1ExampleSpreadsheetIdForTestingOnly1234567890'
    expect(extractSpreadsheetId(`https://docs.google.com/spreadsheets/d/${id}/edit`)).toBe(id)
    expect(extractSpreadsheetId(id)).toBe(id)
    expect(extractSpreadsheetId('incorrecto')).toBeNull()
  })
})

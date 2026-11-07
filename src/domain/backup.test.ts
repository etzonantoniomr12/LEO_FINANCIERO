import { describe, expect, it } from 'vitest'
import { backupTablesToSnapshot, snapshotToBackupTables, snapshotToMonthlyTables } from './backup'
import type { FinanceSnapshot } from './models'

const snapshot: FinanceSnapshot = {
  funds: [{ id: 'fund', name: 'BCP', initialBalanceCents: 100_00, archived: false, createdAt: '2026-11-01T00:00:00.000Z', updatedAt: '2026-11-01T00:00:00.000Z' }],
  categories: [{ id: 'food', name: 'Alimentación', kind: 'expense', parentId: null, archived: false, createdAt: '2026-11-01T00:00:00.000Z', updatedAt: '2026-11-01T00:00:00.000Z' }],
  movements: [{ id: 'move', kind: 'expense', classification: 'daily', fundId: 'fund', toFundId: null, categoryId: 'food', amountCents: 10_00, occurredAt: '2026-11-07T12:00:00.000Z', note: 'Almuerzo', createdAt: '2026-11-07T12:00:00.000Z', updatedAt: '2026-11-07T12:00:00.000Z' }],
}

describe('respaldo normalizado', () => {
  it('conserva íntegramente una instantánea en una ida y vuelta', () => {
    expect(backupTablesToSnapshot(snapshotToBackupTables(snapshot, '2026-11-07T13:00:00.000Z'))).toEqual(snapshot)
  })

  it('rechaza relaciones inválidas antes de restaurar', () => {
    const tables = snapshotToBackupTables(snapshot, '2026-11-07T13:00:00.000Z')
    tables.movements[1][3] = 'missing-fund'
    expect(() => backupTablesToSnapshot(tables)).toThrow(/fondo inexistente/)
  })

  it('genera una vista legible por cada mes', () => {
    const tables = snapshotToMonthlyTables(snapshot)
    expect(tables).toHaveLength(1)
    expect(tables[0].title).toBe('CM_2026-11')
    expect(tables[0].values[1]).toContain('Alimentación')
  })

  it('conserva los iconos configurados', () => {
    const personalized = {
      ...snapshot,
      funds: [{ ...snapshot.funds[0], icon: '/icons/logo_bcp.png' }],
      categories: [{ ...snapshot.categories[0], icon: '🍽️' }],
    }
    expect(backupTablesToSnapshot(snapshotToBackupTables(personalized, '2026-11-07T13:00:00.000Z'))).toEqual(personalized)
  })
})

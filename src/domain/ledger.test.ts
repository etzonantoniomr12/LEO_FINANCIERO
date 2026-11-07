import { describe, expect, it } from 'vitest'
import { calculateFundBalances, movementTotals, validateMovement } from './ledger'
import type { FinanceSnapshot, Movement } from './models'

const snapshot: FinanceSnapshot = {
  funds: [
    { id: 'a', name: 'BCP', initialBalanceCents: 100_00, archived: false, createdAt: '', updatedAt: '' },
    { id: 'b', name: 'Efectivo', initialBalanceCents: 20_00, archived: false, createdAt: '', updatedAt: '' },
  ],
  categories: [
    { id: 'food', name: 'Comida', kind: 'expense', parentId: null, archived: false, createdAt: '', updatedAt: '' },
    { id: 'salary', name: 'Sueldo', kind: 'income', parentId: null, archived: false, createdAt: '', updatedAt: '' },
  ],
  movements: [],
}

const movement = (overrides: Partial<Movement>): Movement => ({
  id: 'm', kind: 'expense', classification: 'daily', fundId: 'a', toFundId: null,
  categoryId: 'food', amountCents: 10_00, occurredAt: '2026-11-07T12:00:00.000Z', note: '',
  createdAt: '', updatedAt: '', ...overrides,
})

describe('libro financiero', () => {
  it('mueve dinero entre fondos sin cambiar el saldo total', () => {
    const transfer = movement({ kind: 'transfer', classification: null, categoryId: null, toFundId: 'b', amountCents: 30_00 })
    const balances = calculateFundBalances({ ...snapshot, movements: [transfer] })
    expect(balances.find((fund) => fund.id === 'a')?.balanceCents).toBe(70_00)
    expect(balances.find((fund) => fund.id === 'b')?.balanceCents).toBe(50_00)
    expect(balances.reduce((sum, fund) => sum + fund.balanceCents, 0)).toBe(120_00)
    expect(movementTotals([transfer])).toEqual({ incomeCents: 0, expenseCents: 0 })
  })

  it('suma únicamente ingresos y egresos reales', () => {
    const movements = [
      movement({ kind: 'income', classification: 'monthly', categoryId: 'salary', amountCents: 500_00 }),
      movement({ amountCents: 40_00 }),
      movement({ kind: 'transfer', classification: null, categoryId: null, toFundId: 'b', amountCents: 50_00 }),
    ]
    expect(movementTotals(movements)).toEqual({ incomeCents: 500_00, expenseCents: 40_00 })
  })

  it('rechaza clasificaciones incompatibles', () => {
    expect(validateMovement(movement({ kind: 'income', categoryId: 'salary', classification: 'daily' }), snapshot))
      .toContain('clasificación válida')
    expect(validateMovement(movement({ kind: 'transfer', categoryId: null, classification: 'monthly', toFundId: 'b' }), snapshot))
      .toContain('no usa categoría')
  })

  it('rechaza seleccionar el tipo principal cuando tiene subcategorías', () => {
    const withChild: FinanceSnapshot = {
      ...snapshot,
      categories: [
        ...snapshot.categories,
        { id: 'lunch', name: 'Almuerzo', kind: 'expense', parentId: 'food', archived: false, createdAt: '', updatedAt: '' },
      ],
    }
    expect(validateMovement(movement({ categoryId: 'food' }), withChild)).toContain('subcategoría')
    expect(validateMovement(movement({ categoryId: 'lunch' }), withChild)).toBeNull()
  })
})

import { describe, expect, it } from 'vitest'
import { filterMovements, localDateKey } from './movementFilters'
import type { Category, Movement } from './models'

const categories: Category[] = [
  { id: 'food', name: 'Alimentación', kind: 'expense', parentId: null, archived: false, createdAt: '', updatedAt: '' },
  { id: 'lunch', name: 'Almuerzo', kind: 'expense', parentId: 'food', archived: false, createdAt: '', updatedAt: '' },
  { id: 'salary', name: 'Sueldo', kind: 'income', parentId: null, archived: false, createdAt: '', updatedAt: '' },
]

const movement = (id: string, categoryId: string | null, occurredAt: string, kind: Movement['kind'] = 'expense'): Movement => ({
  id, categoryId, occurredAt, kind, classification: kind === 'transfer' ? null : 'monthly',
  fundId: 'fund', toFundId: kind === 'transfer' ? 'other' : null, amountCents: 100,
  note: '', createdAt: '', updatedAt: '',
})

describe('filtros de movimientos', () => {
  const movements = [
    movement('lunch-1', 'lunch', '2026-11-07T15:00:00.000Z'),
    movement('salary-1', 'salary', '2026-11-06T15:00:00.000Z', 'income'),
    movement('transfer-1', null, '2026-11-07T17:00:00.000Z', 'transfer'),
  ]

  it('filtra una categoría principal incluyendo sus subcategorías', () => {
    expect(filterMovements(movements, categories, { categoryId: 'food', date: '' }).map((item) => item.id))
      .toEqual(['lunch-1'])
  })

  it('combina categoría y fecha', () => {
    expect(filterMovements(movements, categories, { categoryId: 'salary', date: '2026-11-07' })).toEqual([])
    expect(filterMovements(movements, categories, { categoryId: 'transfer', date: '2026-11-07' }).map((item) => item.id))
      .toEqual(['transfer-1'])
  })

  it('genera la fecha local utilizada por Inicio', () => {
    const today = new Date(2026, 10, 7, 23, 30)
    expect(localDateKey(today)).toBe('2026-11-07')
  })
})

import { describe, expect, it } from 'vitest'
import { cumulativePoints, dailyExpenseSummary, shiftMonth } from './analytics'
import type { Movement } from './models'

const movement = (id: string, amountCents: number, occurredAt: string, classification: Movement['classification'] = 'daily'): Movement => ({
  id, amountCents, occurredAt, classification, kind: 'expense', fundId: 'fund', toFundId: null,
  categoryId: 'category', note: '', createdAt: '', updatedAt: '',
})

describe('analítica mensual', () => {
  it('construye puntos acumulados en orden cronológico', () => {
    const points = cumulativePoints([
      movement('second', 5_00, '2026-11-10T10:00:00.000Z'),
      movement('first', 10_00, '2026-11-02T10:00:00.000Z'),
    ])
    expect(points.map((point) => [point.movement.id, point.cumulativeCents])).toEqual([
      ['first', 10_00], ['second', 15_00],
    ])
  })

  it('calcula el promedio actual incluyendo días sin gasto', () => {
    const summary = dailyExpenseSummary(
      [movement('one', 30_00, '2026-11-01T15:00:00.000Z')],
      new Date(2026, 10, 1),
      new Date(2026, 10, 3, 18),
    )
    expect(summary.elapsedDays).toBe(3)
    expect(summary.points.map((point) => point.amountCents)).toEqual([30_00, 0, 0])
    expect(summary.averageCents).toBe(10_00)
  })

  it('usa todos los días de un mes histórico, incluidos años bisiestos', () => {
    const summary = dailyExpenseSummary([], new Date(2024, 1, 1), new Date(2026, 10, 7))
    expect(summary.elapsedDays).toBe(29)
    expect(summary.points).toHaveLength(29)
  })

  it('navega entre límites de año', () => {
    expect(shiftMonth(new Date(2026, 0, 1), -1)).toEqual(new Date(2025, 11, 1))
  })
})

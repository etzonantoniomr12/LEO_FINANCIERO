import { describe, expect, it } from 'vitest'
import { create31DayDemo } from './demoFinance'

describe('demostración de 31 días', () => {
  it('genera tres comidas diarias y los pagos mensuales y puntuales acordados', () => {
    const demo = create31DayDemo(new Date(2026, 10, 7))
    const daily = demo.snapshot.movements.filter((movement) => movement.kind === 'expense' && movement.classification === 'daily')
    const monthly = demo.snapshot.movements.filter((movement) => movement.kind === 'expense' && movement.classification === 'monthly')
    const oneTime = demo.snapshot.movements.filter((movement) => movement.kind === 'expense' && movement.classification === 'one_time')

    expect(demo.month).toEqual(new Date(2026, 9, 1))
    expect(daily).toHaveLength(93)
    expect(monthly.map((movement) => movement.amountCents)).toEqual([4_000, 8_900, 1_300, 2_300])
    expect(oneTime.map((movement) => movement.amountCents)).toEqual([40_000, 20_000, 20_000])
    expect(daily.filter((movement) => movement.categoryId === 'demo-breakfast').every((movement) => movement.amountCents >= 500 && movement.amountCents <= 800)).toBe(true)
    expect(daily.filter((movement) => movement.categoryId === 'demo-lunch').every((movement) => movement.amountCents >= 800 && movement.amountCents <= 1_200)).toBe(true)
    expect(daily.filter((movement) => movement.categoryId === 'demo-dinner').every((movement) => movement.amountCents >= 500 && movement.amountCents <= 1_000)).toBe(true)
  })
})

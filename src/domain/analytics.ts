import type { Movement } from './models'

export interface CumulativePoint {
  movement: Movement
  cumulativeCents: number
}

export interface DailyExpensePoint {
  day: number
  amountCents: number
  movements: Movement[]
}

export interface DailyExpenseSummary {
  points: DailyExpensePoint[]
  totalCents: number
  averageCents: number
  elapsedDays: number
}

export function normalizeMonth(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), 1)
}

export function isSameMonth(left: Date, right: Date): boolean {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth()
}

export function shiftMonth(value: Date, delta: number): Date {
  return new Date(value.getFullYear(), value.getMonth() + delta, 1)
}

export function cumulativePoints(movements: Movement[]): CumulativePoint[] {
  let cumulativeCents = 0
  return [...movements]
    .sort((left, right) => left.occurredAt.localeCompare(right.occurredAt))
    .map((movement) => {
      cumulativeCents += movement.amountCents
      return { movement, cumulativeCents }
    })
}

export function dailyExpenseSummary(
  movements: Movement[],
  month: Date,
  today = new Date(),
): DailyExpenseSummary {
  const selected = normalizeMonth(month)
  const current = normalizeMonth(today)
  const selectedKey = selected.getFullYear() * 12 + selected.getMonth()
  const currentKey = current.getFullYear() * 12 + current.getMonth()
  const daysInMonth = new Date(selected.getFullYear(), selected.getMonth() + 1, 0).getDate()
  const elapsedDays = selectedKey > currentKey ? 0 : selectedKey === currentKey ? today.getDate() : daysInMonth
  const dailyMovements = movements.filter((movement) => {
    const date = new Date(movement.occurredAt)
    return movement.kind === 'expense' && movement.classification === 'daily' &&
      date.getFullYear() === selected.getFullYear() && date.getMonth() === selected.getMonth() &&
      date.getDate() <= elapsedDays
  })

  const points = Array.from({ length: elapsedDays }, (_, index) => {
    const day = index + 1
    const entries = dailyMovements.filter((movement) => new Date(movement.occurredAt).getDate() === day)
    return {
      day,
      amountCents: entries.reduce((sum, movement) => sum + movement.amountCents, 0),
      movements: entries.sort((left, right) => left.occurredAt.localeCompare(right.occurredAt)),
    }
  })
  const totalCents = points.reduce((sum, point) => sum + point.amountCents, 0)
  return {
    points,
    totalCents,
    averageCents: elapsedDays > 0 ? Math.round(totalCents / elapsedDays) : 0,
    elapsedDays,
  }
}

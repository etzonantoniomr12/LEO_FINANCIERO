import type { Category, Movement } from './models'

export interface MovementFilters {
  categoryId: string
  date: string
}

export function localDateKey(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function filterMovements(
  movements: Movement[],
  categories: Category[],
  filters: MovementFilters,
): Movement[] {
  return movements.filter((movement) => {
    if (filters.date && localDateKey(movement.occurredAt) !== filters.date) return false
    if (!filters.categoryId) return true
    if (filters.categoryId === 'transfer') return movement.kind === 'transfer'
    if (movement.categoryId === filters.categoryId) return true

    const movementCategory = categories.find((category) => category.id === movement.categoryId)
    return movementCategory?.parentId === filters.categoryId
  })
}

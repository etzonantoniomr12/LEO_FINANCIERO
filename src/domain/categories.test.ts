import { describe, expect, it } from 'vitest'
import { buildExpenseCategoryChoices, categoryDisplayName } from './categories'
import type { Category } from './models'

const category = (id: string, name: string, parentId: string | null = null): Category => ({
  id, name, parentId, kind: 'expense', archived: false, createdAt: '', updatedAt: '',
})

describe('jerarquía de categorías', () => {
  it('usa como agrupador un tipo que tiene subcategorías', () => {
    const food = category('food', 'ALIMENTACIÓN')
    const lunch = category('lunch', 'ALMUERZO', 'food')
    const medicine = category('medicine', 'MEDICINAS')
    const choices = buildExpenseCategoryChoices([food, lunch, medicine])

    expect(choices.standalone.map((item) => item.id)).toEqual(['medicine'])
    expect(choices.groups[0].parent.id).toBe('food')
    expect(choices.groups[0].children.map((item) => item.id)).toEqual(['lunch'])
    expect(categoryDisplayName(lunch, [food, lunch])).toBe('ALIMENTACIÓN · ALMUERZO')
  })
})

import type { Category } from './models'

export interface ExpenseCategoryGroup {
  parent: Category
  children: Category[]
}

export interface ExpenseCategoryChoices {
  standalone: Category[]
  groups: ExpenseCategoryGroup[]
}

const byName = (left: Category, right: Category) => left.name.localeCompare(right.name, 'es')

export function buildExpenseCategoryChoices(categories: Category[]): ExpenseCategoryChoices {
  const activeExpenses = categories.filter((category) => category.kind === 'expense' && !category.archived)
  const parents = activeExpenses.filter((category) => category.parentId === null).sort(byName)
  const groups: ExpenseCategoryGroup[] = []
  const standalone: Category[] = []

  for (const parent of parents) {
    const children = activeExpenses
      .filter((category) => category.parentId === parent.id)
      .sort(byName)
    if (children.length > 0) groups.push({ parent, children })
    else standalone.push(parent)
  }

  return { standalone, groups }
}

export function categoryDisplayName(category: Category | undefined, categories: Category[]): string | null {
  if (!category) return null
  if (!category.parentId) return category.name
  const parent = categories.find((candidate) => candidate.id === category.parentId)
  return parent ? `${parent.name} · ${category.name}` : category.name
}

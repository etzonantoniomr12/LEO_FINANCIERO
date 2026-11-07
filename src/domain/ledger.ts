import type { FinanceSnapshot, FundBalance, Movement } from './models'

export function calculateFundBalances(snapshot: FinanceSnapshot): FundBalance[] {
  const balances = new Map(snapshot.funds.map((fund) => [fund.id, fund.initialBalanceCents]))

  for (const movement of snapshot.movements) {
    if (movement.kind === 'income') {
      balances.set(movement.fundId, (balances.get(movement.fundId) ?? 0) + movement.amountCents)
    } else if (movement.kind === 'expense') {
      balances.set(movement.fundId, (balances.get(movement.fundId) ?? 0) - movement.amountCents)
    } else {
      balances.set(movement.fundId, (balances.get(movement.fundId) ?? 0) - movement.amountCents)
      if (movement.toFundId) {
        balances.set(movement.toFundId, (balances.get(movement.toFundId) ?? 0) + movement.amountCents)
      }
    }
  }

  return snapshot.funds.map((fund) => ({
    ...fund,
    balanceCents: balances.get(fund.id) ?? fund.initialBalanceCents,
  }))
}

export function movementsForMonth(movements: Movement[], reference: Date): Movement[] {
  return movements.filter((movement) => {
    const date = new Date(movement.occurredAt)
    return date.getFullYear() === reference.getFullYear() && date.getMonth() === reference.getMonth()
  })
}

export function movementTotals(movements: Movement[]) {
  return movements.reduce(
    (totals, movement) => {
      if (movement.kind === 'income') totals.incomeCents += movement.amountCents
      if (movement.kind === 'expense') totals.expenseCents += movement.amountCents
      return totals
    },
    { incomeCents: 0, expenseCents: 0 },
  )
}

export function sortMovementsNewestFirst(movements: Movement[]): Movement[] {
  return [...movements].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
}

export function validateMovement(movement: Movement, snapshot: FinanceSnapshot): string | null {
  if (!Number.isInteger(movement.amountCents) || movement.amountCents <= 0) return 'El monto no es válido.'
  if (!snapshot.funds.some((fund) => fund.id === movement.fundId && !fund.archived)) {
    return 'El fondo seleccionado no está disponible.'
  }
  if (movement.kind === 'transfer') {
    if (!movement.toFundId || movement.toFundId === movement.fundId) return 'Selecciona dos fondos diferentes.'
    if (!snapshot.funds.some((fund) => fund.id === movement.toFundId && !fund.archived)) {
      return 'El fondo de destino no está disponible.'
    }
    if (movement.categoryId !== null || movement.classification !== null) {
      return 'Una transferencia no usa categoría ni clasificación.'
    }
    return null
  }

  const category = snapshot.categories.find(
    (item) => item.id === movement.categoryId && item.kind === movement.kind && !item.archived,
  )
  if (!category) return 'La categoría seleccionada no está disponible.'
  if (
    movement.kind === 'expense' &&
    category.parentId === null &&
    snapshot.categories.some((item) => item.parentId === category.id && !item.archived)
  ) {
    return 'Selecciona una subcategoría para este tipo de egreso.'
  }
  if (movement.kind === 'income' && !['monthly', 'one_time'].includes(movement.classification ?? '')) {
    return 'Selecciona una clasificación válida para el ingreso.'
  }
  if (movement.kind === 'expense' && !['daily', 'monthly', 'one_time'].includes(movement.classification ?? '')) {
    return 'Selecciona una clasificación válida para el egreso.'
  }
  return null
}

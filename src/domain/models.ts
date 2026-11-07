export type MovementKind = 'income' | 'expense' | 'transfer'
export type CategoryKind = 'income' | 'expense'
export type MovementClassification = 'daily' | 'monthly' | 'one_time'

export interface Fund {
  id: string
  name: string
  icon?: string
  initialBalanceCents: number
  archived: boolean
  createdAt: string
  updatedAt: string
}

export interface Category {
  id: string
  name: string
  icon?: string
  kind: CategoryKind
  parentId: string | null
  archived: boolean
  createdAt: string
  updatedAt: string
}

export interface Movement {
  id: string
  kind: MovementKind
  classification: MovementClassification | null
  fundId: string
  toFundId: string | null
  categoryId: string | null
  amountCents: number
  occurredAt: string
  note: string
  createdAt: string
  updatedAt: string
}

export interface FinanceSnapshot {
  funds: Fund[]
  categories: Category[]
  movements: Movement[]
}

export interface FundBalance extends Fund {
  balanceCents: number
}

export const createId = () => crypto.randomUUID()

export const nowIso = () => new Date().toISOString()

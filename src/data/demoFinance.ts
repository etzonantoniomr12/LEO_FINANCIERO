import type { FinanceRepository } from './financeRepository'
import type { Category, FinanceSnapshot, Fund, Movement, MovementClassification, MovementKind } from '../domain/models'

export interface DemoFinanceData {
  month: Date
  snapshot: FinanceSnapshot
}

export function create31DayDemo(reference = new Date()): DemoFinanceData {
  const month = latestCompleted31DayMonth(reference)
  const stamp = new Date().toISOString()
  const fund: Fund = { id: 'demo-bcp', name: 'BCP Demo', icon: '/icons/logo_bcp.png', initialBalanceCents: 1_000_000, archived: false, createdAt: stamp, updatedAt: stamp }
  const categories: Category[] = [
    category('demo-food', 'Alimentación', 'expense', null, stamp),
    category('demo-breakfast', 'Desayuno', 'expense', 'demo-food', stamp),
    category('demo-lunch', 'Almuerzo', 'expense', 'demo-food', stamp),
    category('demo-dinner', 'Cena', 'expense', 'demo-food', stamp),
    category('demo-bitel', 'Telefonía Bitel', 'expense', null, stamp),
    category('demo-chatgpt', 'ChatGPT', 'expense', null, stamp),
    category('demo-apple', 'Apple Music', 'expense', null, stamp),
    category('demo-youtube', 'YouTube Premium', 'expense', null, stamp),
    category('demo-electronics', 'Electrónicos', 'expense', null, stamp),
    category('demo-outings', 'Salidas', 'expense', null, stamp),
    category('demo-salary', 'Sueldo', 'income', null, stamp),
    category('demo-extra', 'Ingreso extra', 'income', null, stamp),
  ]
  const movements: Movement[] = []

  for (let day = 1; day <= 31; day += 1) {
    movements.push(
      movement(`demo-breakfast-${day}`, 'expense', 'daily', 'demo-breakfast', 500 + (day * 37) % 301, month, day, 8, `Desayuno del día ${day}`, stamp),
      movement(`demo-lunch-${day}`, 'expense', 'daily', 'demo-lunch', 800 + (day * 53) % 401, month, day, 13, `Almuerzo del día ${day}`, stamp),
      movement(`demo-dinner-${day}`, 'expense', 'daily', 'demo-dinner', 500 + (day * 71) % 501, month, day, 20, `Cena del día ${day}`, stamp),
    )
  }

  movements.push(
    movement('demo-bitel-payment', 'expense', 'monthly', 'demo-bitel', 4_000, month, 3, 10, 'Plan mensual Bitel', stamp),
    movement('demo-chatgpt-payment', 'expense', 'monthly', 'demo-chatgpt', 8_900, month, 5, 10, 'Suscripción ChatGPT', stamp),
    movement('demo-apple-payment', 'expense', 'monthly', 'demo-apple', 1_300, month, 8, 10, 'Suscripción Apple Music', stamp),
    movement('demo-youtube-payment', 'expense', 'monthly', 'demo-youtube', 2_300, month, 10, 10, 'Suscripción YouTube Premium', stamp),
    movement('demo-headphones', 'expense', 'one_time', 'demo-electronics', 40_000, month, 12, 17, 'Audífonos JBL', stamp),
    movement('demo-outing-14', 'expense', 'one_time', 'demo-outings', 20_000, month, 14, 21, 'Salida quincenal', stamp),
    movement('demo-outing-28', 'expense', 'one_time', 'demo-outings', 20_000, month, 28, 21, 'Salida quincenal', stamp),
    movement('demo-salary-payment', 'income', 'monthly', 'demo-salary', 320_000, month, 1, 9, 'Ingreso mensual', stamp),
    movement('demo-extra-payment', 'income', 'one_time', 'demo-extra', 45_000, month, 18, 16, 'Trabajo adicional', stamp),
  )

  return { month, snapshot: { funds: [fund], categories, movements } }
}

export class DemoFinanceRepository implements FinanceRepository {
  constructor(private snapshot: FinanceSnapshot) {}

  async load() { return structuredClone(this.snapshot) }
  async saveFund(fund: Fund) { this.snapshot.funds = replaceById(this.snapshot.funds, fund) }
  async saveCategory(categoryValue: Category) { this.snapshot.categories = replaceById(this.snapshot.categories, categoryValue) }
  async saveMovement(movementValue: Movement) { this.snapshot.movements = replaceById(this.snapshot.movements, movementValue) }
  async deleteMovement(id: string) { this.snapshot.movements = this.snapshot.movements.filter((item) => item.id !== id) }
  async replaceSnapshot(snapshot: FinanceSnapshot) { this.snapshot = structuredClone(snapshot) }
}

function latestCompleted31DayMonth(reference: Date) {
  let candidate = new Date(reference.getFullYear(), reference.getMonth() - 1, 1)
  while (new Date(candidate.getFullYear(), candidate.getMonth() + 1, 0).getDate() !== 31) candidate = new Date(candidate.getFullYear(), candidate.getMonth() - 1, 1)
  return candidate
}

function category(id: string, name: string, kind: Category['kind'], parentId: string | null, stamp: string): Category {
  const icons: Record<string, string> = {
    'demo-food': '🍽️', 'demo-breakfast': '🥐', 'demo-lunch': '🍛', 'demo-dinner': '🌙', 'demo-bitel': '/icons/logo_bitel.png',
    'demo-chatgpt': '/icons/logo_chatgpt.jpg', 'demo-apple': '/icons/logo_apple_music.jpg', 'demo-youtube': '▶️', 'demo-electronics': '🎧',
    'demo-outings': '🎉', 'demo-salary': '💼', 'demo-extra': '✨',
  }
  return { id, name, kind, parentId, icon: icons[id], archived: false, createdAt: stamp, updatedAt: stamp }
}

function movement(id: string, kind: MovementKind, classification: MovementClassification, categoryId: string, amountCents: number, month: Date, day: number, hour: number, note: string, stamp: string): Movement {
  return { id, kind, classification, categoryId, amountCents, fundId: 'demo-bcp', toFundId: null, occurredAt: new Date(month.getFullYear(), month.getMonth(), day, hour).toISOString(), note, createdAt: stamp, updatedAt: stamp }
}

function replaceById<T extends { id: string }>(items: T[], value: T) {
  const found = items.some((item) => item.id === value.id)
  return found ? items.map((item) => item.id === value.id ? value : item) : [...items, value]
}

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ExpensePage, IncomePage } from './AnalysisPages'
import type { FinanceSnapshot, Movement } from '../domain/models'

const now = new Date()
const atDay = (day: number, hour = 12) => new Date(now.getFullYear(), now.getMonth(), day, hour).toISOString()
const baseMovement = (overrides: Partial<Movement>): Movement => ({
  id: crypto.randomUUID(), kind: 'income', classification: 'monthly', fundId: 'fund', toFundId: null,
  categoryId: 'salary', amountCents: 100_00, occurredAt: atDay(1), note: '', createdAt: '', updatedAt: '',
  ...overrides,
})

const snapshot: FinanceSnapshot = {
  funds: [{ id: 'fund', name: 'BCP', initialBalanceCents: 0, archived: false, createdAt: '', updatedAt: '' }],
  categories: [
    { id: 'salary', name: 'Sueldo', kind: 'income', parentId: null, archived: false, createdAt: '', updatedAt: '' },
    { id: 'food', name: 'Alimentación', kind: 'expense', parentId: null, archived: false, createdAt: '', updatedAt: '' },
  ],
  movements: [
    baseMovement({ id: 'salary-one', amountCents: 100_00, occurredAt: atDay(1) }),
    baseMovement({ id: 'bonus', classification: 'one_time', amountCents: 50_00, occurredAt: atDay(2), note: 'Bono' }),
    baseMovement({ id: 'daily', kind: 'expense', classification: 'daily', categoryId: 'food', amountCents: 30_00, occurredAt: atDay(1) }),
    baseMovement({ id: 'monthly-expense', kind: 'expense', classification: 'monthly', categoryId: 'food', amountCents: 20_00, occurredAt: atDay(3) }),
  ],
}

describe('páginas de análisis', () => {
  it('muestra el acumulado de ingresos y el detalle individual al tocar un punto', () => {
    render(<IncomePage snapshot={snapshot} />)
    expect(screen.getByText('Ingresos del mes')).toBeInTheDocument()
    const point = screen.getByRole('button', { name: /Ver movimiento Sueldo,.*50[,.]00/ })
    fireEvent.click(point)
    expect(screen.getByText('Bono')).toBeInTheDocument()
    expect(screen.getByText(/Puntual · BCP/)).toBeInTheDocument()
  })

  it('cambia del gráfico diario al acumulado mensual de egresos', () => {
    render(<ExpensePage snapshot={snapshot} />)
    expect(screen.getByText('Promedio diario')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Mensual' }))
    expect(screen.getByText('Egresos del mes')).toBeInTheDocument()
    expect(screen.getByText('Gasto acumulado')).toBeInTheDocument()
    expect(screen.getByText('Mayor movimiento')).toBeInTheDocument()
    expect(screen.getByText('Fecha del mayor movimiento')).toBeInTheDocument()
    expect(screen.getByText('1 movimiento')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Ver movimiento Alimentación/ })).toBeInTheDocument()
  })
})

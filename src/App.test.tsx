import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'
import type { FinanceRepository } from './data/financeRepository'
import type { FinanceSnapshot } from './domain/models'

const data: FinanceSnapshot = {
  funds: [{ id: 'fund', name: 'BCP', initialBalanceCents: 100_00, archived: false, createdAt: '', updatedAt: '' }],
  categories: [{ id: 'food', name: 'Comida', kind: 'expense', parentId: null, archived: false, createdAt: '', updatedAt: '' }],
  movements: [{
    id: 'movement', kind: 'expense', classification: 'daily', fundId: 'fund', toFundId: null,
    categoryId: 'food', amountCents: 10_00, occurredAt: new Date().toISOString(), note: '', createdAt: '', updatedAt: '',
  }],
}

const repository: FinanceRepository = {
  load: async () => data,
  saveFund: async () => undefined,
  saveCategory: async () => undefined,
  saveMovement: async () => undefined,
  deleteMovement: async () => undefined,
  replaceSnapshot: async () => undefined,
}

describe('aplicación', () => {
  it('muestra fondos, saldos y actividad mensual', async () => {
    render(<App repository={repository} />)
    expect(await screen.findByText('BCP')).toBeInTheDocument()
    expect(screen.getByText('Comida')).toBeInTheDocument()
    expect(screen.getAllByText(/90[,.]00/)).toHaveLength(2)
    expect(screen.queryByRole('button', { name: /Comida/ })).not.toBeInTheDocument()
  })

  it('permite editar solo desde Movimientos y muestra sus filtros', async () => {
    render(<App repository={repository} />)
    fireEvent.click(await screen.findByRole('button', { name: /Movimientos/ }))
    expect(screen.getByLabelText('Filtrar por categoría')).toBeInTheDocument()
    expect(screen.getByLabelText('Filtrar por fecha')).toBeInTheDocument()
    expect(screen.getByText('1 movimiento')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Comida/ })).toBeInTheDocument()
  })

  it('muestra las acciones de respaldo y restauración en Configuración', async () => {
    render(<App repository={repository} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Configuración' }))
    expect(screen.getByRole('button', { name: /Subir a Sheets/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Descargar de Sheets/ })).toBeInTheDocument()
    expect(screen.queryByLabelText('Enlace o ID del Sheet')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Icono del fondo')).toBeInTheDocument()
    expect(screen.getByLabelText('Icono de categoría')).toBeInTheDocument()
  })

  it('usa el mes de referencia en los indicadores de Inicio', async () => {
    const october = new Date(2026, 9, 1)
    const historicalRepository: FinanceRepository = {
      ...repository,
      load: async () => ({ ...data, movements: [{ ...data.movements[0], occurredAt: new Date(2026, 9, 15, 12).toISOString() }] }),
    }
    render(<App repository={historicalRepository} initialAnalysisMonth={october} />)
    expect(await screen.findAllByText(/90[,.]00/)).toHaveLength(2)
    expect(screen.getByText(/10[,.]00/)).toBeInTheDocument()
  })

  it('conserva la preferencia de ocultar montos al volver a abrir', async () => {
    localStorage.removeItem('control-money.amounts-visible')
    const first = render(<App repository={repository} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Ocultar montos' }))
    expect(screen.getAllByText('S/ ••••••').length).toBeGreaterThan(1)
    first.unmount()
    render(<App repository={repository} />)
    expect(await screen.findByRole('button', { name: 'Mostrar montos' })).toBeInTheDocument()
    localStorage.removeItem('control-money.amounts-visible')
  })
})

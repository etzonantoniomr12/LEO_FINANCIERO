import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
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
    expect(await screen.findByRole('img', { name: 'Mr Etzon Antonio' })).toBeInTheDocument()
    expect(await screen.findByText('BCP')).toBeInTheDocument()
    expect(screen.getByText('Comida')).toBeInTheDocument()
    expect(screen.getAllByText(/90[,.]00/)).toHaveLength(2)
    expect(screen.queryByRole('button', { name: /Comida/ })).not.toBeInTheDocument()
  })

  it('abre la portada editorial desde el botón de noticias', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ updatedAt: '', categories: { economy: [], science: [], civil: [], civilgeeks: [], nobel: [], ai: [], spreadsheets: [], blog_sc: [] } }) }))
    render(<App repository={repository} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Noticias' }))
    expect(screen.getByText('NOTICIAS MUNDO')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Mr Etzon Antonio' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Economía que mueve tus decisiones' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Lee aquí. Profundiza en la fuente.' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Volver al inicio' })).toBeInTheDocument()
    vi.unstubAllGlobals()
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
    expect(screen.queryByLabelText('ID de cliente OAuth')).not.toBeInTheDocument()
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

  it('permite recorrer los personajes y abrir su historia desde el saldo', async () => {
    render(<App repository={repository} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Mostrar billete de 200 soles: Tilsa Tsuchiya' }))
    fireEvent.click(screen.getByRole('button', { name: /Conocer a Tilsa Tsuchiya/ }))
    expect(screen.getByRole('dialog', { name: 'Historia del billete de 200 soles' })).toBeInTheDocument()
    expect(screen.getByText('Gallito de las Rocas y Flor Bella Abanquina')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Personaje siguiente' }))
    expect(screen.getByRole('dialog', { name: 'Historia del billete de 10 soles' })).toBeInTheDocument()
    expect(screen.getByText('Vicuña y Flor de Amancaes')).toBeInTheDocument()
  })

  it('el botón flotante + abre el diálogo para registrar movimiento y actualiza los saldos', async () => {
    let currentData = { ...data }
    const dynamicRepo: FinanceRepository = {
      load: async () => currentData,
      saveFund: async () => undefined,
      saveCategory: async () => undefined,
      saveMovement: async (mov) => {
        currentData = { ...currentData, movements: [...currentData.movements, mov] }
      },
      deleteMovement: async () => undefined,
      replaceSnapshot: async () => undefined,
    }

    render(<App repository={dynamicRepo} />)

    const fab = await screen.findByRole('button', { name: 'Registrar movimiento' })
    expect(fab).toBeInTheDocument()
    expect(fab).not.toBeDisabled()
    expect(fab).toHaveClass('fab')

    fireEvent.click(fab)

    const dialog = screen.getByRole('dialog', { name: 'Nuevo movimiento' })
    expect(dialog).toBeInTheDocument()
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '30.00' } })
    fireEvent.change(screen.getByLabelText(/Tipo o categoría de egreso/), { target: { value: 'food' } })

    fireEvent.click(within(dialog).getByRole('button', { name: 'Registrar movimiento' }))

    expect(await screen.findAllByText(/60[,.]00/)).toHaveLength(2)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('el botón flotante + se deshabilita si no existen fondos o categorías activas', async () => {
    const emptyRepo: FinanceRepository = {
      load: async () => ({ funds: [], categories: [], movements: [] }),
      saveFund: async () => undefined,
      saveCategory: async () => undefined,
      saveMovement: async () => undefined,
      deleteMovement: async () => undefined,
      replaceSnapshot: async () => undefined,
    }

    render(<App repository={emptyRepo} />)

    const fab = await screen.findByRole('button', { name: 'Registrar movimiento' })
    expect(fab).toBeDisabled()
    expect(fab).toHaveAttribute('title', 'Crea primero un fondo y una categoría')
  })

  it('el botón flotante + se oculta en Noticias y Configuración, y reaparece al volver', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ updatedAt: '', categories: { economy: [], science: [], civil: [], civilgeeks: [], nobel: [], ai: [], spreadsheets: [], blog_sc: [] } }) }))

    render(<App repository={repository} />)

    expect(await screen.findByRole('button', { name: 'Registrar movimiento' })).toBeInTheDocument()

    // En Noticias se oculta
    fireEvent.click(screen.getByRole('button', { name: 'Noticias' }))
    expect(screen.queryByRole('button', { name: 'Registrar movimiento' })).not.toBeInTheDocument()

    // Al volver a Inicio reaparece
    fireEvent.click(screen.getByRole('button', { name: 'Volver al inicio' }))
    expect(screen.getByRole('button', { name: 'Registrar movimiento' })).toBeInTheDocument()

    // En Configuración se oculta
    fireEvent.click(screen.getByRole('button', { name: 'Configuración' }))
    expect(screen.queryByRole('button', { name: 'Registrar movimiento' })).not.toBeInTheDocument()

    vi.unstubAllGlobals()
  })
})

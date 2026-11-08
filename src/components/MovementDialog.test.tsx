import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MovementDialog } from './MovementDialog'
import type { FinanceSnapshot, Movement } from '../domain/models'

const sampleSnapshot: FinanceSnapshot = {
  funds: [
    { id: 'bcp', name: 'BCP', initialBalanceCents: 100_00, archived: false, createdAt: '', updatedAt: '' },
    { id: 'interbank', name: 'Interbank', initialBalanceCents: 50_00, archived: false, createdAt: '', updatedAt: '' },
  ],
  categories: [
    { id: 'salary', name: 'Sueldo', kind: 'income', parentId: null, archived: false, createdAt: '', updatedAt: '' },
    { id: 'food', name: 'Alimentación', kind: 'expense', parentId: null, archived: false, createdAt: '', updatedAt: '' },
    { id: 'lunch', name: 'Almuerzo', kind: 'expense', parentId: 'food', archived: false, createdAt: '', updatedAt: '' },
    { id: 'books', name: 'Libros', kind: 'expense', parentId: null, archived: false, createdAt: '', updatedAt: '' },
  ],
  movements: [],
}

describe('MovementDialog (formulario del botón +)', () => {
  it('renderiza la estructura visual de "Nuevo movimiento" con valores por defecto para Egreso', () => {
    render(
      <MovementDialog
        snapshot={sampleSnapshot}
        onClose={vi.fn()}
        onSave={vi.fn().mockResolvedValue(null)}
      />,
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Nuevo movimiento' })).toBeInTheDocument()
    expect(screen.getByText('MOVIMIENTO')).toBeInTheDocument()

    // 3 opciones de tipo con Egreso activo
    const egresoBtn = screen.getByRole('button', { name: 'Egreso' })
    const ingresoBtn = screen.getByRole('button', { name: 'Ingreso' })
    const transferirBtn = screen.getByRole('button', { name: 'Transferir' })
    expect(egresoBtn).toHaveClass('active')
    expect(ingresoBtn).not.toHaveClass('active')
    expect(transferirBtn).not.toHaveClass('active')

    // Campo monto y fondo inicial
    const amountInput = screen.getByPlaceholderText('0.00')
    expect(amountInput).toHaveValue('')
    expect(screen.getByLabelText(/Fondo/)).toHaveValue('bcp')

    // Clasificación de Egreso: Diario por defecto, Mensual y Puntual disponibles
    expect(screen.getByRole('button', { name: 'Diario' })).toHaveClass('selected')
    expect(screen.getByRole('button', { name: 'Mensual' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Puntual' })).toBeInTheDocument()

    // Selector jerárquico de egreso
    expect(screen.getByRole('option', { name: 'Libros' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Alimentación · Almuerzo' })).toBeInTheDocument()

    // Botón de acción primario y no eliminar
    expect(screen.getByRole('button', { name: 'Registrar movimiento' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Eliminar' })).not.toBeInTheDocument()
  })

  it('permite registrar un Egreso diario y envía los datos correctos', async () => {
    const onSave = vi.fn().mockResolvedValue(null)
    const onClose = vi.fn()

    render(
      <MovementDialog
        snapshot={sampleSnapshot}
        onClose={onClose}
        onSave={onSave}
      />,
    )

    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '25.50' } })
    fireEvent.change(screen.getByLabelText(/Tipo o categoría de egreso/), { target: { value: 'lunch' } })
    fireEvent.change(screen.getByLabelText(/Nota/), { target: { value: 'Almuerzo menú ejecutivo' } })

    fireEvent.click(screen.getByRole('button', { name: 'Registrar movimiento' }))

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1)
    })

    const saved = onSave.mock.calls[0][0] as Movement
    expect(saved.kind).toBe('expense')
    expect(saved.amountCents).toBe(2550)
    expect(saved.fundId).toBe('bcp')
    expect(saved.categoryId).toBe('lunch')
    expect(saved.classification).toBe('daily')
    expect(saved.toFundId).toBeNull()
    expect(saved.note).toBe('Almuerzo menú ejecutivo')
  })

  it('cambia a tipo Ingreso, muestra categorías de ingreso y clasificaciones mensual/puntual', async () => {
    const onSave = vi.fn().mockResolvedValue(null)

    render(
      <MovementDialog
        snapshot={sampleSnapshot}
        onClose={vi.fn()}
        onSave={onSave}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Ingreso' }))

    // Botón Ingreso activo
    expect(screen.getByRole('button', { name: 'Ingreso' })).toHaveClass('active')

    // Clasificación cambia a Mensual por defecto y excluye Diario
    expect(screen.getByRole('button', { name: 'Mensual' })).toHaveClass('selected')
    expect(screen.getByRole('button', { name: 'Puntual' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Diario' })).not.toBeInTheDocument()

    // Categorías de ingreso disponibles
    expect(screen.getByRole('option', { name: 'Sueldo' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Libros' })).not.toBeInTheDocument()

    // Cambiar a puntual y guardar
    fireEvent.click(screen.getByRole('button', { name: 'Puntual' }))
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '300.00' } })
    fireEvent.change(screen.getByLabelText(/Tipo de ingreso/), { target: { value: 'salary' } })

    fireEvent.click(screen.getByRole('button', { name: 'Registrar movimiento' }))

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1)
    })

    const saved = onSave.mock.calls[0][0] as Movement
    expect(saved.kind).toBe('income')
    expect(saved.amountCents).toBe(30000)
    expect(saved.classification).toBe('one_time')
    expect(saved.categoryId).toBe('salary')
    expect(saved.toFundId).toBeNull()
  })

  it('cambia a tipo Transferir, oculta categorías y muestra fondos origen y destino', async () => {
    const onSave = vi.fn().mockResolvedValue(null)

    render(
      <MovementDialog
        snapshot={sampleSnapshot}
        onClose={vi.fn()}
        onSave={onSave}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Transferir' }))

    // Clasificación y categorías no deben existir
    expect(screen.queryByText('Clasificación')).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Tipo o categoría/)).not.toBeInTheDocument()

    // Fondos origen y destino presentes
    expect(screen.getByLabelText(/Fondo origen/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Fondo destino/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Fondo destino/)).toHaveValue('interbank')

    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '50.00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar movimiento' }))

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1)
    })

    const saved = onSave.mock.calls[0][0] as Movement
    expect(saved.kind).toBe('transfer')
    expect(saved.fundId).toBe('bcp')
    expect(saved.toFundId).toBe('interbank')
    expect(saved.amountCents).toBe(5000)
    expect(saved.classification).toBeNull()
    expect(saved.categoryId).toBeNull()
  })

  it('valida que el monto sea mayor que cero y muestra mensaje de error', async () => {
    const onSave = vi.fn()

    render(
      <MovementDialog
        snapshot={sampleSnapshot}
        onClose={vi.fn()}
        onSave={onSave}
      />,
    )

    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '0' } })
    fireEvent.change(screen.getByLabelText(/Tipo o categoría de egreso/), { target: { value: 'books' } })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar movimiento' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Ingresa un monto mayor que cero con máximo dos decimales.')
    expect(onSave).not.toHaveBeenCalled()
  })

  it('muestra el error si la validación del guardado falla', async () => {
    const onSave = vi.fn().mockResolvedValue('El fondo origen no tiene saldo suficiente.')

    render(
      <MovementDialog
        snapshot={sampleSnapshot}
        onClose={vi.fn()}
        onSave={onSave}
      />,
    )

    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '9999.00' } })
    fireEvent.change(screen.getByLabelText(/Tipo o categoría de egreso/), { target: { value: 'books' } })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar movimiento' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('El fondo origen no tiene saldo suficiente.')
  })

  it('permite cerrar el diálogo desde el botón de cerrar o haciendo clic en el backdrop', () => {
    const onClose = vi.fn()

    const { container } = render(
      <MovementDialog
        snapshot={sampleSnapshot}
        onClose={onClose}
        onSave={vi.fn().mockResolvedValue(null)}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(onClose).toHaveBeenCalledTimes(1)

    // Clic en el backdrop
    const backdrop = container.querySelector('.modal-backdrop')!
    fireEvent.mouseDown(backdrop)
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('muestra modo edición cuando recibe un movimiento inicial y permite eliminarlo', async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined)
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    const initialMovement: Movement = {
      id: 'mov-1',
      kind: 'expense',
      classification: 'daily',
      fundId: 'bcp',
      toFundId: null,
      categoryId: 'books',
      amountCents: 4500,
      occurredAt: '2026-11-07T14:30:00.000Z',
      note: 'Libro de cálculo',
      createdAt: '2026-11-07T14:30:00.000Z',
      updatedAt: '2026-11-07T14:30:00.000Z',
    }

    render(
      <MovementDialog
        snapshot={sampleSnapshot}
        initial={initialMovement}
        onClose={vi.fn()}
        onSave={vi.fn().mockResolvedValue(null)}
        onDelete={onDelete}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Editar movimiento' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('0.00')).toHaveValue('45.00')
    expect(screen.getByLabelText(/Nota/)).toHaveValue('Libro de cálculo')
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeInTheDocument()

    const deleteBtn = screen.getByRole('button', { name: 'Eliminar' })
    expect(deleteBtn).toBeInTheDocument()
    fireEvent.click(deleteBtn)

    await waitFor(() => {
      expect(onDelete).toHaveBeenCalledWith('mov-1')
    })
  })
})

import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BanknoteCarousel } from './BanknoteCarousel'

afterEach(() => vi.useRealTimers())

describe('BanknoteCarousel', () => {
  it('cambia automáticamente al siguiente personaje', () => {
    vi.useFakeTimers()
    render(<BanknoteCarousel
      totalBalanceCents={763_80}
      activeFunds={2}
      incomeCents={1_227_69}
      expenseCents={463_89}
      amountsVisible
      onToggleAmounts={() => undefined}
    />)
    expect(screen.getByLabelText('Saldo disponible, homenaje del billete de 10 soles')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(8_000))
    expect(screen.getByLabelText('Saldo disponible, homenaje del billete de 20 soles')).toBeInTheDocument()
  })

  it('ofrece una biografía ampliada, escena y cronología', () => {
    render(<BanknoteCarousel totalBalanceCents={0} activeFunds={0} incomeCents={0} expenseCents={0} amountsVisible onToggleAmounts={() => undefined} />)
    fireEvent.click(screen.getByRole('button', { name: /Conocer a Chabuca Granda/ }))
    expect(screen.getByText(/nació en Cotabambas/)).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /Escena editorial sobre la vida/ })).toBeInTheDocument()
    expect(screen.getByText('Patrimonio cultural')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Ministerio de Cultura/ })).toHaveAttribute('target', '_blank')
  })
})

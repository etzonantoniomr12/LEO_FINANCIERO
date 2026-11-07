import { act, render, screen } from '@testing-library/react'
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
})

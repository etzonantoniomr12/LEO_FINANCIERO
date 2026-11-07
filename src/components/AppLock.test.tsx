import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AppLock } from './AppLock'

describe('bloqueo por PIN', () => {
  it('acepta solo números y desbloquea únicamente con el PIN correcto', async () => {
    const onUnlock = vi.fn()
    const verifyPin = vi.fn(async (pin: string) => pin === '123456')
    render(<AppLock onUnlock={onUnlock} verifyPin={verifyPin} />)
    const input = screen.getByLabelText('PIN de acceso')

    fireEvent.change(input, { target: { value: '12ab34' } })
    expect(input).toHaveValue('1234')

    fireEvent.change(input, { target: { value: '000000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Desbloquear' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('PIN incorrecto')
    expect(onUnlock).not.toHaveBeenCalled()

    fireEvent.change(input, { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: 'Desbloquear' }))
    await waitFor(() => expect(onUnlock).toHaveBeenCalledOnce())
  })
})

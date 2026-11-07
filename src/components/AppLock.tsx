import { useState } from 'react'
import { publicAsset } from './EntityIcon'

const PIN_LENGTH = 6
const APP_PIN_DIGEST = 'cb831f04ce9e3ef92d4531feba6f9cf68840e367bd8d7099b0ef1e8898962c6f'

async function digestPin(pin: string) {
  const bytes = new TextEncoder().encode(pin)
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function verifyAppPin(pin: string) {
  return pin.length === PIN_LENGTH && await digestPin(pin) === APP_PIN_DIGEST
}

export function AppLock({ onUnlock, verifyPin = verifyAppPin }: { onUnlock: () => void; verifyPin?: (pin: string) => Promise<boolean> }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (pin.length !== PIN_LENGTH || checking) return
    setChecking(true)
    if (await verifyPin(pin)) {
      setError('')
      onUnlock()
      return
    }
    setPin('')
    setError('PIN incorrecto. Inténtalo nuevamente.')
    setChecking(false)
  }

  return <main className="pin-lock">
    <form className="pin-card" onSubmit={(event) => void submit(event)}>
      <img src={publicAsset('/control-money-icon.png')} alt="" />
      <span className="eyebrow">FINANZAS PERSONALES</span>
      <h1>LEO Financiero</h1>
      <p>Introduce tu PIN para acceder a la información financiera.</p>
      <label htmlFor="app-pin">PIN de acceso</label>
      <input
        id="app-pin"
        aria-describedby={error ? 'pin-error' : undefined}
        aria-invalid={Boolean(error)}
        type="password"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={PIN_LENGTH}
        autoComplete="off"
        autoFocus
        value={pin}
        onChange={(event) => {
          setPin(event.target.value.replace(/\D/g, '').slice(0, PIN_LENGTH))
          setError('')
        }}
      />
      <small>{pin.length} de {PIN_LENGTH} dígitos</small>
      {error && <p id="pin-error" className="pin-error" role="alert">{error}</p>}
      <button className="primary-button" type="submit" disabled={pin.length !== PIN_LENGTH || checking}>
        {checking ? 'Verificando…' : 'Desbloquear'}
      </button>
    </form>
  </main>
}

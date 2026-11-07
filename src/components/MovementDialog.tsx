import { useMemo, useState } from 'react'
import type {
  FinanceSnapshot,
  Movement,
  MovementClassification,
  MovementKind,
} from '../domain/models'
import { createId, nowIso } from '../domain/models'
import { parseMoneyToCents } from '../domain/money'
import { buildExpenseCategoryChoices } from '../domain/categories'

interface MovementDialogProps {
  snapshot: FinanceSnapshot
  initial?: Movement | null
  onClose: () => void
  onSave: (movement: Movement) => Promise<string | null>
  onDelete?: (id: string) => Promise<void>
}

function toLocalInput(iso: string) {
  const date = new Date(iso)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

const classificationOptions: Record<Exclude<MovementKind, 'transfer'>, MovementClassification[]> = {
  income: ['monthly', 'one_time'],
  expense: ['daily', 'monthly', 'one_time'],
}

const classificationLabel: Record<MovementClassification, string> = {
  daily: 'Diario',
  monthly: 'Mensual',
  one_time: 'Puntual',
}

export function MovementDialog({ snapshot, initial, onClose, onSave, onDelete }: MovementDialogProps) {
  const activeFunds = snapshot.funds.filter((fund) => !fund.archived)
  const [kind, setKind] = useState<MovementKind>(initial?.kind ?? 'expense')
  const [amount, setAmount] = useState(initial ? (initial.amountCents / 100).toFixed(2) : '')
  const [fundId, setFundId] = useState(initial?.fundId ?? activeFunds[0]?.id ?? '')
  const [toFundId, setToFundId] = useState(initial?.toFundId ?? activeFunds.find((fund) => fund.id !== fundId)?.id ?? '')
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? '')
  const [classification, setClassification] = useState<MovementClassification>(
    initial?.classification ?? 'daily',
  )
  const [occurredAt, setOccurredAt] = useState(toLocalInput(initial?.occurredAt ?? nowIso()))
  const [note, setNote] = useState(initial?.note ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const incomeCategories = useMemo(
    () => snapshot.categories
      .filter((category) => category.kind === 'income' && !category.archived)
      .sort((left, right) => left.name.localeCompare(right.name, 'es')),
    [snapshot.categories],
  )
  const expenseChoices = useMemo(
    () => buildExpenseCategoryChoices(snapshot.categories),
    [kind, snapshot.categories],
  )

  const chooseKind = (nextKind: MovementKind) => {
    setKind(nextKind)
    setCategoryId('')
    if (nextKind === 'income') setClassification('monthly')
    if (nextKind === 'expense') setClassification('daily')
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const amountCents = parseMoneyToCents(amount)
    if (amountCents === null) {
      setError('Ingresa un monto mayor que cero con máximo dos decimales.')
      return
    }
    const timestamp = nowIso()
    const movement: Movement = {
      id: initial?.id ?? createId(),
      kind,
      classification: kind === 'transfer' ? null : classification,
      fundId,
      toFundId: kind === 'transfer' ? toFundId : null,
      categoryId: kind === 'transfer' ? null : categoryId,
      amountCents,
      occurredAt: new Date(occurredAt).toISOString(),
      note: note.trim(),
      createdAt: initial?.createdAt ?? timestamp,
      updatedAt: timestamp,
    }
    setSaving(true)
    const validationError = await onSave(movement)
    setSaving(false)
    if (validationError) setError(validationError)
  }

  const remove = async () => {
    if (!initial || !onDelete || !window.confirm('¿Eliminar este movimiento?')) return
    setSaving(true)
    await onDelete(initial.id)
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="movement-sheet" role="dialog" aria-modal="true" aria-labelledby="movement-title">
        <div className="sheet-handle" />
        <header className="sheet-header">
          <div>
            <span className="eyebrow">MOVIMIENTO</span>
            <h2 id="movement-title">{initial ? 'Editar movimiento' : 'Nuevo movimiento'}</h2>
          </div>
          <button className="icon-button" type="button" aria-label="Cerrar" onClick={onClose}>×</button>
        </header>

        <form onSubmit={submit} className="movement-form">
          <div className="segmented" aria-label="Tipo de movimiento">
            {(['expense', 'income', 'transfer'] as MovementKind[]).map((value) => (
              <button
                type="button"
                key={value}
                className={kind === value ? 'active' : ''}
                onClick={() => chooseKind(value)}
              >
                {value === 'expense' ? 'Egreso' : value === 'income' ? 'Ingreso' : 'Transferir'}
              </button>
            ))}
          </div>

          <label className="amount-field">
            <span>Monto</span>
            <div><b>S/</b><input autoFocus inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" /></div>
          </label>

          <label>
            Fondo {kind === 'transfer' ? 'origen' : ''}
            <select value={fundId} onChange={(e) => setFundId(e.target.value)} required>
              <option value="">Selecciona un fondo</option>
              {activeFunds.map((fund) => <option key={fund.id} value={fund.id}>{fund.name}</option>)}
            </select>
          </label>

          {kind === 'transfer' ? (
            <label>
              Fondo destino
              <select value={toFundId} onChange={(e) => setToFundId(e.target.value)} required>
                <option value="">Selecciona un fondo</option>
                {activeFunds.filter((fund) => fund.id !== fundId).map((fund) => (
                  <option key={fund.id} value={fund.id}>{fund.name}</option>
                ))}
              </select>
            </label>
          ) : (
            <>
              <label>
                {kind === 'income' ? 'Tipo de ingreso' : 'Tipo o categoría de egreso'}
                <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
                  <option value="">Selecciona una opción</option>
                  {kind === 'income' ? incomeCategories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  )) : (
                    <>
                      {expenseChoices.standalone.map((category) => (
                        <option key={category.id} value={category.id}>{category.name}</option>
                      ))}
                      {expenseChoices.groups.map(({ parent, children }) => (
                        <optgroup key={parent.id} label={parent.name}>
                          {children.map((category) => (
                            <option key={category.id} value={category.id}>
                              {parent.name} · {category.name}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </>
                  )}
                </select>
              </label>
              <fieldset className="classification-field">
                <legend>Clasificación</legend>
                <div className="choice-row">
                  {classificationOptions[kind].map((value) => (
                    <button
                      type="button"
                      key={value}
                      className={classification === value ? 'selected' : ''}
                      onClick={() => setClassification(value)}
                    >
                      {classificationLabel[value]}
                    </button>
                  ))}
                </div>
              </fieldset>
            </>
          )}

          <label>
            Fecha y hora
            <input type="datetime-local" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} required />
          </label>
          <label>
            Nota <span className="muted">(opcional)</span>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Detalle para recordar" />
          </label>

          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="form-actions">
            {initial && <button type="button" className="danger-button" disabled={saving} onClick={remove}>Eliminar</button>}
            <button className="primary-button" disabled={saving} type="submit">
              {saving ? 'Guardando…' : initial ? 'Guardar cambios' : 'Registrar movimiento'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

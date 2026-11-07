import { useState } from 'react'
import type { Category, CategoryKind, FinanceSnapshot, Fund } from '../domain/models'
import { createId, nowIso } from '../domain/models'
import { formatMoney, parseMoneyToCents } from '../domain/money'
import { GoogleSheetsBackupService } from '../data/googleSheetsBackup'
import { categoryIconOptions, EntityIcon, fundIconOptions } from './EntityIcon'

const authorizedSheetId = import.meta.env.VITE_GOOGLE_SHEET_ID || ''
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

interface SettingsPageProps {
  snapshot: FinanceSnapshot
  onSaveFund: (fund: Fund) => Promise<void>
  onSaveCategory: (category: Category) => Promise<void>
  onRestoreSnapshot: (snapshot: FinanceSnapshot) => Promise<void>
  backupDisabled?: boolean
}

export function SettingsPage({ snapshot, onSaveFund, onSaveCategory, onRestoreSnapshot, backupDisabled = false }: SettingsPageProps) {
  const [fundName, setFundName] = useState('')
  const [fundBalance, setFundBalance] = useState('0.00')
  const [fundIcon, setFundIcon] = useState('🏦')
  const [editingFund, setEditingFund] = useState<Fund | null>(null)
  const [categoryName, setCategoryName] = useState('')
  const [categoryKind, setCategoryKind] = useState<CategoryKind>('expense')
  const [categoryIcon, setCategoryIcon] = useState('🍽️')
  const [parentId, setParentId] = useState('')
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [error, setError] = useState('')
  const [backupBusy, setBackupBusy] = useState(false)
  const [backupStatus, setBackupStatus] = useState('')

  const submitFund = async (event: React.FormEvent) => {
    event.preventDefault()
    const cents = fundBalance === '0.00' || fundBalance === '0' ? 0 : parseMoneyToCents(fundBalance)
    if (!fundName.trim() || cents === null) return
    const timestamp = nowIso()
    try {
      await onSaveFund({
        id: editingFund?.id ?? createId(),
        name: fundName.trim(),
        icon: fundIcon,
        initialBalanceCents: cents,
        archived: editingFund?.archived ?? false,
        createdAt: editingFund?.createdAt ?? timestamp,
        updatedAt: timestamp,
      })
      setFundName('')
      setFundBalance('0.00')
      setFundIcon('🏦')
      setEditingFund(null)
      setError('')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo guardar el fondo.')
    }
  }

  const submitCategory = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!categoryName.trim()) return
    const timestamp = nowIso()
    try {
      await onSaveCategory({
        id: editingCategory?.id ?? createId(),
        name: categoryName.trim(),
        icon: categoryIcon,
        kind: categoryKind,
        parentId: categoryKind === 'expense' && parentId ? parentId : null,
        archived: editingCategory?.archived ?? false,
        createdAt: editingCategory?.createdAt ?? timestamp,
        updatedAt: timestamp,
      })
      setCategoryName('')
      setParentId('')
      setCategoryIcon('🍽️')
      setEditingCategory(null)
      setError('')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo guardar la categoría.')
    }
  }

  const editFund = (fund: Fund) => {
    setEditingFund(fund)
    setFundName(fund.name)
    setFundBalance((fund.initialBalanceCents / 100).toFixed(2))
    setFundIcon(fund.icon ?? '🏦')
  }

  const editCategory = (category: Category) => {
    setEditingCategory(category)
    setCategoryName(category.name)
    setCategoryKind(category.kind)
    setCategoryIcon(category.icon ?? (category.kind === 'income' ? '💼' : '🍽️'))
    setParentId(category.parentId ?? '')
  }

  const expenseParents = snapshot.categories.filter(
    (category) => category.kind === 'expense' && category.parentId === null && !category.archived,
  )

  const persistGoogleConfiguration = () => {
    return authorizedSheetId
  }

  const uploadBackup = async () => {
    const spreadsheetId = persistGoogleConfiguration()
    if (!spreadsheetId) return setError('El Sheet autorizado no está configurado en esta publicación.')
    if (!googleClientId.trim()) return setError('La autorización de Google no está configurada en esta publicación.')
    if (!window.confirm('Subir reemplazará el respaldo administrado por Control Money en Google Sheets. ¿Deseas continuar?')) return
    setBackupBusy(true); setError(''); setBackupStatus('')
    try {
      const backedUpAt = await new GoogleSheetsBackupService(googleClientId.trim(), spreadsheetId).upload(snapshot)
      setBackupStatus(`Respaldo subido correctamente: ${new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(backedUpAt))}.`)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo subir el respaldo.')
    } finally { setBackupBusy(false) }
  }

  const downloadBackup = async () => {
    const spreadsheetId = persistGoogleConfiguration()
    if (!spreadsheetId) return setError('El Sheet autorizado no está configurado en esta publicación.')
    if (!googleClientId.trim()) return setError('La autorización de Google no está configurada en esta publicación.')
    setBackupBusy(true); setError(''); setBackupStatus('')
    try {
      const downloaded = await new GoogleSheetsBackupService(googleClientId.trim(), spreadsheetId).download()
      const summary = `${downloaded.snapshot.funds.length} fondos, ${downloaded.snapshot.categories.length} categorías y ${downloaded.snapshot.movements.length} movimientos`
      const backedUpAt = new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(downloaded.backedUpAt))
      if (!window.confirm(`Respaldo validado del ${backedUpAt}: ${summary}.\n\nRestaurar reemplazará completamente la base local actual. ¿Deseas continuar?`)) return
      await onRestoreSnapshot(downloaded.snapshot)
      setBackupStatus(`Restauración completada: ${summary}.`)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo restaurar el respaldo.')
    } finally { setBackupBusy(false) }
  }

  return (
    <div className="page-stack settings-page">
      {error && <p className="form-error" role="alert">{error}</p>}
      <section className="panel">
        <div className="section-heading"><div><span className="eyebrow">CUENTAS</span><h2>Mis fondos</h2></div></div>
        <form className="compact-form" onSubmit={submitFund}>
          <input aria-label="Nombre del fondo" placeholder="Nombre del fondo" value={fundName} onChange={(e) => setFundName(e.target.value)} required />
          <input aria-label="Saldo inicial" inputMode="decimal" placeholder="Saldo inicial" value={fundBalance} onChange={(e) => setFundBalance(e.target.value)} required />
          <label className="icon-picker"><span>Icono del fondo</span><div><EntityIcon icon={fundIcon} name={fundName} kind="fund" /><select aria-label="Icono del fondo" value={fundIcon} onChange={(event) => setFundIcon(event.target.value)}>{fundIconOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div></label>
          <button className="primary-button" type="submit">{editingFund ? 'Actualizar' : 'Añadir fondo'}</button>
        </form>
        <div className="settings-list">
          {snapshot.funds.length === 0 && <p className="empty-copy">Aún no tienes fondos.</p>}
          {snapshot.funds.map((fund) => (
            <div className={`settings-row ${fund.archived ? 'archived' : ''}`} key={fund.id}>
              <div className="settings-identity"><EntityIcon icon={fund.icon} name={fund.name} kind="fund" /><span><b>{fund.name}</b><small>Inicial: {formatMoney(fund.initialBalanceCents)}</small></span></div>
              <div className="row-actions">
                <button type="button" onClick={() => editFund(fund)}>Editar</button>
                <button type="button" onClick={() => onSaveFund({ ...fund, archived: !fund.archived, updatedAt: nowIso() })}>
                  {fund.archived ? 'Reactivar' : 'Archivar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="section-heading"><div><span className="eyebrow">CLASIFICACIÓN</span><h2>Tipos y categorías</h2></div></div>
        <form className="compact-form" onSubmit={submitCategory}>
          <select aria-label="Naturaleza" value={categoryKind} onChange={(e) => { const nextKind = e.target.value as CategoryKind; setCategoryKind(nextKind); setCategoryIcon(nextKind === 'income' ? '💼' : '🍽️'); setParentId('') }}>
            <option value="expense">Egreso</option>
            <option value="income">Ingreso</option>
          </select>
          <input aria-label="Nombre de categoría" placeholder="Nombre" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} required />
          <label className="icon-picker"><span>Icono o imagen</span><div><EntityIcon icon={categoryIcon} name={categoryName} kind={categoryKind} /><select aria-label="Icono de categoría" value={categoryIcon} onChange={(event) => setCategoryIcon(event.target.value)}>{categoryIconOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div></label>
          {categoryKind === 'expense' && (
            <select aria-label="Tipo padre" value={parentId} onChange={(e) => setParentId(e.target.value)}>
              <option value="">Es un tipo principal</option>
              {expenseParents.filter((category) => category.id !== editingCategory?.id).map((category) => (
                <option key={category.id} value={category.id}>Dentro de {category.name}</option>
              ))}
            </select>
          )}
          <button className="primary-button" type="submit">{editingCategory ? 'Actualizar' : 'Añadir'}</button>
        </form>
        <div className="settings-list">
          {snapshot.categories.length === 0 && <p className="empty-copy">Aún no tienes tipos ni categorías.</p>}
          {snapshot.categories.map((category) => {
            const parent = snapshot.categories.find((item) => item.id === category.parentId)
            return (
              <div className={`settings-row ${category.archived ? 'archived' : ''}`} key={category.id}>
                <div className="settings-identity"><EntityIcon icon={category.icon} name={category.name} kind={category.kind} /><span><b>{category.name}</b><small>{category.kind === 'income' ? 'Ingreso' : parent ? `Egreso · ${parent.name}` : 'Tipo de egreso'}</small></span></div>
                <div className="row-actions">
                  <button type="button" onClick={() => editCategory(category)}>Editar</button>
                  <button type="button" onClick={() => onSaveCategory({ ...category, archived: !category.archived, updatedAt: nowIso() })}>
                    {category.archived ? 'Reactivar' : 'Archivar'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="panel backup-panel">
        <div className="section-heading"><div><span className="eyebrow">RESPALDO</span><h2>Google Sheets</h2></div></div>
        <p className="backup-copy">Sube una copia completa o restaura la base local desde el Sheet autorizado. La restauración valida el respaldo antes de reemplazar tus datos.</p>
        {backupDisabled ? <p className="form-error">El respaldo está desactivado dentro del modo demostración.</p> : <>
          <p className="backup-identity">La sincronización utiliza la cuenta Google autorizada para esta publicación.</p>
          <div className="backup-actions">
            <button className="primary-button upload" type="button" disabled={backupBusy} onClick={() => void uploadBackup()}><span>↑</span>{backupBusy ? 'Procesando…' : 'Subir a Sheets'}</button>
            <button className="primary-button download" type="button" disabled={backupBusy} onClick={() => void downloadBackup()}><span>↓</span>{backupBusy ? 'Procesando…' : 'Descargar de Sheets'}</button>
          </div>
          {backupStatus && <p className="backup-success" role="status">✓ {backupStatus}</p>}
        </>}
      </section>
    </div>
  )
}

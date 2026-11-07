import { useEffect, useState } from 'react'
import { ExpensePage, IncomePage } from './components/AnalysisPages'
import { MovementDialog } from './components/MovementDialog'
import { SettingsPage } from './components/SettingsPage'
import { IndexedDbFinanceRepository, type FinanceRepository } from './data/financeRepository'
import { calculateFundBalances, movementTotals, movementsForMonth, sortMovementsNewestFirst, validateMovement } from './domain/ledger'
import type { Category, FinanceSnapshot, Fund, Movement, MovementClassification } from './domain/models'
import { formatMoney } from './domain/money'
import { categoryDisplayName } from './domain/categories'
import { filterMovements, localDateKey } from './domain/movementFilters'
import { EntityIcon, publicAsset } from './components/EntityIcon'
import { BanknoteCarousel } from './components/BanknoteCarousel'
import { AppLock } from './components/AppLock'

type Tab = 'home' | 'movements' | 'income' | 'expense' | 'settings'

const emptySnapshot: FinanceSnapshot = { funds: [], categories: [], movements: [] }

const kindLabel = { income: 'Ingreso', expense: 'Egreso', transfer: 'Transferencia' } as const
const classificationLabel: Record<MovementClassification, string> = {
  daily: 'Diario',
  monthly: 'Mensual',
  one_time: 'Puntual',
}

interface AppProps {
  repository?: FinanceRepository
  initialAnalysisMonth?: Date
  demoMode?: boolean
  requirePin?: boolean
}

export default function App({ repository: suppliedRepository, initialAnalysisMonth, demoMode = false, requirePin = true }: AppProps) {
  const [repository] = useState<FinanceRepository>(() => suppliedRepository ?? new IndexedDbFinanceRepository())
  const [unlocked, setUnlocked] = useState(!requirePin)
  const [snapshot, setSnapshot] = useState<FinanceSnapshot>(emptySnapshot)
  const [tab, setTab] = useState<Tab>('home')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingMovement, setEditingMovement] = useState<Movement | null | undefined>(undefined)

  const refresh = async () => {
    try {
      setSnapshot(await repository.load())
      setError('')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo leer la base local.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (unlocked) void refresh() }, [unlocked])

  useEffect(() => {
    if (!requirePin) return
    const lock = () => setUnlocked(false)
    const lockWhenHidden = () => { if (document.visibilityState === 'hidden') lock() }
    window.addEventListener('pagehide', lock)
    document.addEventListener('visibilitychange', lockWhenHidden)
    return () => {
      window.removeEventListener('pagehide', lock)
      document.removeEventListener('visibilitychange', lockWhenHidden)
    }
  }, [requirePin])

  const saveFund = async (fund: Fund) => {
    const duplicate = snapshot.funds.some(
      (item) => item.id !== fund.id && item.name.localeCompare(fund.name, 'es', { sensitivity: 'base' }) === 0,
    )
    if (duplicate) throw new Error('Ya existe un fondo con ese nombre.')
    await repository.saveFund(fund)
    await refresh()
  }

  const saveCategory = async (category: Category) => {
    const duplicate = snapshot.categories.some(
      (item) => item.id !== category.id && item.kind === category.kind && item.parentId === category.parentId &&
        item.name.localeCompare(category.name, 'es', { sensitivity: 'base' }) === 0,
    )
    if (duplicate) throw new Error('Ya existe un elemento con ese nombre.')
    await repository.saveCategory(category)
    await refresh()
  }

  const saveMovement = async (movement: Movement) => {
    const validationError = validateMovement(movement, snapshot)
    if (validationError) return validationError
    await repository.saveMovement(movement)
    await refresh()
    setEditingMovement(undefined)
    return null
  }

  const deleteMovement = async (id: string) => {
    await repository.deleteMovement(id)
    await refresh()
    setEditingMovement(undefined)
  }

  const restoreSnapshot = async (restored: FinanceSnapshot) => {
    await repository.replaceSnapshot(restored)
    await refresh()
  }

  const pageTitle = tab === 'home' ? 'Control Money' : tab === 'movements' ? 'Movimientos' : tab === 'income' ? 'Ingresos' : tab === 'expense' ? 'Egresos' : 'Configuración'
  const canAddMovement = snapshot.funds.some((fund) => !fund.archived) && snapshot.categories.some((category) => !category.archived)

  if (!unlocked) return <AppLock onUnlock={() => setUnlocked(true)} />
  if (loading) return <div className="app-loading"><img src={publicAsset('/control-money-icon.png')} alt="" /><p>Preparando tu espacio…</p></div>

  return (
    <div className="app-shell">
      <header className="top-bar">
        <div><span className="eyebrow">FINANZAS PERSONALES</span><h1>{pageTitle}</h1></div>
        <button className={`icon-button ${tab === 'settings' ? 'active' : ''}`} aria-label="Configuración" onClick={() => setTab(tab === 'settings' ? 'home' : 'settings')}>⚙</button>
      </header>

      {error && <div className="global-error" role="alert">{error}</div>}
      {demoMode && <div className="demo-banner"><span><b>Demostración de 31 días</b> · los cambios no afectan tu base personal.</span><a href={import.meta.env.BASE_URL}>Salir</a></div>}

      <main>
        {tab === 'home' && <HomePage snapshot={snapshot} referenceMonth={initialAnalysisMonth} />}
        {tab === 'movements' && <MovementsPage snapshot={snapshot} onEdit={setEditingMovement} />}
        {tab === 'income' && <IncomePage snapshot={snapshot} initialMonth={initialAnalysisMonth} />}
        {tab === 'expense' && <ExpensePage snapshot={snapshot} initialMonth={initialAnalysisMonth} />}
        {tab === 'settings' && <SettingsPage snapshot={snapshot} onSaveFund={saveFund} onSaveCategory={saveCategory} onRestoreSnapshot={restoreSnapshot} backupDisabled={demoMode} />}
      </main>

      {tab !== 'settings' && (
        <>
          <button
            className="fab"
            aria-label="Registrar movimiento"
            disabled={!canAddMovement}
            title={canAddMovement ? 'Registrar movimiento' : 'Crea primero un fondo y una categoría'}
            onClick={() => setEditingMovement(null)}
          >+
          </button>
          <nav className="bottom-nav" aria-label="Navegación principal">
            <NavButton label="Inicio" icon="⌂" active={tab === 'home'} onClick={() => setTab('home')} />
            <NavButton label="Movimientos" icon="⇄" active={tab === 'movements'} onClick={() => setTab('movements')} />
            <span className="nav-gap" />
            <NavButton label="Ingresos" icon="↓" active={tab === 'income'} onClick={() => setTab('income')} />
            <NavButton label="Egresos" icon="↑" active={tab === 'expense'} onClick={() => setTab('expense')} />
          </nav>
        </>
      )}

      {editingMovement !== undefined && (
        <MovementDialog
          snapshot={snapshot}
          initial={editingMovement}
          onClose={() => setEditingMovement(undefined)}
          onSave={saveMovement}
          onDelete={deleteMovement}
        />
      )}
    </div>
  )
}

function NavButton({ label, icon, active, onClick }: { label: string; icon: string; active: boolean; onClick: () => void }) {
  return <button className={active ? 'active' : ''} onClick={onClick}><span>{icon}</span><small>{label}</small></button>
}

function HomePage({ snapshot, referenceMonth }: { snapshot: FinanceSnapshot; referenceMonth?: Date }) {
  const [amountsVisible, setAmountsVisible] = useState(() => localStorage.getItem('control-money.amounts-visible') !== 'false')
  const balances = calculateFundBalances(snapshot)
  const monthly = movementsForMonth(snapshot.movements, referenceMonth ?? new Date())
  const totals = movementTotals(monthly)
  const totalBalance = balances.reduce((sum, fund) => sum + fund.balanceCents, 0)
  const recentToday = sortMovementsNewestFirst(
    filterMovements(snapshot.movements, snapshot.categories, {
      categoryId: '',
      date: localDateKey(new Date()),
    }),
  ).slice(0, 5)
  const displayMoney = (cents: number) => amountsVisible ? formatMoney(cents) : 'S/ ••••••'
  const toggleAmounts = () => {
    const next = !amountsVisible
    setAmountsVisible(next)
    localStorage.setItem('control-money.amounts-visible', String(next))
  }

  return (
    <div className="page-stack">
      <BanknoteCarousel
        totalBalanceCents={totalBalance}
        activeFunds={balances.filter((fund) => !fund.archived).length}
        incomeCents={totals.incomeCents}
        expenseCents={totals.expenseCents}
        amountsVisible={amountsVisible}
        onToggleAmounts={toggleAmounts}
      />

      <section className="panel">
        <div className="section-heading"><div><span className="eyebrow">CUENTAS</span><h2>Mis fondos</h2></div><span className="count-pill">{balances.filter((fund) => !fund.archived).length}</span></div>
        {balances.filter((fund) => !fund.archived).length === 0 ? (
          <EmptyState title="Crea tu primer fondo" copy="En Configuración puedes añadir una cuenta bancaria, billetera o efectivo." />
        ) : (
          <div className="fund-grid">
            {balances.filter((fund) => !fund.archived).map((fund) => <article key={fund.id}><EntityIcon icon={fund.icon} name={fund.name} kind="fund" /><div><small>{fund.name}</small><b>{displayMoney(fund.balanceCents)}</b><em>Fondo disponible</em></div><span className="fund-chevron">›</span></article>)}
          </div>
        )}
      </section>

      <section className="panel">
        <div className="section-heading"><div><span className="eyebrow">ACTIVIDAD DE HOY</span><h2>Últimos movimientos del día</h2></div></div>
        {recentToday.length === 0 ? <EmptyState title="Sin movimientos hoy" copy="Los movimientos de otros días permanecen disponibles en la página Movimientos." /> : (
          <MovementList movements={recentToday} snapshot={snapshot} interactive={false} />
        )}
      </section>
    </div>
  )
}

function MovementsPage({ snapshot, onEdit }: { snapshot: FinanceSnapshot; onEdit: (movement: Movement) => void }) {
  const [categoryFilter, setCategoryFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const sorted = sortMovementsNewestFirst(
    filterMovements(snapshot.movements, snapshot.categories, {
      categoryId: categoryFilter,
      date: dateFilter,
    }),
  )
  const hasFilters = Boolean(categoryFilter || dateFilter)
  const incomeCategories = snapshot.categories
    .filter((category) => category.kind === 'income')
    .sort((left, right) => left.name.localeCompare(right.name, 'es'))
  const expenseParents = snapshot.categories
    .filter((category) => category.kind === 'expense' && category.parentId === null)
    .sort((left, right) => left.name.localeCompare(right.name, 'es'))

  return <div className="page-stack"><section className="panel movements-panel">
    <div className="section-heading"><div><span className="eyebrow">HISTORIAL</span><h2>Todos los movimientos</h2></div><span className="count-pill movement-count">{sorted.length} {sorted.length === 1 ? 'movimiento' : 'movimientos'}</span></div>
    <div className="movement-filters">
      <label><span>Categoría</span><select aria-label="Filtrar por categoría" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
        <option value="">Todas las categorías</option>
        {expenseParents.map((parent) => {
          const children = snapshot.categories
            .filter((category) => category.parentId === parent.id)
            .sort((left, right) => left.name.localeCompare(right.name, 'es'))
          return children.length > 0 ? <optgroup key={parent.id} label={parent.name}>
            <option value={parent.id}>{parent.name} · Todas</option>
            {children.map((category) => <option key={category.id} value={category.id}>{parent.name} · {category.name}</option>)}
          </optgroup> : <option key={parent.id} value={parent.id}>{parent.name}</option>
        })}
        {incomeCategories.length > 0 && <optgroup label="INGRESOS">
          {incomeCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </optgroup>}
        <option value="transfer">Transferencias</option>
      </select></label>
      <label><span>Fecha</span><input aria-label="Filtrar por fecha" type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} /></label>
      {hasFilters && <button className="clear-filters" type="button" onClick={() => { setCategoryFilter(''); setDateFilter('') }}>Limpiar filtros</button>}
    </div>
    {sorted.length === 0 ? <EmptyState title={hasFilters ? 'Sin resultados' : 'Sin movimientos'} copy={hasFilters ? 'Prueba otra categoría o fecha.' : 'Los ingresos, egresos y transferencias aparecerán aquí.'} /> : <MovementList movements={sorted} snapshot={snapshot} onEdit={onEdit} interactive />}
  </section></div>
}

function MovementList({ movements, snapshot, onEdit, interactive = true }: { movements: Movement[]; snapshot: FinanceSnapshot; onEdit?: (movement: Movement) => void; interactive?: boolean }) {
  return <div className="movement-list">{movements.map((movement) => {
    const fund = snapshot.funds.find((item) => item.id === movement.fundId)
    const toFund = snapshot.funds.find((item) => item.id === movement.toFundId)
    const category = snapshot.categories.find((item) => item.id === movement.categoryId)
    const sign = movement.kind === 'income' ? '+' : movement.kind === 'expense' ? '−' : ''
    const content = <>
      <EntityIcon className="movement-icon" icon={category?.icon} name={category?.name ?? (movement.kind === 'transfer' ? 'Transferencia' : kindLabel[movement.kind])} kind={movement.kind === 'transfer' ? 'transfer' : movement.kind} />
      <span className="movement-copy"><b>{categoryDisplayName(category, snapshot.categories) ?? (movement.kind === 'transfer' ? `${fund?.name} → ${toFund?.name}` : kindLabel[movement.kind])}</b><small>{new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(movement.occurredAt))}{movement.classification ? ` · ${classificationLabel[movement.classification]}` : ''}</small></span>
      <strong>{sign}{formatMoney(movement.amountCents)}</strong>
    </>
    return interactive ? <button key={movement.id} className={`movement-row ${movement.kind}`} onClick={() => onEdit?.(movement)}>{content}</button> : <div key={movement.id} className={`movement-row static ${movement.kind}`}>{content}</div>
  })}</div>
}

function EmptyState({ title, copy }: { title: string; copy: string }) {
  return <div className="empty-state"><span>◇</span><b>{title}</b><p>{copy}</p></div>
}

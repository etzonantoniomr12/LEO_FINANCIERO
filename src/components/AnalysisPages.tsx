import { useMemo, useState } from 'react'
import { cumulativePoints, dailyExpenseSummary, isSameMonth, normalizeMonth, shiftMonth } from '../domain/analytics'
import { categoryDisplayName } from '../domain/categories'
import { formatMoney } from '../domain/money'
import type { FinanceSnapshot, Movement, MovementClassification } from '../domain/models'

const classificationLabel: Record<MovementClassification, string> = {
  daily: 'Diario',
  monthly: 'Mensual',
  one_time: 'Puntual',
}

const monthFormatter = new Intl.DateTimeFormat('es-PE', { month: 'long', year: 'numeric' })
const dateFormatter = new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' })
const shortDateFormatter = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })

export function IncomePage({ snapshot, initialMonth }: { snapshot: FinanceSnapshot; initialMonth?: Date }) {
  const [month, setMonth] = useState(() => normalizeMonth(initialMonth ?? new Date()))
  const movements = useMemo(() => movementsInMonth(snapshot.movements, month, 'income'), [snapshot.movements, month])
  const monthlyTotal = totalFor(movements, 'monthly')
  const oneTimeTotal = totalFor(movements, 'one_time')

  return <div className="page-stack analysis-page">
    <MonthSelector month={month} onChange={setMonth} />
    <section className="analysis-hero income">
      <span>TOTAL INGRESADO · {monthFormatter.format(month).toLocaleUpperCase('es-PE')}</span>
      <strong>{formatMoney(monthlyTotal + oneTimeTotal)}</strong>
      <div className="hero-breakdown"><span>Mensual <b>{formatMoney(monthlyTotal)}</b></span><span>Puntual <b>{formatMoney(oneTimeTotal)}</b></span></div>
    </section>
    <CumulativePanel movements={movements} snapshot={snapshot} kind="income" />
  </div>
}

export function ExpensePage({ snapshot, initialMonth }: { snapshot: FinanceSnapshot; initialMonth?: Date }) {
  const [month, setMonth] = useState(() => normalizeMonth(initialMonth ?? new Date()))
  const [classification, setClassification] = useState<MovementClassification>('daily')
  const movements = useMemo(() => movementsInMonth(snapshot.movements, month, 'expense'), [snapshot.movements, month])
  const selectedMovements = movements.filter((movement) => movement.classification === classification)
  const total = selectedMovements.reduce((sum, movement) => sum + movement.amountCents, 0)

  return <div className="page-stack analysis-page">
    <MonthSelector month={month} onChange={setMonth} />
    <section className="analysis-hero expense">
      <span>EGRESOS {classificationLabel[classification].toLocaleUpperCase('es-PE')} · {monthFormatter.format(month).toLocaleUpperCase('es-PE')}</span>
      <strong>{formatMoney(total)}</strong>
      <p>{selectedMovements.length} {selectedMovements.length === 1 ? 'movimiento registrado' : 'movimientos registrados'}</p>
    </section>
    <div className="analysis-segmented" role="group" aria-label="Clasificación del egreso">
      {(['daily', 'monthly', 'one_time'] as MovementClassification[]).map((value) => <button key={value} type="button" className={classification === value ? 'active' : ''} aria-pressed={classification === value} onClick={() => setClassification(value)}>{classificationLabel[value]}</button>)}
    </div>
    {classification === 'daily'
      ? <DailyExpensePanel movements={snapshot.movements} month={month} snapshot={snapshot} />
      : <CumulativePanel movements={selectedMovements} snapshot={snapshot} kind="expense" />}
  </div>
}

function MonthSelector({ month, onChange }: { month: Date; onChange: (month: Date) => void }) {
  const currentMonth = normalizeMonth(new Date())
  return <div className="month-selector" aria-label="Mes analizado">
    <button type="button" aria-label="Mes anterior" onClick={() => onChange(shiftMonth(month, -1))}>‹</button>
    <div><small>PERIODO</small><b>{monthFormatter.format(month)}</b></div>
    <button type="button" aria-label="Mes siguiente" disabled={isSameMonth(month, currentMonth)} onClick={() => onChange(shiftMonth(month, 1))}>›</button>
  </div>
}

function CumulativePanel({ movements, snapshot, kind }: { movements: Movement[]; snapshot: FinanceSnapshot; kind: 'income' | 'expense' }) {
  const points = cumulativePoints(movements)
  const largestMovement = points.reduce<Movement | null>((largest, point) => !largest || point.movement.amountCents > largest.amountCents ? point.movement : largest, null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = movements.find((movement) => movement.id === selectedId) ?? null
  const max = Math.max(...points.map((point) => point.cumulativeCents), 1)
  const width = Math.max(300, points.length * 82 + 44)
  const height = 220
  const padding = { top: 20, right: 24, bottom: 43, left: 18 }
  const plotWidth = width - padding.left - padding.right
  const plotHeight = height - padding.top - padding.bottom
  const coordinates = points.map((point, index) => ({
    ...point,
    x: points.length === 1 ? padding.left + plotWidth / 2 : padding.left + (index * plotWidth) / (points.length - 1),
    y: padding.top + plotHeight - (point.cumulativeCents / max) * plotHeight,
  }))
  const polyline = coordinates.map((point) => `${point.x},${point.y}`).join(' ')
  const area = coordinates.length > 0 ? `${coordinates[0].x},${padding.top + plotHeight} ${polyline} ${coordinates.at(-1)!.x},${padding.top + plotHeight}` : ''

  return <section className="panel chart-panel">
    <div className="section-heading"><div><span className="eyebrow">EVOLUCIÓN ACUMULADA</span><h2>{kind === 'income' ? 'Ingresos del mes' : 'Egresos del mes'}</h2></div><span className="count-pill movement-count">{points.length} {points.length === 1 ? 'movimiento' : 'movimientos'}</span></div>
    {points.length === 0 ? <AnalysisEmpty copy={`No hay ${kind === 'income' ? 'ingresos' : 'egresos'} de esta clasificación en el mes.`} /> : <>
      <div className="chart-legend"><span><i className="monthly" />Mensual</span><span><i className="one-time" />Puntual</span></div>
      <div className="cumulative-chart-frame">
        <div className="chart-y-axis" aria-hidden="true"><span>{compactMoney(max)}</span><span>{compactMoney(Math.round(max / 2))}</span><span>{compactMoney(0)}</span></div>
        <div className="chart-scroller">
          <svg className="cumulative-svg" viewBox={`0 0 ${width} ${height}`} style={{ width }} role="img" aria-label="Gráfico acumulado por movimiento">
            {[0, .5, 1].map((ratio) => <line key={ratio} x1={padding.left} x2={width - padding.right} y1={padding.top + ratio * plotHeight} y2={padding.top + ratio * plotHeight} className="chart-grid-line" />)}
            <polygon points={area} className={`chart-area ${kind}`} />
            <polyline points={polyline} className={`chart-line ${kind}`} />
            {coordinates.map((point) => {
              const label = categoryDisplayName(snapshot.categories.find((category) => category.id === point.movement.categoryId), snapshot.categories) ?? 'Movimiento'
              return <g key={point.movement.id} className={`chart-point ${selectedId === point.movement.id ? 'selected' : ''}`} role="button" tabIndex={0} aria-label={`Ver movimiento ${label}, ${formatMoney(point.movement.amountCents)}`} onClick={() => setSelectedId(point.movement.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setSelectedId(point.movement.id) }}>
                <circle cx={point.x} cy={point.y} r="12" className="point-hit" />
                <circle cx={point.x} cy={point.y} r="5.5" className={point.movement.classification === 'monthly' ? 'monthly' : 'one-time'} />
                <text x={point.x} y={height - 15} textAnchor="middle">{new Date(point.movement.occurredAt).getDate()}</text>
              </g>
            })}
          </svg>
        </div>
      </div>
      {kind === 'expense' && <div className="daily-summary cumulative-summary">
        <article><small>Gasto acumulado</small><b>{formatMoney(points.at(-1)?.cumulativeCents ?? 0)}</b></article>
        <article><small>Mayor movimiento</small><b>{formatMoney(Math.max(...points.map((point) => point.movement.amountCents)))}</b></article>
        <article><small>Fecha del mayor movimiento</small><b>{largestMovement ? shortDateFormatter.format(new Date(largestMovement.occurredAt)) : '—'}</b></article>
      </div>}
      <p className="chart-hint">Desliza horizontalmente y toca un punto para ver solo ese movimiento.</p>
      {selected && <MovementDetail movement={selected} snapshot={snapshot} />}
    </>}
  </section>
}

function DailyExpensePanel({ movements, month, snapshot }: { movements: Movement[]; month: Date; snapshot: FinanceSnapshot }) {
  const summary = dailyExpenseSummary(movements, month)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const selected = summary.points.find((point) => point.day === selectedDay)
  const max = Math.max(...summary.points.map((point) => point.amountCents), 1)

  return <section className="panel chart-panel">
    <div className="section-heading"><div><span className="eyebrow">GASTO POR DÍA</span><h2>Movimiento diario</h2></div><span className="count-pill">{summary.elapsedDays} d</span></div>
    {summary.elapsedDays === 0 ? <AnalysisEmpty copy="Este periodo todavía no ha comenzado." /> : <>
      <div className="daily-chart" aria-label="Gráfico horizontal de gastos diarios">
        {summary.points.map((point) => <button key={point.day} type="button" className={`daily-row ${selectedDay === point.day ? 'selected' : ''}`} aria-label={`Día ${point.day}: ${formatMoney(point.amountCents)}`} onClick={() => setSelectedDay(point.day)}>
          <b>{String(point.day).padStart(2, '0')}</b>
          <span className="daily-track"><i style={{ width: point.amountCents === 0 ? 0 : `${Math.max(3, point.amountCents / max * 100)}%` }} /></span>
          <small>{compactMoney(point.amountCents)}</small>
        </button>)}
      </div>
      <div className="daily-summary"><article><small>Promedio diario</small><b>{formatMoney(summary.averageCents)}</b></article><article><small>Total diario</small><b>{formatMoney(summary.totalCents)}</b></article><article><small>Días transcurridos</small><b>{summary.elapsedDays}</b></article></div>
      <p className="chart-hint">El promedio incluye los días sin gasto. Toca un día para ver su detalle.</p>
      {selected && <div className="day-detail"><h3>Día {selected.day}</h3>{selected.movements.length === 0 ? <p>Sin gastos registrados.</p> : selected.movements.map((movement) => <MovementDetail key={movement.id} movement={movement} snapshot={snapshot} />)}</div>}
    </>}
  </section>
}

function MovementDetail({ movement, snapshot }: { movement: Movement; snapshot: FinanceSnapshot }) {
  const category = categoryDisplayName(snapshot.categories.find((item) => item.id === movement.categoryId), snapshot.categories) ?? 'Sin categoría'
  const fund = snapshot.funds.find((item) => item.id === movement.fundId)?.name ?? 'Fondo no disponible'
  return <article className="movement-detail-card">
    <div><span>{category}</span><strong>{formatMoney(movement.amountCents)}</strong></div>
    <p>{classificationLabel[movement.classification ?? 'one_time']} · {fund} · {dateFormatter.format(new Date(movement.occurredAt))}</p>
    {movement.note && <small>{movement.note}</small>}
  </article>
}

function AnalysisEmpty({ copy }: { copy: string }) {
  return <div className="analysis-empty"><span>⌁</span><b>Aún no hay datos</b><p>{copy}</p></div>
}

function movementsInMonth(movements: Movement[], month: Date, kind: 'income' | 'expense') {
  return movements.filter((movement) => {
    const date = new Date(movement.occurredAt)
    return movement.kind === kind && date.getFullYear() === month.getFullYear() && date.getMonth() === month.getMonth()
  })
}

function totalFor(movements: Movement[], classification: MovementClassification) {
  return movements.filter((movement) => movement.classification === classification).reduce((sum, movement) => sum + movement.amountCents, 0)
}

function compactMoney(cents: number) {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', notation: 'compact', maximumFractionDigits: 1 }).format(cents / 100)
}

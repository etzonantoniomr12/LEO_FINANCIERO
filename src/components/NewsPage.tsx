import { useEffect, useMemo, useRef, useState, type TouchEvent } from 'react'
import { publicAsset } from './EntityIcon'

type NewsCategoryId = 'economy' | 'science' | 'civil' | 'civilgeeks' | 'nobel' | 'ai' | 'spreadsheets' | 'blog_sc'

type NewsItem = {
  id: string
  title: string
  summary: string
  source: string
  url: string
  publishedAt: string
  imageUrl?: string
  language: 'es' | 'en'
}

type NewsFeed = {
  updatedAt: string
  categoryUpdatedAt?: Partial<Record<NewsCategoryId, string>>
  categories: Record<NewsCategoryId, NewsItem[]>
}

type RefreshState = 'idle' | 'pulling' | 'ready' | 'refreshing' | 'updated' | 'unchanged' | 'offline'

const categories: Array<{ id: NewsCategoryId; label: string; kicker: string; title: string; copy: string; symbol: string }> = [
  { id: 'economy', label: 'Economía', kicker: 'GESTIÓN · PERÚ', title: 'Economía que mueve tus decisiones', copy: 'Actualidad económica peruana publicada por Diario Gestión.', symbol: '₱' },
  { id: 'science', label: 'Science', kicker: 'ENGLISH READING', title: 'Science and discoveries', copy: 'Relevant discoveries in English for intermediate and advanced reading.', symbol: '◎' },
  { id: 'civil', label: 'Ing. civil', kicker: 'INFRAESTRUCTURA', title: 'Tecnología para construir mejor', copy: 'BIM, inteligencia artificial, materiales, sensores e innovación en ingeniería civil.', symbol: '△' },
  { id: 'civilgeeks', label: 'CivilGeeks', kicker: 'DRENAJE Y SANEAMIENTO', title: 'Biblioteca práctica de drenaje', copy: 'Manuales, guías, proyectos y recursos técnicos publicados por CivilGeeks.', symbol: '≈' },
  { id: 'nobel', label: 'Nobel', kicker: 'IDEAS QUE CAMBIARON EL MUNDO', title: 'El descubrimiento detrás del premio', copy: 'Laureados, motivaciones y explicaciones de investigaciones reconocidas por el Nobel.', symbol: '✦' },
  { id: 'ai', label: 'IA', kicker: 'MODELOS Y HERRAMIENTAS', title: 'La inteligencia artificial en práctica', copy: 'OpenAI, Codex, Claude, DeepMind y herramientas para trabajar con IA.', symbol: '◈' },
  { id: 'spreadsheets', label: 'Excel y Sheets', kicker: 'PRODUCTIVIDAD', title: 'Hojas de cálculo que hacen más', copy: 'Excel, Google Sheets, Apps Script y nuevas formas de automatizar información.', symbol: '▦' },
  { id: 'blog_sc', label: 'BLOG SC', kicker: 'ARCHIVO COMPLETO', title: 'Las lecciones de Soltera Codiciada', copy: 'Todos los posts del blog, ordenados desde el primero hasta el más reciente.', symbol: '♡' },
]

const emptyFeed: NewsFeed = {
  updatedAt: '',
  categories: { economy: [], science: [], civil: [], civilgeeks: [], nobel: [], ai: [], spreadsheets: [], blog_sc: [] },
}

const NEWS_CACHE_KEY = 'leo-financiero-news-feed-v3'
const PULL_THRESHOLD = 72

const dateFormatter = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })
const updatedFormatter = new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' })

export function NewsPage() {
  const initialFeed = useMemo(readCachedFeed, [])
  const [selected, setSelected] = useState<NewsCategoryId>('economy')
  const [feed, setFeed] = useState<NewsFeed>(initialFeed ?? emptyFeed)
  const [loading, setLoading] = useState(!initialFeed)
  const [pullDistance, setPullDistance] = useState(0)
  const [refreshState, setRefreshState] = useState<RefreshState>('idle')
  const touchStartY = useRef<number | null>(null)
  const statusTimer = useRef<number | null>(null)
  const category = categories.find((item) => item.id === selected) ?? categories[0]
  const articles = useMemo(() => feed.categories[selected] ?? [], [feed, selected])
  const categoryUpdatedAt = feed.categoryUpdatedAt?.[selected] ?? feed.updatedAt

  useEffect(() => {
    if (initialFeed) return
    const controller = new AbortController()
    fetch(publicAsset('/news-feed.json'), { signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('No se pudo leer el noticiero.')))
      .then((data: NewsFeed) => {
        setFeed(data)
        saveCachedFeed(data)
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) console.warn(error)
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [initialFeed])

  useEffect(() => () => {
    if (statusTimer.current) window.clearTimeout(statusTimer.current)
  }, [])

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    if (window.scrollY > 0 || refreshState === 'refreshing') return
    touchStartY.current = event.touches[0]?.clientY ?? null
  }

  const handleTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    if (touchStartY.current === null || window.scrollY > 0) return
    const distance = Math.max(0, Math.min(112, (event.touches[0]?.clientY ?? touchStartY.current) - touchStartY.current))
    setPullDistance(distance)
    setRefreshState(distance >= PULL_THRESHOLD ? 'ready' : distance > 0 ? 'pulling' : 'idle')
  }

  const handleTouchEnd = () => {
    touchStartY.current = null
    if (pullDistance >= PULL_THRESHOLD) void refreshNews()
    else {
      setPullDistance(0)
      setRefreshState('idle')
    }
  }

  const refreshNews = async () => {
    setRefreshState('refreshing')
    setPullDistance(54)
    try {
      const separator = publicAsset('/news-feed.json').includes('?') ? '&' : '?'
      const response = await fetch(`${publicAsset('/news-feed.json')}${separator}refresh=${Date.now()}`, { cache: 'no-store' })
      if (!response.ok) throw new Error('No se pudo actualizar la portada.')
      const next = await response.json() as NewsFeed
      const changed = JSON.stringify(next.categories) !== JSON.stringify(feed.categories)
      setFeed(next)
      saveCachedFeed(next)
      showTemporaryStatus(changed ? 'updated' : 'unchanged')
    } catch {
      showTemporaryStatus('offline')
    }
  }

  const showTemporaryStatus = (state: Extract<RefreshState, 'updated' | 'unchanged' | 'offline'>) => {
    setRefreshState(state)
    setPullDistance(54)
    if (statusTimer.current) window.clearTimeout(statusTimer.current)
    statusTimer.current = window.setTimeout(() => {
      setRefreshState('idle')
      setPullDistance(0)
    }, 2200)
  }

  return <div data-testid="news-page" className={`page-stack news-page news-theme-${selected}`} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
    <div className={`news-pull-indicator ${refreshState}`} style={{ height: pullDistance ? `${pullDistance}px` : undefined }} aria-live="polite">
      <span className="news-refresh-spinner" aria-hidden="true">↻</span>
      <b>{refreshLabel(refreshState)}</b>
    </div>
    <nav className="news-categories" aria-label="Categorías de noticias">
      {categories.map((item) => <button key={item.id} type="button" className={selected === item.id ? 'active' : ''} aria-pressed={selected === item.id} onClick={() => setSelected(item.id)}>{item.label}</button>)}
    </nav>

    <section className="news-cover">
      <span className="eyebrow">{category.kicker}</span>
      <h2>{category.title}</h2>
      <p>{category.copy}</p>
      <span className="news-cover-symbol" aria-hidden="true">{category.symbol}</span>
      {categoryUpdatedAt && <time>Actualizado {updatedFormatter.format(new Date(categoryUpdatedAt))}</time>}
    </section>

    <section className="news-grid" aria-live="polite" aria-label={`Noticias de ${category.label}`}>
      {loading && <div className="news-state"><span>◌</span><b>Actualizando portada…</b></div>}
      {!loading && articles.length === 0 && <div className="news-state"><span>{category.symbol}</span><b>No hay noticias disponibles</b><p>Con conexión, la siguiente actualización volverá a consultar las fuentes.</p></div>}
      {articles.map((item, index) => <article key={item.id} className={`news-card news-card-${index % 3 + 1}`}>
        {item.imageUrl && <img className="news-card-image" src={item.imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" />}
        <div className="news-card-symbol" aria-hidden="true">{category.symbol}</div>
        <span>{item.language === 'en' ? 'ENGLISH' : category.label.toUpperCase()}</span>
        <a className="news-headline" href={item.url} target="_blank" rel="noreferrer" aria-label={`${item.title} · Abrir en ${item.source}`}><h2>{item.title}</h2><i aria-hidden="true">↗</i></a>
        <p>{item.summary}</p>
        <footer><b>{item.source}</b><time>{formatPublishedAt(item.publishedAt)}</time></footer>
      </article>)}
    </section>
  </div>
}

function readCachedFeed(): NewsFeed | null {
  try {
    const value = localStorage.getItem(NEWS_CACHE_KEY)
    return value ? JSON.parse(value) as NewsFeed : null
  } catch {
    return null
  }
}

function saveCachedFeed(feed: NewsFeed) {
  try {
    localStorage.setItem(NEWS_CACHE_KEY, JSON.stringify(feed))
  } catch {
    // La caché del navegador es una optimización; la portada empaquetada sigue disponible.
  }
}

function refreshLabel(state: RefreshState) {
  if (state === 'pulling') return 'Desliza un poco más'
  if (state === 'ready') return 'Suelta para actualizar'
  if (state === 'refreshing') return 'Buscando titulares…'
  if (state === 'updated') return 'Portada actualizada'
  if (state === 'unchanged') return 'No hay titulares nuevos'
  if (state === 'offline') return 'Sin conexión · conservamos la última portada'
  return ''
}

function formatPublishedAt(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : dateFormatter.format(date)
}

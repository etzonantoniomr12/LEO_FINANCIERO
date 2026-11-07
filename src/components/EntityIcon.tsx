import type { CategoryKind } from '../domain/models'

export const fundIconOptions = [
  { value: '🏦', label: 'Banco' }, { value: '💳', label: 'Tarjeta' }, { value: '💵', label: 'Efectivo' }, { value: '👛', label: 'Billetera' },
  { value: '/icons/logo_bcp.png', label: 'BCP' }, { value: '/icons/logo_interbank.png', label: 'Interbank' }, { value: '/icons/logo_yape.png', label: 'Yape' }, { value: '/icons/logo_bbva.png', label: 'BBVA' },
]

export const categoryIconOptions = [
  { value: '🍽️', label: 'Alimentación' }, { value: '🥐', label: 'Desayuno' }, { value: '🍛', label: 'Almuerzo' }, { value: '🌙', label: 'Cena' },
  { value: '🏠', label: 'Hogar' }, { value: '🚕', label: 'Transporte' }, { value: '🎉', label: 'Salidas' }, { value: '🎧', label: 'Electrónicos' },
  { value: '💼', label: 'Sueldo' }, { value: '✨', label: 'Ingreso extra' }, { value: '📱', label: 'Telefonía' }, { value: '▶️', label: 'Video' },
  { value: '/icons/logo_bitel.png', label: 'Bitel' }, { value: '/icons/logo_movistar.png', label: 'Movistar' }, { value: '/icons/logo_claro.png', label: 'Claro' },
  { value: '/icons/logo_chatgpt.jpg', label: 'ChatGPT' }, { value: '/icons/logo_apple_music.jpg', label: 'Apple Music' }, { value: '/icons/logo_apple.png', label: 'Apple' }, { value: '/icons/logo_afp_integra.jpg', label: 'AFP Integra' },
]

export function EntityIcon({ icon, name, kind, className = '' }: { icon?: string; name: string; kind?: CategoryKind | 'fund' | 'transfer'; className?: string }) {
  const resolved = icon || inferIcon(name, kind)
  return <span className={`entity-icon ${className}`}>{resolved.startsWith('/') ? <img src={publicAsset(resolved)} alt="" /> : resolved}</span>
}

export function publicAsset(path: string) {
  return path.startsWith('/') ? `${import.meta.env.BASE_URL}${path.slice(1)}` : path
}

export function inferIcon(name: string, kind?: CategoryKind | 'fund' | 'transfer') {
  const normalized = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es')
  const brands: Array<[string, string]> = [
    ['interbank', '/icons/logo_interbank.png'], ['bcp', '/icons/logo_bcp.png'], ['yape', '/icons/logo_yape.png'], ['bbva', '/icons/logo_bbva.png'],
    ['bitel', '/icons/logo_bitel.png'], ['movistar', '/icons/logo_movistar.png'], ['claro', '/icons/logo_claro.png'], ['chatgpt', '/icons/logo_chatgpt.jpg'],
    ['apple music', '/icons/logo_apple_music.jpg'], ['apple', '/icons/logo_apple.png'], ['afp integra', '/icons/logo_afp_integra.jpg'],
  ]
  const brand = brands.find(([term]) => normalized.includes(term))
  if (brand) return brand[1]
  if (normalized.includes('desayuno')) return '🥐'
  if (normalized.includes('almuerzo')) return '🍛'
  if (normalized.includes('cena')) return '🌙'
  if (normalized.includes('alimenta') || normalized.includes('comida')) return '🍽️'
  if (normalized.includes('salida')) return '🎉'
  if (normalized.includes('electron') || normalized.includes('audifono')) return '🎧'
  if (normalized.includes('sueldo') || normalized.includes('salario')) return '💼'
  if (kind === 'transfer') return '↔'
  if (kind === 'income') return '↓'
  if (kind === 'expense') return '↑'
  return kind === 'fund' ? '🏦' : '◇'
}

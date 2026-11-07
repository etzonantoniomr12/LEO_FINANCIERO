const penFormatter = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
  minimumFractionDigits: 2,
})

export const formatMoney = (cents: number) => penFormatter.format(cents / 100)

export function parseMoneyToCents(value: string): number | null {
  const normalized = value.trim().replace(/\s/g, '').replace(',', '.')
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) return null
  const number = Number(normalized)
  if (!Number.isFinite(number) || number <= 0) return null
  return Math.round(number * 100)
}

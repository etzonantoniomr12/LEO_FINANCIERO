import { describe, expect, it } from 'vitest'
import { parseMoneyToCents } from './money'

describe('conversión de importes', () => {
  it('convierte decimales a céntimos sin persistir coma flotante', () => {
    expect(parseMoneyToCents('10.25')).toBe(1025)
    expect(parseMoneyToCents('10,25')).toBe(1025)
  })

  it('rechaza cero, negativos y más de dos decimales', () => {
    expect(parseMoneyToCents('0')).toBeNull()
    expect(parseMoneyToCents('-1')).toBeNull()
    expect(parseMoneyToCents('1.234')).toBeNull()
  })
})

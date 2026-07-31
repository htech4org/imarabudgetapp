import { parseISO } from './calc'

/** 12,400 — never with decimals unless they matter. */
export function money(amount, currency = '₦') {
  const n = Number(amount || 0)
  const abs = Math.abs(n)
  const body = abs % 1 === 0
    ? abs.toLocaleString('en-US')
    : abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${n < 0 ? '−' : ''}${currency}${body}`
}

/** Compact for tight admin tiles: ₦1.2m */
export function moneyShort(amount, currency = '₦') {
  const n = Number(amount || 0)
  const abs = Math.abs(n)
  const sign = n < 0 ? '−' : ''
  if (abs >= 1_000_000) return `${sign}${currency}${(abs / 1_000_000).toFixed(1)}m`
  if (abs >= 10_000)    return `${sign}${currency}${Math.round(abs / 1000)}k`
  return money(n, currency)
}

export const pct = (v) => `${Math.round((Number(v) || 0) * 100)}%`

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

export function shortDate(iso) {
  if (!iso) return ''
  const d = parseISO(iso)
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`
}

export function longDate(iso) {
  if (!iso) return ''
  const d = parseISO(iso)
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`
}

export function dayLabel(iso, todayIso) {
  if (iso === todayIso) return 'Today'
  const d = parseISO(iso)
  const t = parseISO(todayIso)
  if (Math.round((t - d) / 86400000) === 1) return 'Yesterday'
  return longDate(iso)
}

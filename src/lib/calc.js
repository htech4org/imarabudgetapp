// ---------------------------------------------------------------------------
//  All the money maths, in one place.
//  The admin console uses these exact functions, so what the team sees can
//  never drift from what she sees.
// ---------------------------------------------------------------------------

import {
  SPLIT_LINES, LIVING_CATEGORIES, CATEGORY_KEYS,
  MOVE_KEY_BY_CATEGORY, PERIOD_DAYS,
} from './constants'

const sum = (rows) => rows.reduce((t, r) => t + Number(r.amount || 0), 0)

/**
 * Money IN, money OUT, money MOVED, and the Gap.
 *
 * The Gap is IN − OUT, exactly as The Map defines cashflow. Moving money into
 * Saving/Investing/Growth deliberately does NOT reduce it — that money was
 * never spent, it was assigned. If moves shrank the Gap, a woman who saved
 * well would watch her surplus fall toward zero, which reads as failure for
 * doing the right thing.
 *
 * `unassigned` is the figure that answers "so how much of my surplus is still
 * sitting there undecided" — the surplus she has not yet moved anywhere.
 */
export function totals(entries = []) {
  const moneyIn  = sum(entries.filter((e) => e.type === 'IN'))
  const moneyOut = sum(entries.filter((e) => e.type === 'OUT'))
  const moved    = sum(entries.filter((e) => e.type === 'MOVE'))
  const gap      = moneyIn - moneyOut
  return { moneyIn, moneyOut, moved, gap, unassigned: Math.max(0, gap - moved) }
}

/** Total OUT per spending category. */
export function byCategory(entries = []) {
  const out = {}
  CATEGORY_KEYS.forEach((c) => { out[c] = 0 })
  entries.filter((e) => e.type === 'OUT').forEach((e) => {
    const key = CATEGORY_KEYS.includes(e.category) ? e.category : 'Everything Else'
    out[key] += Number(e.amount || 0)
  })
  return out
}

/** The single biggest expense category — her "leak". */
export function biggestLeak(entries = []) {
  const cats = byCategory(entries)
  const ranked = Object.entries(cats).sort((a, b) => b[1] - a[1])
  if (!ranked.length || ranked[0][1] <= 0) return null
  const [category, amount] = ranked[0]
  const totalOut = sum(entries.filter((e) => e.type === 'OUT'))
  return { category, amount, share: totalOut > 0 ? amount / totalOut : 0 }
}

/** Total MOVED per build line (saving / investing / growth). */
export function byBuildLine(entries = []) {
  const out = { saving: 0, investing: 0, growth: 0 }
  entries.filter((e) => e.type === 'MOVE').forEach((e) => {
    const key = MOVE_KEY_BY_CATEGORY[e.category]
    if (key) out[key] += Number(e.amount || 0)
  })
  return out
}

/**
 * The Rich Woman Split for a period: five target amounts off total IN,
 * against what she has actually assigned to each line.
 *
 * A line counts as "on the map" when:
 *   · Giving / Saving / Investing / Growth — she has reached 80% of target
 *   · Living — she has stayed at or under her 60%
 */
export function splitPerformance(entries = []) {
  const { moneyIn } = totals(entries)
  const cats  = byCategory(entries)
  const build = byBuildLine(entries)

  const living = LIVING_CATEGORIES.reduce((t, c) => t + (cats[c] || 0), 0)

  const actualFor = {
    giving:    cats.Giving || 0,
    saving:    build.saving,
    investing: build.investing,
    growth:    build.growth,
    living,
  }

  const lines = SPLIT_LINES.map((line) => {
    const target = moneyIn * line.pct
    const actual = actualFor[line.key]
    const onMap = moneyIn <= 0 ? false
      : line.key === 'living' ? actual <= target
      : actual >= target * 0.8
    return {
      ...line,
      target,
      actual,
      remaining: Math.max(0, target - actual),
      over: Math.max(0, actual - target),
      progress: target > 0 ? actual / target : 0,
      onMap,
    }
  })

  const linesOnMap = lines.filter((l) => l.onMap).length
  return {
    moneyIn,
    lines,
    linesOnMap,
    // The headline cohort measure: 3 of the 5 lines landing is "on track".
    onTrack: moneyIn > 0 && linesOnMap >= 3,
  }
}

// ---------------------------------------------------------------------------
//  Dates
// ---------------------------------------------------------------------------

export const toISO = (d) => {
  const x = new Date(d)
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
}

export const today = () => toISO(new Date())

/** Parse a yyyy-mm-dd string as a local date, not UTC. */
export const parseISO = (s) => {
  const [y, m, d] = String(s).split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const daysBetween = (a, b) =>
  Math.round((parseISO(b) - parseISO(a)) / 86400000)

export const addDays = (iso, n) => {
  const d = parseISO(iso)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

/** Every day of the period, flagged with whether she logged anything. */
export function periodDays(period, entries = []) {
  if (!period) return []
  const logged = new Set(entries.map((e) => e.entry_date))
  const span = Math.max(1, daysBetween(period.start_date, period.end_date) + 1)
  const now = today()
  return Array.from({ length: span }, (_, i) => {
    const date = addDays(period.start_date, i)
    return {
      date,
      dayNumber: i + 1,
      logged: logged.has(date),
      isToday: date === now,
      isFuture: date > now,
    }
  })
}

/** Day 1..30 of the period, capped at the period length. */
export function dayOfPeriod(period) {
  if (!period) return 0
  const span = daysBetween(period.start_date, period.end_date) + 1
  return Math.min(span, Math.max(1, daysBetween(period.start_date, today()) + 1))
}

export function daysElapsed(period) {
  if (!period) return 0
  const span = daysBetween(period.start_date, period.end_date) + 1
  if (period.status === 'closed') return span
  return Math.min(span, Math.max(1, daysBetween(period.start_date, today()) + 1))
}

export function daysLeft(period) {
  if (!period) return 0
  return Math.max(0, daysBetween(today(), period.end_date))
}

export const periodComplete = (period) =>
  Boolean(period) && (period.status === 'closed' || today() >= period.end_date)

/** Share of days so far that carry at least one entry. */
export function consistency(period, entries = []) {
  const elapsed = daysElapsed(period)
  if (!elapsed) return 0
  const inPeriod = entries.filter((e) => e.period_id === period.id)
  const logged = new Set(inPeriod.map((e) => e.entry_date)).size
  return Math.min(1, logged / elapsed)
}

/** Longest run of consecutive logged days, counting back from today. */
export function currentStreak(period, entries = []) {
  if (!period) return 0
  const logged = new Set(entries.filter((e) => e.period_id === period.id).map((e) => e.entry_date))
  let streak = 0
  let cursor = today()
  if (cursor > period.end_date) cursor = period.end_date
  while (cursor >= period.start_date && logged.has(cursor)) {
    streak += 1
    cursor = addDays(cursor, -1)
  }
  return streak
}

// ---------------------------------------------------------------------------
//  Cohort maths for the admin console
// ---------------------------------------------------------------------------

/** Everything the team needs about one woman, derived from raw rows. */
export function womanSnapshot(woman, periods = [], entries = []) {
  const hers = periods.filter((p) => p.woman_id === woman.id)
    .sort((a, b) => b.period_number - a.period_number)
  const herEntries = entries.filter((e) => e.woman_id === woman.id)
  const active = hers.find((p) => p.status === 'active') || null
  const current = active || hers[0] || null
  const currentEntries = current ? herEntries.filter((e) => e.period_id === current.id) : []

  return {
    woman,
    periods: hers,
    entries: herEntries,
    period: current,
    currentEntries,
    totals: totals(currentEntries),
    split: splitPerformance(currentEntries),
    consistency: current ? consistency(current, herEntries) : 0,
    daysLogged: new Set(currentEntries.map((e) => e.entry_date)).size,
    daysElapsed: current ? daysElapsed(current) : 0,
    lastLogged: currentEntries.length
      ? currentEntries.map((e) => e.entry_date).sort().slice(-1)[0]
      : null,
    // History of every completed month, oldest first, for the Gap trend.
    gapHistory: hers.slice().reverse().map((p) => ({
      period: p,
      ...totals(herEntries.filter((e) => e.period_id === p.id)),
    })),
  }
}

export function cohort(data) {
  const { women = [], periods = [], entries = [] } = data || {}
  const snapshots = women.map((w) => womanSnapshot(w, periods, entries))
  const active = snapshots.filter((s) => s.period && s.period.status === 'active')
  const withIncome = snapshots.filter((s) => s.totals.moneyIn > 0)

  const avg = (rows, pick) => (rows.length ? rows.reduce((t, r) => t + pick(r), 0) / rows.length : 0)

  // Cohort money figures are plain sums, so they only read correctly when the
  // trybe shares a currency. Show the dominant one and flag it if it is mixed.
  const currencyCount = women.reduce((acc, w) => {
    const c = w.currency || '₦'
    acc[c] = (acc[c] || 0) + 1
    return acc
  }, {})
  const currencies = Object.entries(currencyCount).sort((a, b) => b[1] - a[1])
  const currency = currencies[0]?.[0] || '₦'
  const mixedCurrency = currencies.length > 1

  // Average Gap per month number, so month 1 vs month 2 vs month 3 is visible.
  const byMonth = new Map()
  snapshots.forEach((s) => s.gapHistory.forEach((h) => {
    if (h.moneyIn <= 0 && h.moneyOut <= 0) return
    const n = h.period.period_number
    if (!byMonth.has(n)) byMonth.set(n, [])
    byMonth.get(n).push(h.gap)
  }))
  const gapTrend = [...byMonth.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([month, gaps]) => ({
      month,
      women: gaps.length,
      avgGap: gaps.reduce((t, g) => t + g, 0) / gaps.length,
      surplusShare: gaps.filter((g) => g >= 0).length / gaps.length,
    }))

  const byArchetype = Object.entries(
    snapshots.reduce((acc, s) => {
      const key = s.woman.archetype || 'unassigned'
      ;(acc[key] = acc[key] || []).push(s)
      return acc
    }, {})
  ).map(([key, rows]) => ({
    key,
    count: rows.length,
    avgGap: avg(rows.filter((r) => r.totals.moneyIn > 0), (r) => r.totals.gap),
    consistency: avg(rows, (r) => r.consistency),
    onTrackShare: rows.length
      ? rows.filter((r) => r.split.onTrack).length / rows.length
      : 0,
    surplusShare: rows.filter((r) => r.totals.moneyIn > 0).length
      ? rows.filter((r) => r.totals.moneyIn > 0 && r.totals.gap >= 0).length /
        rows.filter((r) => r.totals.moneyIn > 0).length
      : 0,
  })).sort((a, b) => b.count - a.count)

  // Per-line: how much of the cohort is landing each of the five.
  const lineHits = SPLIT_LINES.map((line) => {
    const rows = withIncome
    const hits = rows.filter((s) => s.split.lines.find((l) => l.key === line.key)?.onMap).length
    return { ...line, share: rows.length ? hits / rows.length : 0, hits, of: rows.length }
  })

  return {
    snapshots,
    totalWomen: women.length,
    activeWomen: active.length,
    consistency: avg(active, (s) => s.consistency),
    avgGap: avg(withIncome, (s) => s.totals.gap),
    onTrackShare: withIncome.length
      ? withIncome.filter((s) => s.split.onTrack).length / withIncome.length
      : 0,
    surplusShare: withIncome.length
      ? withIncome.filter((s) => s.totals.gap >= 0).length / withIncome.length
      : 0,
    // Quietly flags who to reach out to — support, not surveillance.
    needsSupport: snapshots.filter((s) =>
      s.period && s.period.status === 'active' && s.daysElapsed >= 5 &&
      (s.consistency < 0.3 || (s.totals.moneyIn > 0 && s.totals.gap < 0))
    ),
    gapTrend,
    byArchetype,
    lineHits,
    currency,
    mixedCurrency,
    periodDays: PERIOD_DAYS,
  }
}

// ---------------------------------------------------------------------------
//  DEMO BACKEND — used only by `npm run demo`.
//
//  An in-memory stand-in for Supabase, with a seeded cohort so the dashboard,
//  the split panel and the admin console all have something real to show. No
//  database, no internet, no setup. Data resets every time the page reloads.
//
//  `npm run build` never imports this file, so it cannot reach production.
//  Admin password in demo mode is: imara
// ---------------------------------------------------------------------------

export const configured = true
export const supabase = null

export const DEMO_ADMIN_PASSWORD = 'imara'

const uid = () => Math.random().toString(36).slice(2, 10)
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const shift = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }

const DB = { women: [], periods: [], entries: [], archives: [] }

const DEFAULT_PCTS = { pct_giving: 10, pct_saving: 10, pct_investing: 10, pct_growth: 10, pct_living: 60 }
const CATS = ['Housing', 'Food & Groceries', 'Transport & Fuel', 'Utilities & Bills',
  'Giving', 'Debt Repayments', 'Personal & Beauty', 'Everything Else']
const MOVE_KEY = { Saving: 'saving', Investing: 'investing', 'Personal Growth': 'growth' }

/** Mirror of imara_archive_period — same rules, same rounding. */
function archivePeriod(periodId) {
  const period = DB.periods.find((p) => p.id === periodId)
  if (!period) return
  const woman = DB.women.find((w) => w.id === period.woman_id)
  const rows = DB.entries.filter((e) => e.period_id === periodId)
  const sum = (f) => rows.filter(f).reduce((t, e) => t + Number(e.amount), 0)

  const categories = {}
  rows.filter((e) => e.type === 'OUT').forEach((e) => {
    const k = CATS.includes(e.category) ? e.category : 'Everything Else'
    categories[k] = (categories[k] || 0) + Number(e.amount)
  })
  const moves = {}
  rows.filter((e) => e.type === 'MOVE').forEach((e) => {
    const k = MOVE_KEY[e.category]
    if (k) moves[k] = (moves[k] || 0) + Number(e.amount)
  })

  const totalIn = sum((e) => e.type === 'IN')
  const totalOut = sum((e) => e.type === 'OUT')
  const ranked = Object.entries(categories).sort((a, b) => b[1] - a[1])
  const leak = ranked[0] || null
  const pcts = {
    pct_giving:    period.pct_giving    ?? woman.pct_giving,
    pct_saving:    period.pct_saving    ?? woman.pct_saving,
    pct_investing: period.pct_investing ?? woman.pct_investing,
    pct_growth:    period.pct_growth    ?? woman.pct_growth,
    pct_living:    period.pct_living    ?? woman.pct_living,
  }

  const existing = DB.archives.find((a) => a.period_id === periodId)
  const record = {
    id: existing?.id || uid(),
    woman_id: period.woman_id, period_id: periodId,
    period_number: period.period_number,
    start_date: period.start_date, end_date: period.end_date,
    total_in: totalIn, total_out: totalOut, total_moved: sum((e) => e.type === 'MOVE'),
    gap: totalIn - totalOut,
    categories, moves,
    // Percentages are settled once archived — never rewritten.
    ...(existing
      ? { pct_giving: existing.pct_giving, pct_saving: existing.pct_saving,
          pct_investing: existing.pct_investing, pct_growth: existing.pct_growth,
          pct_living: existing.pct_living }
      : pcts),
    leak_category: leak ? leak[0] : null,
    leak_amount: leak ? leak[1] : null,
    leak_share: leak && totalOut > 0 ? Math.round((leak[1] / totalOut) * 10000) / 10000 : null,
    realisation: period.realisation,
    days_logged: new Set(rows.map((e) => e.entry_date)).size,
    days_in_period: Math.round((new Date(period.end_date) - new Date(period.start_date)) / 86400000) + 1,
    archived_at: new Date().toISOString(),
  }
  if (existing) Object.assign(existing, record)
  else DB.archives.push(record)
}

/** Mirror of imara_leaderboard — names and percentages only, no ids. */
function buildLeaderboards(meId) {
  const rows = DB.women.map((w) => {
    const active = DB.periods.find((p) => p.woman_id === w.id && p.status === 'active')
    if (!active) return null
    const mine = DB.entries.filter((e) => e.period_id === active.id)
    const moneyIn = mine.filter((e) => e.type === 'IN').reduce((t, e) => t + Number(e.amount), 0)
    if (moneyIn <= 0) return null
    const moved = (cat) => mine.filter((e) => e.type === 'MOVE' && e.category === cat)
      .reduce((t, e) => t + Number(e.amount), 0)
    return {
      name: w.first_name,
      is_you: w.id === meId,
      saving:    w.pct_saving    > 0 ? (moved('Saving')    / (moneyIn * w.pct_saving    / 100)) * 100 : null,
      investing: w.pct_investing > 0 ? (moved('Investing') / (moneyIn * w.pct_investing / 100)) * 100 : null,
    }
  }).filter(Boolean)

  const board = (key) => {
    const ranked = rows.filter((r) => r[key] !== null)
      .map((r) => ({ name: r.name, is_you: r.is_you, pct: Math.round(r[key] * 10) / 10 }))
      .sort((a, b) => b.pct - a.pct || a.name.localeCompare(b.name))
    let lastPct = null, lastRank = 0
    return ranked.map((r, i) => {
      const rank = r.pct === lastPct ? lastRank : i + 1
      lastPct = r.pct; lastRank = rank
      return { ...r, rank }
    })
  }
  return { saving: board('saving'), investing: board('investing') }
}

const SEED = [
  { name: 'Kemi',     archetype: 'kemi',   income: 145000, generous: false, saver: false },
  { name: 'Adaeze',   archetype: 'annie',  income: 210000, generous: true,  saver: false },
  { name: 'Thandiwe', archetype: 'thandi', income: 320000, generous: false, saver: true  },
  { name: 'Ama',      archetype: 'ama',    income: 98000,  generous: false, saver: false },
  { name: 'Zara',     archetype: 'zara',   income: 480000, generous: false, saver: true  },
  { name: 'Nomsa',    archetype: null,     income: 0,      generous: false, saver: false },
]

const SPEND = ['Housing', 'Food & Groceries', 'Transport & Fuel', 'Utilities & Bills',
  'Debt Repayments', 'Personal & Beauty', 'Everything Else']

function seed() {
  SEED.forEach((s, i) => {
    const w = {
      id: uid(), first_name: s.name, phone: `080000000${i}`,
      email: `${s.name.toLowerCase()}@example.com`, archetype: s.archetype,
      currency: '₦', created_at: shift(new Date(), -50).toISOString(),
      ...DEFAULT_PCTS,
      // Two women have moved off the standard split, so the demo shows both
      // the default and a customised one.
      ...(s.name === 'Thandiwe' ? { pct_giving: 5, pct_saving: 10, pct_investing: 20, pct_growth: 5, pct_living: 60 } : {}),
      ...(s.name === 'Kemi'     ? { pct_giving: 5, pct_saving: 20, pct_investing: 5, pct_growth: 5, pct_living: 65 } : {}),
    }
    DB.women.push(w)

    // One closed month, then the month she is in now (day 13 of 30).
    for (let n = 1; n <= 2; n++) {
      const start = shift(new Date(), n === 1 ? -44 : -12)
      const period = {
        id: uid(), woman_id: w.id, period_number: n,
        start_date: iso(start), end_date: iso(shift(start, 29)),
        status: n === 2 ? 'active' : 'closed',
        realisation: n === 1
          ? ['I now know my giving was coming straight out of my rent.',
             'What I now know is that I have been funding everyone but me.',
             'I now know that fine is not the same as growing.',
             'What I now know is that starting badly still beats not starting.',
             'I now know how much I spend proving I am doing well.',
             null][i]
          : null,
        closed_at: n === 1 ? shift(start, 30).toISOString() : null,
      }
      DB.periods.push(period)
      if (s.income === 0) continue   // Nomsa signed up but has not logged yet

      const days = n === 1 ? 30 : 13
      const push = (date, type, category, amount, note) =>
        DB.entries.push({ id: uid(), woman_id: w.id, period_id: period.id,
          entry_date: date, type, category, amount: Math.round(amount), note: note || null })

      for (let d = 0; d < days; d++) {
        if ((d * 7 + i * 3) % 5 === 0) continue        // days she did not log
        const date = iso(shift(start, d))
        if (d === 0 || d === 15) push(date, 'IN', null, s.income / 2, 'Salary')
        if (d % 4 === 1 && i % 2 === 0) push(date, 'IN', null, s.income * 0.06, 'Side business')

        push(date, 'OUT', SPEND[(d + i) % SPEND.length],
          s.income * (0.012 + ((d * 13 + i * 7) % 20) / 900))
        if (s.generous && d % 3 === 0) push(date, 'OUT', 'Giving', s.income * 0.035, 'Family')
        else if (d % 11 === 0) push(date, 'OUT', 'Giving', s.income * 0.012, 'Church')

        if (s.saver && d % 8 === 0) {
          push(date, 'MOVE', ['Saving', 'Investing', 'Personal Growth'][(d / 8) % 3], s.income * 0.05)
        }
      }
    }
  })
  // Every month that is already closed gets its history record, exactly as the
  // migration's backfill does on the real database.
  DB.periods.filter((p) => p.status === 'closed').forEach((p) => archivePeriod(p.id))
}
seed()

const stateFor = (id) => ({
  woman: DB.women.find((w) => w.id === id),
  periods: DB.periods.filter((p) => p.woman_id === id).sort((a, b) => b.period_number - a.period_number),
  entries: DB.entries.filter((e) => e.woman_id === id),
  archives: DB.archives.filter((a) => a.woman_id === id).sort((a, b) => b.period_number - a.period_number),
})

const norm = (p) => String(p || '').replace(/[^0-9+]/g, '')

export async function rpc(fn, a = {}) {
  await new Promise((r) => setTimeout(r, 90))   // pretend the network exists

  switch (fn) {
    case 'imara_state': {
      if (!DB.women.some((w) => w.id === a.p_woman_id)) throw new Error('no_such_woman')
      return stateFor(a.p_woman_id)
    }

    case 'imara_signup': {
      const phone = norm(a.p_phone)
      const email = String(a.p_email || '').toLowerCase().trim()
      if (!String(a.p_first_name || '').trim()) throw new Error('We just need your first name.')
      if (phone.length < 7) throw new Error('That phone number does not look complete.')
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('That email address does not look complete.')

      let w = DB.women.find((x) => x.phone === phone || x.email.toLowerCase() === email)
      if (!w) {
        w = { id: uid(), first_name: a.p_first_name.trim(), phone, email,
          archetype: null, currency: a.p_currency || '₦', created_at: new Date().toISOString(),
          ...DEFAULT_PCTS }
        DB.women.push(w)
      } else {
        w.first_name = a.p_first_name.trim()
      }
      if (!DB.periods.some((p) => p.woman_id === w.id && p.status === 'active')) {
        const now = new Date()
        DB.periods.push({ id: uid(), woman_id: w.id, period_number: 1,
          start_date: iso(now), end_date: iso(shift(now, 29)),
          status: 'active', realisation: null, closed_at: null })
      }
      return stateFor(w.id)
    }

    case 'imara_lookup': {
      const raw = String(a.p_identifier || '').trim().toLowerCase()
      const phone = norm(raw)
      const w = DB.women.find((x) => x.email.toLowerCase() === raw || (phone.length >= 7 && x.phone === phone))
      if (!w) throw new Error('no_such_woman')
      return stateFor(w.id)
    }

    case 'imara_set_archetype': {
      const w = DB.women.find((x) => x.id === a.p_woman_id)
      if (!w) throw new Error('no_such_woman')
      w.archetype = a.p_archetype
      return stateFor(w.id)
    }

    case 'imara_add_entry': {
      const period = DB.periods.find((p) => p.woman_id === a.p_woman_id && p.status === 'active')
      if (!period) throw new Error('no_active_period')
      if (!(a.p_amount > 0)) throw new Error('bad_amount')
      if (a.p_date < period.start_date || a.p_date > period.end_date) throw new Error('date_outside_period')
      DB.entries.push({ id: uid(), woman_id: a.p_woman_id, period_id: period.id,
        entry_date: a.p_date, type: a.p_type, category: a.p_category,
        amount: a.p_amount, note: a.p_note })
      return stateFor(a.p_woman_id)
    }

    case 'imara_delete_entry': {
      // Only entries inside a live month can be removed — a closed month is
      // settled, which is what keeps its archive honest.
      const active = DB.periods.find((p) => p.woman_id === a.p_woman_id && p.status === 'active')
      DB.entries = DB.entries.filter((e) =>
        !(e.id === a.p_entry_id && e.woman_id === a.p_woman_id && active && e.period_id === active.id))
      return stateFor(a.p_woman_id)
    }

    case 'imara_set_split': {
      const w = DB.women.find((x) => x.id === a.p_woman_id)
      if (!w) throw new Error('no_such_woman')
      const vals = [a.p_giving, a.p_saving, a.p_investing, a.p_growth, a.p_living]
      if (vals.some((v) => v === null || v === undefined)) throw new Error('split_incomplete')
      if (vals.some((v) => v < 0)) throw new Error('split_negative')
      if (vals.reduce((t, v) => t + v, 0) !== 100) throw new Error('split_not_100')
      w.pct_giving = a.p_giving; w.pct_saving = a.p_saving
      w.pct_investing = a.p_investing; w.pct_growth = a.p_growth; w.pct_living = a.p_living
      return stateFor(w.id)
    }

    case 'imara_leaderboard':
      return buildLeaderboards(a.p_woman_id)

    case 'imara_close_period': {
      const period = DB.periods.find((p) => p.woman_id === a.p_woman_id && p.status === 'active')
      if (!period) throw new Error('no_active_period')
      const w = DB.women.find((x) => x.id === a.p_woman_id)
      period.status = 'closed'
      period.realisation = (a.p_realisation || '').trim() || null
      period.closed_at = new Date().toISOString()
      // Freeze the percentages this month actually ran under.
      period.pct_giving = w.pct_giving; period.pct_saving = w.pct_saving
      period.pct_investing = w.pct_investing; period.pct_growth = w.pct_growth
      period.pct_living = w.pct_living
      archivePeriod(period.id)
      return stateFor(a.p_woman_id)
    }

    case 'imara_new_period': {
      const w = DB.women.find((x) => x.id === a.p_woman_id)
      DB.periods.filter((p) => p.woman_id === a.p_woman_id && p.status === 'active')
        .forEach((p) => {
          p.status = 'closed'
          p.closed_at = p.closed_at || new Date().toISOString()
          p.pct_giving = p.pct_giving ?? w.pct_giving
          p.pct_saving = p.pct_saving ?? w.pct_saving
          p.pct_investing = p.pct_investing ?? w.pct_investing
          p.pct_growth = p.pct_growth ?? w.pct_growth
          p.pct_living = p.pct_living ?? w.pct_living
          archivePeriod(p.id)
        })
      const now = new Date()
      const next = Math.max(0, ...DB.periods.filter((p) => p.woman_id === a.p_woman_id)
        .map((p) => p.period_number)) + 1
      DB.periods.push({ id: uid(), woman_id: a.p_woman_id, period_number: next,
        start_date: iso(now), end_date: iso(shift(now, 29)),
        status: 'active', realisation: null, closed_at: null })
      return stateFor(a.p_woman_id)
    }

    case 'imara_admin_dashboard': {
      if (a.p_password !== DEMO_ADMIN_PASSWORD) throw new Error('bad_password')
      return { women: DB.women, periods: DB.periods, entries: DB.entries,
        archives: DB.archives, generated_at: new Date().toISOString() }
    }

    default:
      throw new Error(`Demo backend does not know '${fn}'`)
  }
}

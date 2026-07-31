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

const DB = { women: [], periods: [], entries: [] }

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
}
seed()

const stateFor = (id) => ({
  woman: DB.women.find((w) => w.id === id),
  periods: DB.periods.filter((p) => p.woman_id === id).sort((a, b) => b.period_number - a.period_number),
  entries: DB.entries.filter((e) => e.woman_id === id),
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
          archetype: null, currency: a.p_currency || '₦', created_at: new Date().toISOString() }
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
      DB.entries = DB.entries.filter((e) => !(e.id === a.p_entry_id && e.woman_id === a.p_woman_id))
      return stateFor(a.p_woman_id)
    }

    case 'imara_close_period': {
      const period = DB.periods.find((p) => p.woman_id === a.p_woman_id && p.status === 'active')
      if (!period) throw new Error('no_active_period')
      period.status = 'closed'
      period.realisation = (a.p_realisation || '').trim() || null
      period.closed_at = new Date().toISOString()
      return stateFor(a.p_woman_id)
    }

    case 'imara_new_period': {
      DB.periods.filter((p) => p.woman_id === a.p_woman_id && p.status === 'active')
        .forEach((p) => { p.status = 'closed'; p.closed_at = p.closed_at || new Date().toISOString() })
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
      return { women: DB.women, periods: DB.periods, entries: DB.entries, generated_at: new Date().toISOString() }
    }

    default:
      throw new Error(`Demo backend does not know '${fn}'`)
  }
}

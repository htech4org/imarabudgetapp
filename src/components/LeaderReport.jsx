import { useEffect, useState } from 'react'
import { rpc } from '../lib/supabase'

// A mentor's reports to the Trybe Leader: one weekly (due Sunday 10pm) and one
// monthly (due the last day of the month). The team numbers are filled in from
// the app; she only writes a few lines.

const pctOf = (a, b) => (b > 0 ? Math.round((a / b) * 100) : null)

const shortDay = (iso) =>
  new Date(`${String(iso).slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

const dueText = (iso) =>
  new Date(iso).toLocaleString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
    hour12: true, timeZone: 'Africa/Lagos',
  }).replace(',', '')

const label = (p) =>
  p.period_type === 'week'
    ? `Week of ${shortDay(p.period_start)} to ${shortDay(p.period_end)}`
    : new Date(`${String(p.period_start).slice(0, 10)}T00:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) + ' report'

export function numbersLine(s) {
  if (!s) return ''
  const mm = pctOf(s.mm_att, s.mm_rec)
  const parts = [
    `${s.team_active} on the team`,
    `${s.reading} reading`,
    `${s.invested} invested`,
  ]
  if (s.mm_held > 0) parts.push(mm == null ? `${s.mm_held} Mastermind meeting${s.mm_held > 1 ? 's' : ''}, not recorded` : `Mastermind ${mm}% came`)
  return parts.join(' · ')
}

export default function LeaderReport({ womanId, onError, onNotice }) {
  const [form, setForm] = useState(null)
  const [open, setOpen] = useState(null)      // `${type}|${start}`
  const [vals, setVals] = useState({ well: '', help: '', need: '' })
  const [busy, setBusy] = useState(false)

  const load = () =>
    rpc('imara_leader_report_form', { p_mentor_id: womanId })
      .then(setForm)
      .catch((e) => onError?.(e.message))

  useEffect(() => { load() /* eslint-disable-next-line */ }, [womanId])

  if (!form || !form.periods?.length) return null

  const openPeriod = (p) => {
    setVals({
      well: p.report?.went_well || '', help: p.report?.needs_help || '', need: p.report?.needs_from_leader || '',
    })
    setOpen(`${p.period_type}|${p.period_start}`)
  }

  const send = async (p) => {
    setBusy(true)
    try {
      const f = await rpc('imara_leader_submit_report', {
        p_mentor_id: womanId, p_type: p.period_type, p_start: p.period_start,
        p_went_well: vals.well, p_needs_help: vals.help, p_needs_from_leader: vals.need,
      })
      setForm(f)
      setOpen(null)
      onNotice?.('Report sent to your Trybe Leader.')
    } catch (e) { onError?.(e.message) } finally { setBusy(false) }
  }

  const now = Date.now()

  return (
    <div className="card" style={{ padding: 16 }}>
      <div className="small" style={{ fontWeight: 700 }}>Reports to your Trybe Leader</div>
      <p className="tiny muted" style={{ marginTop: 4, lineHeight: 1.6 }}>
        Weekly by Sunday 10pm. Monthly by the last day of the month. A few lines is enough.
      </p>

      <div className="stack" style={{ gap: 10, marginTop: 12 }}>
        {form.periods.map((p) => {
          const key = `${p.period_type}|${p.period_start}`
          const sent = Boolean(p.report)
          const late = !sent && now > new Date(p.due_at).getTime()
          const isOpen = open === key
          return (
            <div key={key} style={{ border: '1.5px solid rgba(76,5,11,.1)', borderRadius: 12, padding: 12 }}>
              <div className="row-between" style={{ gap: 8, alignItems: 'flex-start' }}>
                <div>
                  <div className="small" style={{ fontWeight: 600 }}>{label(p)}</div>
                  <div className="tiny muted" style={{ marginTop: 2 }}>
                    {sent
                      ? `Sent${p.report.on_time ? '' : ' late'}`
                      : late ? `Was due ${dueText(p.due_at)}` : `Due ${dueText(p.due_at)}`}
                  </div>
                </div>
                {!isOpen && (
                  <button
                    className={`btn btn-sm ${sent ? 'btn-soft' : 'btn-primary'}`}
                    onClick={() => openPeriod(p)}
                  >
                    {sent ? 'Edit' : 'Write it'}
                  </button>
                )}
              </div>

              {isOpen && (
                <div className="stack" style={{ gap: 10, marginTop: 12 }}>
                  <p className="tiny muted" style={{ lineHeight: 1.6 }}>
                    <b>Filled in for you:</b> {numbersLine(p.stats)}
                  </p>
                  <label className="tiny" style={{ fontWeight: 600 }}>What went well</label>
                  <textarea className="textarea" maxLength={2000} value={vals.well}
                    onChange={(e) => setVals({ ...vals, well: e.target.value })} />
                  <label className="tiny" style={{ fontWeight: 600 }}>Who needs help, and what you did</label>
                  <textarea className="textarea" maxLength={2000} value={vals.help}
                    onChange={(e) => setVals({ ...vals, help: e.target.value })} />
                  <label className="tiny" style={{ fontWeight: 600 }}>What do you need from your Trybe Leader?</label>
                  <textarea className="textarea" maxLength={2000} value={vals.need}
                    onChange={(e) => setVals({ ...vals, need: e.target.value })} />
                  <div className="row" style={{ gap: 8 }}>
                    <button className="btn btn-primary" disabled={busy} onClick={() => send(p)}>
                      {busy ? 'Sending…' : sent ? 'Save changes' : 'Send report'}
                    </button>
                    <button className="btn btn-soft" disabled={busy} onClick={() => setOpen(null)}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

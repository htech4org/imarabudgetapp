import { useEffect, useState } from 'react'
import { rpc } from '../lib/supabase'
import { CREED } from '../lib/constants'

const dayLabel = (iso) =>
  new Date(`${String(iso).slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

// Her registered recruiter training: the four Fridays, the class link (shown
// on class days from 6:30pm, once Admin has added it) and a cancel option.
export default function Recruiter({ womanId, onError, onNotice, onSwitchApp, onSignOut }) {
  const [st, setSt] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    rpc('imara_recruiter_state', { p_woman_id: womanId }).then(setSt).catch((e) => onError(e.message))
    // eslint-disable-next-line
  }, [womanId])

  const cancel = async () => {
    if (!window.confirm('Cancel your recruiter training registration?')) return
    setBusy(true)
    try {
      const s = await rpc('imara_recruiter_cancel', { p_woman_id: womanId })
      setSt(s)
      onNotice?.('Your registration is cancelled.')
      onSwitchApp?.()
    } catch (e) { onError(e.message) } finally { setBusy(false) }
  }

  if (!st) return <div className="loading-wrap"><div className="spinner" /><p className="small muted">Opening…</p></div>

  const link = typeof st.link === 'string' && st.link.startsWith('https://') ? st.link : null

  return (
    <div className="shell fade-in">
      <div className="topbar">
        <div className="eyebrow" style={{ color: 'var(--peach)' }}>Recruiter training</div>
        <h1 className="display d-lg" style={{ marginTop: 5 }}>you are registered</h1>
        <p className="tiny" style={{ color: 'rgba(255,226,204,0.66)', marginTop: 8 }}>4 weeks · Fridays 7pm WAT</p>
      </div>

      <div className="pad" style={{ paddingTop: 20 }}>
        <div className="stack" style={{ gap: 14 }}>
          <div className="card" style={{ padding: 16 }}>
            <div className="tiny muted" style={{ letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 700 }}>Your classes</div>
            <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
              {(st.classes || []).map((d) => <span key={d} className="tag">{dayLabel(d)}</span>)}
            </div>
            <p className="tiny muted" style={{ marginTop: 12, lineHeight: 1.7 }}>
              Qualify and earn up to ₦3,000/£3/$3 per recruit.
            </p>
          </div>

          <div className="card" style={{ padding: 16 }}>
            <div className="tiny muted" style={{ letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 700 }}>Class link</div>
            {link ? (
              <>
                <p className="tiny muted" style={{ margin: '8px 0 12px' }}>Tonight's class is at 7pm WAT.</p>
                <a
                  className="btn btn-primary" href={link} target="_blank" rel="noopener noreferrer"
                  onClick={() => { rpc('imara_recruiter_log_click', { p_woman_id: womanId }).catch(() => {}) }}
                >
                  Join today's class
                </a>
              </>
            ) : (
              <p className="tiny muted" style={{ marginTop: 8, lineHeight: 1.7 }}>
                The link shows here on class days from 6:30pm.
                {!st.link_set && ' IMARA will add it before the first class.'}
              </p>
            )}
          </div>

          {st.can_cancel && (
            <p style={{ textAlign: 'center' }}>
              <button className="btn-link" disabled={busy} onClick={cancel}>Cancel my registration</button>
              <span className="tiny muted"> (until the first class)</span>
            </p>
          )}
        </div>
      </div>

      <div className="footer-note">
        <p className="creed">{CREED}</p>
        <p style={{ marginBottom: 12 }}>© IMARA Wealth Trybe · Leading Ladies Foundation</p>
        <div className="row" style={{ justifyContent: 'center', gap: 18 }}>
          {onSwitchApp && <button className="btn-link" onClick={onSwitchApp}>Back to home</button>}
          <button className="btn-link" onClick={onSignOut}>Sign out of this device</button>
        </div>
      </div>
    </div>
  )
}

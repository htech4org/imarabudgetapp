import { useState } from 'react'
import { PRIVACY_NOTICE, CREED, CURRENCIES } from '../lib/constants'

export default function Signup({ onSignup, onLookup, busy }) {
  const [mode, setMode] = useState('new')       // 'new' | 'return'
  const [form, setForm] = useState({ first_name: '', phone: '', email: '', currency: '₦' })
  const [identifier, setIdentifier] = useState('')
  const [error, setError] = useState('')

  const set = (k) => (e) => { setForm({ ...form, [k]: e.target.value }); setError('') }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      if (mode === 'new') await onSignup(form)
      else await onLookup(identifier)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="shell fade-in">
      <div className="welcome">
        <span className="chip-brand">✦ IMARA Wealth Trybe</span>
        <h1 className="display d-xl" style={{ margin: '22px 0 12px' }}>
          the daily<br />budget tracker
        </h1>
        <p style={{ fontSize: 14.5, lineHeight: 1.7, color: 'rgba(255,226,204,0.86)', maxWidth: 330 }}>
          Income is not wealth. Cashflow is. For the next thirty days you are going
          to write down what comes in and what goes out — and find your Gap.
        </p>
        <p className="creed" style={{ marginTop: 20 }}>{CREED}</p>
      </div>

      <div className="pad" style={{ paddingTop: 26 }}>
        <div className="type-toggle" style={{ marginBottom: 22 }}>
          <button className={mode === 'new' ? 'on' : ''} onClick={() => { setMode('new'); setError('') }}>
            I'm new here
          </button>
          <button className={mode === 'return' ? 'on' : ''} onClick={() => { setMode('return'); setError('') }}>
            I've been here before
          </button>
        </div>

        <form onSubmit={submit} className="stack" style={{ gap: 16 }}>
          {mode === 'new' ? (
            <>
              <div className="field">
                <label className="label">First name</label>
                <input className="input" value={form.first_name} onChange={set('first_name')}
                  placeholder="What we should call you" autoComplete="given-name" />
              </div>
              <div className="field">
                <label className="label">Phone number</label>
                <input className="input" value={form.phone} onChange={set('phone')} type="tel"
                  placeholder="080 000 0000" autoComplete="tel" inputMode="tel" />
              </div>
              <div className="field">
                <label className="label">Email</label>
                <input className="input" value={form.email} onChange={set('email')} type="email"
                  placeholder="you@email.com" autoComplete="email" inputMode="email" />
              </div>
              <div className="field">
                <label className="label">Your currency</label>
                <select className="select" value={form.currency} onChange={set('currency')}>
                  {CURRENCIES.map((c) => <option key={c.symbol} value={c.symbol}>{c.label}</option>)}
                </select>
              </div>
            </>
          ) : (
            <div className="field">
              <label className="label">Phone number or email</label>
              <input className="input" value={identifier} onChange={(e) => { setIdentifier(e.target.value); setError('') }}
                placeholder="The one you signed up with" autoComplete="tel" />
              <p className="tiny muted" style={{ marginTop: 2 }}>
                Your map is waiting exactly where you left it.
              </p>
            </div>
          )}

          {error && <div className="error-note">{error}</div>}

          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? 'One moment…' : mode === 'new' ? 'Start my map' : 'Take me back to my map'}
          </button>
        </form>

        {mode === 'new' && (
          <div className="privacy-note" style={{ marginTop: 24 }}>
            <div className="eyebrow">Before you begin</div>
            <p>{PRIVACY_NOTICE}</p>
          </div>
        )}
      </div>

      <div className="footer-note">
        <p>© IMARA Wealth Trybe · Leading Ladies Foundation</p>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { PRIVACY_NOTICE, CREED, CURRENCIES } from '../lib/constants'
import { NOT_CLAIMED_MESSAGE } from '../lib/supabase'

// Replaces Signup.jsx. Three things can happen here:
//   'new'      — brand new woman: name/phone/email/currency + a password
//   'return'   — she has a password already: identifier + password
//   'claim'    — she signed up before passwords existed: identifier +
//                a new password, one time only
//
// The 'return' flow tries to log in first. If the account exists but has
// never been claimed, imara_login() raises 'not_claimed' — we catch exactly
// that message (exported as a constant, not re-matched by substring) and
// drop her straight into 'claim' with her identifier already filled in, so
// she never has to explain to herself which button to press.
export default function Login({ onSignup, onLogin, onClaim, busy }) {
  const [mode, setMode] = useState('new')       // 'new' | 'return' | 'claim'
  const [form, setForm] = useState({ first_name: '', phone: '', email: '', currency: '₦', password: '', confirm: '' })
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')

  const set = (k) => (e) => { setForm({ ...form, [k]: e.target.value }); setError('') }

  const resetToReturn = () => {
    setMode('return'); setPassword(''); setConfirm(''); setError('')
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')

    try {
      if (mode === 'new') {
        if (form.password.length < 6) { setError('Your password needs to be at least 6 characters.'); return }
        if (form.password !== form.confirm) { setError('Those two passwords do not match.'); return }
        await onSignup(form)

      } else if (mode === 'return') {
        try {
          await onLogin({ identifier, password })
        } catch (err) {
          if (err.message === NOT_CLAIMED_MESSAGE) {
            setMode('claim')
            setPassword(''); setConfirm('')
            setError('')
            return
          }
          throw err
        }

      } else {
        // claim
        if (password.length < 6) { setError('Your password needs to be at least 6 characters.'); return }
        if (password !== confirm) { setError('Those two passwords do not match.'); return }
        await onClaim({ identifier, password })
      }
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="shell fade-in">
      <div className="welcome">
        <span className="chip-brand">✦ IMARA Wealth Trybe</span>
        <h1 className="display d-xl" style={{ margin: '22px 0 12px' }}>
          your money<br />& your growth
        </h1>
        <p style={{ fontSize: 14.5, lineHeight: 1.7, color: 'rgba(255,226,204,0.86)', maxWidth: 330 }}>
          Two tools, one journey. Track what comes in and out to find your Gap,
          and work through your books one chapter at a time to grow your Wealth Code.
        </p>
        <p className="creed" style={{ marginTop: 20 }}>{CREED}</p>
      </div>

      <div className="pad" style={{ paddingTop: 26 }}>
        {mode !== 'claim' && (
          <div className="type-toggle" style={{ marginBottom: 22 }}>
            <button className={mode === 'new' ? 'on' : ''} onClick={() => { setMode('new'); setError('') }}>
              I'm new here
            </button>
            <button className={mode === 'return' ? 'on' : ''} onClick={resetToReturn}>
              I've been here before
            </button>
          </div>
        )}

        <form onSubmit={submit} className="stack" style={{ gap: 16 }}>
          {mode === 'new' && (
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
              <div className="field">
                <label className="label">Choose a password</label>
                <input className="input" value={form.password} onChange={set('password')} type="password"
                  placeholder="At least 6 characters" autoComplete="new-password" />
              </div>
              <div className="field">
                <label className="label">Confirm password</label>
                <input className="input" value={form.confirm} onChange={set('confirm')} type="password"
                  placeholder="Type it again" autoComplete="new-password" />
              </div>
            </>
          )}

          {mode === 'return' && (
            <>
              <div className="field">
                <label className="label">Phone number or email</label>
                <input className="input" value={identifier} onChange={(e) => { setIdentifier(e.target.value); setError('') }}
                  placeholder="The one you signed up with" autoComplete="username" />
              </div>
              <div className="field">
                <label className="label">Password</label>
                <input className="input" value={password} onChange={(e) => { setPassword(e.target.value); setError('') }}
                  type="password" placeholder="Your password" autoComplete="current-password" />
              </div>
              <p className="tiny muted" style={{ marginTop: -6 }}>
                First time logging in with a password?{' '}
                <button type="button" className="link-inline" onClick={() => { setMode('claim'); setError('') }}>
                  Set one now
                </button>
              </p>
            </>
          )}

          {mode === 'claim' && (
            <>
              <p className="tiny muted" style={{ marginBottom: 4 }}>
                Your map is exactly where you left it — you just need a password on it now.
              </p>
              <div className="field">
                <label className="label">Phone number or email</label>
                <input className="input" value={identifier} onChange={(e) => { setIdentifier(e.target.value); setError('') }}
                  placeholder="The one you signed up with" autoComplete="username" />
              </div>
              <div className="field">
                <label className="label">Choose a password</label>
                <input className="input" value={password} onChange={(e) => { setPassword(e.target.value); setError('') }}
                  type="password" placeholder="At least 6 characters" autoComplete="new-password" />
              </div>
              <div className="field">
                <label className="label">Confirm password</label>
                <input className="input" value={confirm} onChange={(e) => { setConfirm(e.target.value); setError('') }}
                  type="password" placeholder="Type it again" autoComplete="new-password" />
              </div>
              <button type="button" className="link-inline tiny" onClick={resetToReturn}>
                Already have a password? Log in instead
              </button>
            </>
          )}

          {error && <div className="error-note">{error}</div>}

          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy
              ? 'One moment…'
              : mode === 'new' ? 'Start my map'
              : mode === 'claim' ? 'Set my password'
              : 'Log in'}
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

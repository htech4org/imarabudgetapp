import { useState } from 'react'
import { ARCHETYPES, ARCHETYPE_ORDER } from '../lib/constants'

/** Shown once. Her result is saved to her profile and never asked for again. */
export default function ArchetypePick({ name, onPick, busy }) {
  const [choice, setChoice] = useState(null)
  const [error, setError] = useState('')

  const confirm = async () => {
    if (!choice) { setError('Choose the one that was yours.'); return }
    try { await onPick(choice) } catch (e) { setError(e.message) }
  }

  return (
    <div className="shell fade-in">
      <div className="pad" style={{ paddingTop: 44 }}>
        <div className="eyebrow">Your Financial Mirror</div>
        <h1 className="display d-lg" style={{ margin: '10px 0 12px' }}>
          {name ? `welcome, ${name.toLowerCase()}.` : 'welcome.'}<br />which one was yours?
        </h1>
        <p className="small muted" style={{ marginBottom: 24, lineHeight: 1.7 }}>
          You already met her in the Mirror. Choose her here and your tracker will
          know exactly what to put in front of you first. You only have to do this once.
        </p>

        <div className="stack" style={{ gap: 10 }}>
          {ARCHETYPE_ORDER.map((key) => {
            const a = ARCHETYPES[key]
            return (
              <button
                key={key}
                className={`arch-card${choice === key ? ' on' : ''}`}
                onClick={() => { setChoice(key); setError('') }}
              >
                <span className={`arch-mark a-${key}`}>{a.name[0]}</span>
                <span className="grow">
                  <span className="row" style={{ gap: 8, alignItems: 'baseline' }}>
                    <span className="arch-name">{a.name.toLowerCase()}</span>
                    <span className="arch-title">{a.title}</span>
                  </span>
                  <span className="arch-blurb" style={{ display: 'block' }}>{a.blurb}</span>
                </span>
              </button>
            )
          })}
        </div>

        {choice && (
          <div className="focus-card fade-in" style={{ margin: '20px 0 0' }}>
            <div className="eyebrow">Your focus first</div>
            <p className="focus-line">{ARCHETYPES[choice].focusLine}</p>
            <p className="mantra">"{ARCHETYPES[choice].mantra}"</p>
          </div>
        )}

        {error && <div className="error-note" style={{ marginTop: 16 }}>{error}</div>}

        <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={confirm} disabled={busy}>
          {busy ? 'Saving…' : 'This is me — open my map'}
        </button>
      </div>

      <div className="footer-note">
        <p className="creed">the map is not the judgment, it's the way out.</p>
        <p>© IMARA Wealth Trybe · Leading Ladies Foundation</p>
      </div>
    </div>
  )
}

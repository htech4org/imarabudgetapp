import { useEffect, useRef, useState } from 'react'
import { QS, A, pickResult } from '../lib/mirror'

/**
 * The Financial Mirror: 12 questions, then her money archetype.
 * The result is saved to her profile (IMARA, and her mentor once she has one,
 * can see it). Paid women get a "send to my mentor" button; free women get
 * the join card passed in as `ctaSlot`.
 *
 *   saved    { k, a, taken_at } or null  (her last result)
 *   isPaid   boolean
 *   onSave   (key, alsoKey) => Promise
 *   ctaSlot  element shown under the result for free women
 */
export default function Mirror({ saved, isPaid, onSave, ctaSlot, onSignOut }) {
  const [step, setStep] = useState('start')      // start | inst | q | calc | result
  const [qIdx, setQIdx] = useState(0)
  const [sel, setSel] = useState(null)
  const [result, setResult] = useState(null)     // { k, a }
  const scores = useRef({ K: 0, An: 0, Am: 0, T: 0, Z: 0 })

  useEffect(() => { window.scrollTo(0, 0) }, [step, qIdx])

  const begin = () => {
    scores.current = { K: 0, An: 0, Am: 0, T: 0, Z: 0 }
    setQIdx(0); setSel(null); setStep('q')
  }

  const advance = () => {
    if (sel === null) return
    const opt = QS[qIdx].opts[sel]
    Object.entries(opt.sc).forEach(([k, v]) => { scores.current[k] = (scores.current[k] || 0) + v })
    if (qIdx + 1 >= QS.length) {
      setStep('calc')
      const r = pickResult(scores.current)
      setTimeout(() => {
        setResult(r)
        setStep('result')
        Promise.resolve(onSave?.(r.k, r.a)).catch(() => {})
      }, 2400)
      return
    }
    setQIdx(qIdx + 1); setSel(null)
  }

  return (
    <div className="shell fade-in mir">
      <style>{CSS}</style>

      {step === 'start' && (
        <div className="mir-welcome">
          <span className="mir-badge">✦ IMARA Wealth Trybe</span>
          <h1 className="mir-title">The<br /><em>Financial</em><br />Mirror</h1>
          <p className="mir-sub">Twelve questions. Five minutes. The honest truth about where your financial life is really headed.</p>
          <div className="mir-stat">
            <div className="mir-stat-n">96 out of 100</div>
            <div className="mir-stat-t">women reach 65 without financial freedom — not because they did not work hard, but because no one showed them a different path. This mirror will show you where you are on that road.</div>
          </div>
          <button className="mir-btn" onClick={() => setStep('inst')}>I Want to Know the Truth</button>
          {saved && A[saved.k] && (
            <button className="mir-btn ghost" onClick={() => { setResult({ k: saved.k, a: saved.a }); setStep('result') }}>
              See my last result
            </button>
          )}
          <p className="mir-foot">Your result is saved to your profile. IMARA{isPaid ? ' and your mentor' : ', and your mentor once you have one,'} can see it.</p>
          {onSignOut && <button type="button" className="mir-link" onClick={onSignOut}>Sign out</button>}
        </div>
      )}

      {step === 'inst' && (
        <div className="mir-pad">
          <button className="mir-back" onClick={() => setStep('start')}>← Back</button>
          <div className="mir-eyebrow">Before You Begin</div>
          <h2 className="mir-h2">Read this before<br />you answer</h2>
          {[
            ['Answer as things are right now.', 'Not as you hope they will be. Not as they were last year. Not as you wish they were. Today. Exactly as it is this moment.'],
            ['Do not answer to look good.', 'Your answers are private. This mirror only works if you are willing to look directly into it — without adjusting your face first.'],
            ['If two answers feel true,', 'choose the one that is more true right now. Your first instinct knows more than your mind wants to admit.'],
            ['There are no wrong answers.', 'There is only your truth — and what you decide to do with it when you see it.'],
          ].map(([b, t], i) => (
            <div key={i} className="mir-inst">
              <div className="mir-num">{i + 1}</div>
              <div className="mir-inst-t"><strong>{b}</strong> {t}</div>
            </div>
          ))}
          <button className="mir-btn" onClick={begin}>I Am Ready — Be Honest With Me</button>
        </div>
      )}

      {step === 'q' && (
        <div className="mir-q">
          <div className="mir-prog"><i style={{ width: `${Math.round((qIdx / QS.length) * 100)}%` }} /></div>
          <div className="mir-qtop">
            <span className="mir-phase">{QS[qIdx].phase}</span>
            <span className="mir-qn">{qIdx + 1} of {QS.length}</span>
          </div>
          <div className="mir-qbody" key={qIdx}>
            <div className="mir-qtext">{QS[qIdx].q}</div>
            <ul className="mir-opts">
              {QS[qIdx].opts.map((o, i) => (
                <li key={i} className={`mir-opt${sel === i ? ' sel' : ''}`} onClick={() => setSel(i)}>
                  <span className="mir-dot" /><span>{o.t}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="mir-qfoot">
            <button className={`mir-btn next${sel !== null ? ' show' : ''}`} onClick={advance} disabled={sel === null}>Continue</button>
          </div>
        </div>
      )}

      {step === 'calc' && (
        <div className="mir-calc">
          <div className="mir-ring" />
          <div className="mir-calc-t">Reading your mirror</div>
          <p className="mir-sub" style={{ margin: '8px auto 0' }}>Looking at the full picture of your answers</p>
        </div>
      )}

      {step === 'result' && result && (
        <Result result={result} isPaid={isPaid} ctaSlot={ctaSlot} onRetake={() => setStep('start')} />
      )}
    </div>
  )
}

function Result({ result, isPaid, ctaSlot, onRetake }) {
  const arc = A[result.k]
  const also = result.a && A[result.a] ? A[result.a] : null
  const steps = arc.steps.slice()
  if (isPaid) {
    steps[0] = { t: 'Take this to your mentor call.', b: 'Your mentor will go through this result with you. In Session 1 you will test it against your own story and confirm which archetype fits you best. A mirror is a starting point, not a verdict.' }
  }
  let msg = `My IMARA Financial Mirror result: ${arc.name} — ${arc.type}`
  if (also) msg += ` (with a streak of ${also.name})`

  return (
    <div>
      <div className="mir-rhero">
        <div className="mir-reveals">Your Financial Mirror reveals</div>
        <div className="mir-rname">{arc.name}</div>
        <div className="mir-rtype">{arc.type}</div>
        {also && <div className="mir-also">With a streak of {also.name} — {also.type}</div>}
        <div className="mir-tagline">{arc.tagline}</div>
      </div>
      <div className="mir-rbody">
        <div className="mir-sec"><div className="mir-lbl">Your Mirror</div><div className="mir-rt" dangerouslySetInnerHTML={{ __html: arc.mirror }} /></div>
        <div className="mir-sec"><div className="mir-lbl">Your Future — If Nothing Changes</div><div className="mir-card proj"><div className="mir-rt" dangerouslySetInnerHTML={{ __html: arc.proj }} /></div></div>
        <div className="mir-sec"><div className="mir-lbl">What One More Year Costs You</div><div className="mir-card cost"><div className="mir-rt"><p>{arc.cost}</p></div></div></div>
        <div className="mir-sec">
          <div className="mir-lbl">Your Next Steps</div>
          {steps.map((s, i) => (
            <div key={i} className="mir-step">
              <div className="mir-num">{i + 1}</div>
              <div className="mir-step-t"><strong>{s.t}</strong>{s.b}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mir-cta">
        {isPaid ? (
          <>
            <div className="mir-cta-t">Send this to your mentor.</div>
            <p className="mir-cta-b">Sending it lets your mentor start your call knowing where you are.</p>
            <a className="mir-btn" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}
               href={`https://wa.me/?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener noreferrer">
              Send to my mentor on WhatsApp →
            </a>
          </>
        ) : (
          <>
            <div className="mir-cta-t">{arc.ctaT}</div>
            <p className="mir-cta-b">{arc.ctaB}</p>
            {ctaSlot}
          </>
        )}
      </div>
      <div style={{ padding: '0 20px 40px', textAlign: 'center' }}>
        <button type="button" className="mir-link" onClick={onRetake}>Take the mirror again</button>
      </div>
    </div>
  )
}

const CSS = `
.mir{--plum:#6A0DAD;--plum2:#520A88;--mauve:#C17B9E;--mgold:#C9912C;background:#FAF6EF;min-height:100vh;color:#1C0800}
.mir-welcome{padding:44px 24px 40px;background:linear-gradient(172deg,#F8F0FF 0%,#FAF6EF 42%);min-height:100vh;display:flex;flex-direction:column}
.mir-badge{align-self:flex-start;background:rgba(106,13,173,.08);border:1px solid rgba(106,13,173,.22);border-radius:99px;padding:6px 15px;font-size:10.5px;font-weight:700;letter-spacing:1.8px;text-transform:uppercase;color:var(--plum);margin-bottom:28px}
.mir-title{font-family:var(--font-display);font-size:50px;font-weight:500;line-height:1.04;margin-bottom:8px}
.mir-title em{color:var(--plum);font-style:italic;display:block}
.mir-sub{font-size:14px;color:rgba(28,8,0,.55);line-height:1.7;margin-bottom:28px;max-width:320px}
.mir-stat{background:#fff;border-radius:14px;padding:20px 22px;box-shadow:0 2px 14px rgba(28,8,0,.07);border-left:4px solid var(--plum);margin-bottom:34px}
.mir-stat-n{font-family:var(--font-display);font-size:40px;font-weight:600;color:var(--plum);line-height:1;margin-bottom:7px}
.mir-stat-t{font-size:13px;color:rgba(28,8,0,.55);line-height:1.6}
.mir-btn{display:block;width:100%;background:var(--plum);color:#fff;border:0;border-radius:13px;padding:18px 24px;font:600 15px var(--font-body,inherit);cursor:pointer}
.mir-btn:active{background:var(--plum2)}
.mir-btn.ghost{background:none;border:1.5px solid rgba(106,13,173,.25);color:var(--plum);margin-top:12px;padding:14px 24px;font-size:14px}
.mir-foot{text-align:center;font-size:12px;color:rgba(28,8,0,.4);margin-top:14px;line-height:1.6}
.mir-link{background:none;border:0;color:rgba(28,8,0,.45);font-size:12.5px;text-decoration:underline;cursor:pointer;margin:12px auto 0;display:block}
.mir-pad{padding:36px 24px 44px}
.mir-back{background:none;border:0;color:rgba(28,8,0,.5);font-size:13px;cursor:pointer;padding:0;margin-bottom:28px}
.mir-eyebrow{font-size:10.5px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--plum);margin-bottom:10px}
.mir-h2{font-family:var(--font-display);font-size:36px;font-weight:500;line-height:1.15;margin-bottom:26px}
.mir-inst{display:flex;gap:14px;margin-bottom:22px;align-items:flex-start}
.mir-num{width:30px;height:30px;min-width:30px;background:rgba(106,13,173,.07);border:1px solid rgba(106,13,173,.22);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;color:var(--plum)}
.mir-inst-t{font-size:14px;line-height:1.7}.mir-inst-t strong{color:var(--plum);font-weight:600}
.mir-q{display:flex;flex-direction:column;min-height:100vh}
.mir-prog{height:3px;background:rgba(28,8,0,.07)}.mir-prog i{display:block;height:100%;background:var(--plum);transition:width .4s}
.mir-qtop{padding:14px 24px 0;display:flex;justify-content:space-between;align-items:center}
.mir-phase{font-size:10px;font-weight:700;letter-spacing:1.8px;text-transform:uppercase;color:var(--plum);background:rgba(106,13,173,.07);border-radius:99px;padding:4px 10px}
.mir-qn{font-size:12px;color:rgba(28,8,0,.45)}
.mir-qbody{padding:22px 24px 120px;flex:1}
.mir-qtext{font-family:var(--font-display);font-size:25px;font-weight:500;line-height:1.3;margin-bottom:22px}
.mir-opts{list-style:none;display:flex;flex-direction:column;gap:10px;margin:0;padding:0}
.mir-opt{background:#fff;border:1.5px solid rgba(28,8,0,.08);border-radius:13px;padding:15px 16px;cursor:pointer;display:flex;gap:13px;align-items:center;font-size:14px;line-height:1.5}
.mir-opt.sel{background:rgba(106,13,173,.06);border-color:var(--plum);box-shadow:0 0 0 3px rgba(106,13,173,.08)}
.mir-dot{width:20px;height:20px;min-width:20px;border-radius:50%;border:2px solid rgba(28,8,0,.18);display:flex;align-items:center;justify-content:center}
.mir-opt.sel .mir-dot{border-color:var(--plum);background:var(--plum)}.mir-opt.sel .mir-dot::after{content:'';width:6px;height:6px;background:#fff;border-radius:50%}
.mir-qfoot{position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:560px;padding:14px 24px 28px;background:linear-gradient(to top,#FAF6EF 68%,transparent)}
.mir-btn.next{opacity:0;pointer-events:none;transform:translateY(8px);transition:all .2s}.mir-btn.next.show{opacity:1;pointer-events:auto;transform:none}
.mir-calc{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:40px}
.mir-ring{width:54px;height:54px;border:2.5px solid rgba(28,8,0,.07);border-top-color:var(--plum);border-radius:50%;animation:mirspin 1.1s linear infinite;margin-bottom:26px}
@keyframes mirspin{to{transform:rotate(360deg)}}
.mir-calc-t{font-family:var(--font-display);font-size:30px;font-weight:500}
.mir-rhero{background:linear-gradient(160deg,#5A0A95 0%,#7B1AC4 40%,#8E2ED6 100%);padding:48px 24px 40px;color:#fff}
.mir-reveals{font-size:10.5px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,.65);margin-bottom:12px}
.mir-rname{font-family:var(--font-display);font-size:60px;font-weight:600;line-height:1}
.mir-rtype{font-family:var(--font-display);font-size:25px;font-style:italic;color:rgba(255,255,255,.82);margin-bottom:20px}
.mir-also{font-size:13px;color:rgba(255,255,255,.85);margin:-10px 0 18px}
.mir-tagline{font-size:13.5px;color:rgba(255,255,255,.7);line-height:1.65;font-style:italic;border-left:2px solid rgba(255,255,255,.3);padding-left:16px}
.mir-rbody{padding:0 24px 8px}.mir-sec{margin-top:32px}
.mir-lbl{font-size:10.5px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--plum);margin-bottom:12px}
.mir-rt{font-size:15px;line-height:1.75}.mir-rt p{margin:0 0 14px}.mir-rt p:last-child{margin:0}.mir-rt strong{color:var(--plum);font-weight:600}
.mir-card{border-radius:13px;padding:20px}.mir-card.proj{background:rgba(193,123,158,.1);border:1px solid rgba(193,123,158,.28)}.mir-card.cost{background:rgba(201,145,44,.1);border:1px solid rgba(201,145,44,.28)}
.mir-step{display:flex;gap:14px;margin-bottom:20px;align-items:flex-start}
.mir-step-t{font-size:14px;line-height:1.65;padding-top:4px}.mir-step-t strong{display:block;color:var(--plum);font-weight:600;margin-bottom:3px}
.mir-cta{margin:34px 24px 0;padding:26px;background:linear-gradient(140deg,rgba(106,13,173,.07),rgba(193,123,158,.06));border:1px solid rgba(106,13,173,.22);border-radius:16px}
.mir-cta-t{font-family:var(--font-display);font-size:25px;font-weight:500;line-height:1.22;margin-bottom:10px}
.mir-cta-b{font-size:13px;color:rgba(28,8,0,.55);line-height:1.65;margin-bottom:20px}
`

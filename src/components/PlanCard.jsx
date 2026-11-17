import { useState } from 'react'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const fmt = (n) => Number(n || 0).toLocaleString('en-NG', { maximumFractionDigits: 0 })

/**
 * "Your 20-year plan": replaces the old "This month so far" card on Home.
 * plan = imara_plan_status result. The goal is a goal, never a promise.
 */
export default function PlanCard({ plan }) {
  const [maths, setMaths] = useState(false)

  if (!plan) {
    return (
      <div className="plan">
        <style>{CSS}</style>
        <div className="plan-eb">YOUR 20-YEAR PLAN</div>
        <p className="plan-sub" style={{ marginTop: 8 }}>One moment…</p>
      </div>
    )
  }

  const sym = plan.naira ? '₦' : (plan.currency || '₦')
  const startM = Number(String(plan.start).slice(5, 7)) - 1
  const lastM = (startM + 11) % 12
  const done = Number(plan.months_in_year_done) || 0
  const total = Number(plan.months_done) || 0
  const inProgress = total < 240
  const chip = total >= 240 ? 'plan complete' : total === 0 ? 'just starting' : `${total} month${total === 1 ? '' : 's'} done`
  const c = plan.counter || {}

  return (
    <div className="plan">
      <style>{CSS}</style>
      <div className="plan-eb">YOUR 20-YEAR PLAN</div>
      <div className="plan-row">
        <h2 className="plan-h">year {plan.year} of 20</h2>
        <span className="plan-chip">{chip}</span>
      </div>
      <p className="plan-sub">
        {`₦${fmt(plan.monthly_this_year)} a month this year.${plan.monthly_next_year ? ` Next year ₦${fmt(plan.monthly_next_year)}.` : ''}`}
      </p>

      <div className="plan-mo">
        {Array.from({ length: 12 }).map((_, i) => (
          <i key={i} className={i < done ? 'on' : i === done && inProgress ? 'now' : ''} />
        ))}
      </div>
      <div className="plan-ml">
        <span>{MONTHS[startM]}</span>
        <span>{done < 12 ? `${MONTHS_LONG[(startM + done) % 12]}: month ${done + 1}` : 'Year complete'}</span>
        <span>{MONTHS[lastM]}</span>
      </div>
      <div className="plan-yrs">
        {Array.from({ length: 20 }).map((_, i) => <i key={i} className={i < plan.year ? 'on' : ''} />)}
      </div>
      <div className="plan-ml">
        <span>Year 1</span><span>Goal: ₦100M portfolio</span><span>Year 20</span>
      </div>

      <div className="plan-box">
        <div>
          <small>You have invested so far</small>
          <b>{sym}{fmt(plan.invested)}</b>
          <small>{Number(plan.invested) > 0 ? `since ${MONTHS_LONG[startM]}` : 'Log an Investing move in your budget to start'}</small>
        </div>
        {plan.on_plan === true && <span className="plan-ok">on plan</span>}
      </div>

      {c.show && (
        <div className="plan-cnt">
          <b>{c.women}</b>
          <span>Imarians have started<br />investing since {MONTHS_LONG[startM]}</span>
        </div>
      )}

      <p className="plan-fine">₦100 million is a goal we build toward, not a promise. No returns are guaranteed.</p>
      <button type="button" className="plan-link" onClick={() => setMaths(true)}>See the maths ›</button>

      {maths && <MathsSheet onClose={() => setMaths(false)} />}
    </div>
  )
}

function MathsSheet({ onClose }) {
  return (
    <div role="dialog" aria-modal="true" className="plan-sheet-bg" onClick={onClose}>
      <div className="plan-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="plan-sheet-h">the maths behind the plan</div>
        <p>Start with ₦20,000 a month. Every year, add ₦10,000 more. Keep going for 20 years.</p>
        <p>In total, you would put in <b>₦27.6 million</b>.</p>
        <p>To reach ₦100 million, that money would need to grow by about <b>15% a year</b>, on average.</p>
        <p>At 10% a year it would be about ₦64 million. At 12%, about ₦78 million.</p>
        <p className="plan-sheet-fine">
          These are illustrations, not predictions. ₦100 million is a goal we build toward, not a promise.
          IMARA tracks your progress. It does not hold or invest your money, and no returns are guaranteed.
          <br />Educational content, not financial advice.
        </p>
        <button type="button" className="plan-sheet-btn" onClick={onClose}>Close</button>
      </div>
    </div>
  )
}

/**
 * The same plan for a woman without paid access. Nothing personal: the plan
 * itself, the goal, and how many Imarians have started investing (a count only).
 * counter = { show, women } from imara_plan_free, or null.
 */
export function FreePlanCard({ counter }) {
  const [maths, setMaths] = useState(false)
  const c = counter || {}
  return (
    <div className="plan">
      <style>{CSS}</style>
      <div className="plan-eb">THE IMARA 20-YEAR PLAN</div>
      <h2 className="plan-h" style={{ marginTop: 6 }}>start small. grow every year.</h2>
      <p className="plan-sub">Begin with ₦20,000 a month. Add ₦10,000 more every year, for 20 years.</p>
      <div className="plan-steps">
        {[['Year 1', '₦20,000'], ['Year 10', '₦110,000'], ['Year 20', '₦210,000']].map(([y, a]) => (
          <div key={y} className="plan-st"><small>{y}</small><b>{a}</b><small>a month</small></div>
        ))}
      </div>
      <div className="plan-yrs">{Array.from({ length: 20 }).map((_, i) => <i key={i} className="on" />)}</div>
      <div className="plan-ml"><span>Today</span><span>Goal: ₦100M portfolio</span><span>20 years</span></div>
      {c.show && (
        <div className="plan-cnt">
          <b>{c.women}</b>
          <span>Imarians have started<br />investing since September</span>
        </div>
      )}
      <p className="plan-fine">₦100 million is a goal we build toward, not a promise. No returns are guaranteed.</p>
      <button type="button" className="plan-link" onClick={() => setMaths(true)}>See the maths ›</button>
      {maths && <MathsSheet onClose={() => setMaths(false)} />}
    </div>
  )
}

const CSS = `
.plan{background:var(--maroon-900,#4C050B);color:#FBF1E6;border-radius:24px;padding:18px 16px}
.plan-eb{font-size:10.5px;letter-spacing:.16em;color:var(--gold,#DD8E0D);font-weight:700}
.plan-row{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-top:6px;flex-wrap:wrap}
.plan-h{font-family:var(--font-display);font-size:30px;text-transform:lowercase;line-height:1.1;margin:0;font-weight:600}
.plan-chip{font-size:12px;color:#2b0306;background:var(--gold,#DD8E0D);padding:3px 11px;border-radius:99px;font-weight:700;white-space:nowrap}
.plan-sub{font-size:12.5px;color:#E9C9A6;line-height:1.5;margin:4px 0 0}
.plan-mo{display:grid;grid-template-columns:repeat(12,1fr);gap:3px;margin:14px 0 4px}
.plan-mo i{height:9px;border-radius:3px;background:rgba(255,255,255,.2)}
.plan-mo i.on{background:var(--gold,#DD8E0D)}
.plan-mo i.now{background:transparent;border:1.5px solid var(--gold,#DD8E0D)}
.plan-ml{display:flex;justify-content:space-between;font-size:10.5px;color:#E9C9A6}
.plan-yrs{display:grid;grid-template-columns:repeat(20,1fr);gap:3px;margin:12px 0 4px}
.plan-yrs i{height:6px;border-radius:3px;background:rgba(255,255,255,.2)}
.plan-yrs i.on{background:var(--gold,#DD8E0D)}
.plan-box{background:#390308;border-radius:14px;padding:12px 14px;margin-top:14px;display:flex;justify-content:space-between;align-items:center;gap:10px}
.plan-box small{display:block;font-size:11px;color:#E9C9A6;line-height:1.4}
.plan-box b{display:block;font-family:var(--font-display);font-size:28px;font-weight:600;color:#FBF1E6;line-height:1.2}
.plan-ok{background:var(--gold,#DD8E0D);color:#2b0306;font-size:11px;font-weight:700;padding:3px 10px;border-radius:99px;white-space:nowrap}
.plan-cnt{margin-top:14px;padding-top:12px;border-top:1px solid #7a2a2f;display:flex;justify-content:space-between;align-items:center;gap:12px}
.plan-cnt b{font-family:var(--font-display);font-size:30px;color:var(--gold,#DD8E0D);font-weight:600}
.plan-cnt span{font-size:11.5px;color:#E9C9A6;line-height:1.5;text-align:right}
.plan-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:14px}
.plan-st{background:#390308;border-radius:12px;padding:10px 6px;text-align:center}
.plan-st small{display:block;font-size:10.5px;color:#E9C9A6}
.plan-st b{display:block;font-family:var(--font-display);font-size:17px;font-weight:600;color:#FBF1E6;margin-top:2px}
.plan-fine{font-size:11px;color:#E9C9A6;margin:12px 0 0;line-height:1.5}
.plan-link{background:none;border:0;color:var(--gold,#DD8E0D);font-size:12.5px;font-weight:700;padding:6px 0 0;cursor:pointer}
.plan-sheet-bg{position:fixed;inset:0;background:rgba(42,20,16,.6);display:flex;align-items:flex-end;justify-content:center;z-index:60}
.plan-sheet{background:#fff;color:#2b0306;width:100%;max-width:480px;border-radius:18px 18px 0 0;padding:20px}
.plan-sheet-h{font-family:var(--font-display);font-size:21px;text-transform:lowercase;color:#4C050B;margin-bottom:6px}
.plan-sheet p{font-size:13.5px;line-height:1.65;margin:8px 0}
.plan-sheet .plan-sheet-fine{font-size:11.5px;color:#7a5a50}
.plan-sheet-btn{margin-top:10px;width:100%;background:#4C050B;color:#fff;border:0;border-radius:13px;padding:12px;font-weight:700;font-size:13.5px;cursor:pointer}
`

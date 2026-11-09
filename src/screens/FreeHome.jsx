import { CSS, properName } from './Home'
import { A } from '../lib/mirror'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const short = (iso) => (iso ? `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}` : '')
const long = (iso) => (iso ? `${Number(iso.slice(8, 10))} ${LONG[Number(iso.slice(5, 7)) - 1]}` : '')

/**
 * Home for a woman without active access (never paid, or a past member).
 * Replaces the old locked screen. She can take the Financial Mirror, use a
 * limited budget tracker for her one free month, and watch the Wealth Summit.
 *
 *   info         imara_free_info result (null while loading)
 *   renewalInfo  imara_renewal_info result: her payment link
 */
export default function FreeHome({
  firstName, info, renewalInfo, busy, onMirror, onBudget, onCheckAgain, onSignOut,
}) {
  const name = properName(firstName)
  const past = Boolean(info?.ever_paid)
  const phase = info?.pay_phase
  const link = typeof renewalInfo?.link === 'string' && renewalInfo.link.startsWith('https://') ? renewalInfo.link : null
  const summit = typeof info?.summit_link === 'string' && info.summit_link.startsWith('https://') ? info.summit_link : null

  let noLinkNote = null
  if (renewalInfo && !link) {
    if (renewalInfo.is_mentor) noLinkNote = "The payment link isn't set up yet. Please contact IMARA admin."
    else if (renewalInfo.mentor_name) noLinkNote = `Your mentor ${renewalInfo.mentor_name} sends you your payment link. It will show here as soon as she adds it.`
    else noLinkNote = "You haven't been placed with a mentor yet. Your payment link will show here once IMARA admin assigns you."
  }

  const budgetSub = !info ? '' :
    info.free_state === 'not_started' ? 'Start your 1 free month' :
    info.free_state === 'open' ? `Day ${info.free_day} of 30` :
    info.free_state === 'ended' ? 'Free month finished · view' :
    'Your past budget · read-only'

  return (
    <div className="shell fade-in home">
      <style>{CSS}</style>
      <div className="home-hero">
        <span className="home-pill">FREE</span>
        <div className="home-eyebrow">✦ IMARA Wealth Trybe</div>
        <h1>{past ? 'welcome back,' : 'hello,'}<br /><span className="home-name">{name}</span></h1>
        <p>{past ? `Your access ended${info?.paid_until ? ` ${short(info.paid_until)}` : ''}` : 'You are on the free plan'}</p>
      </div>

      <div className="home-body">
        {/* ---------------- upgrade card ---------------- */}
        <div style={{ background: 'linear-gradient(120deg,var(--clay),var(--wine))', color: '#fff', borderRadius: 18, padding: '15px 16px' }}>
          {!info ? (
            <p style={{ fontSize: 12 }}>One moment…</p>
          ) : phase === 'closed' ? (
            <>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, textTransform: 'lowercase' }}>payments are closed for now</div>
              <p style={{ fontSize: 12, opacity: 0.9, margin: '5px 0 0', lineHeight: 1.5 }}>We will announce the next opening. Your map and your progress are safe.</p>
            </>
          ) : (
            <>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, textTransform: 'lowercase' }}>
                {phase === 'before'
                  ? `IMARA opens again ${long(info.opens_on)}`
                  : past ? 'renew to pick up where you left off' : 'join IMARA'}
              </div>
              <p style={{ fontSize: 12, opacity: 0.9, margin: '5px 0 11px', lineHeight: 1.5 }}>
                Payments are open {short(info.opens_on)} – {long(info.closes_on)}.{' '}
                {past ? 'Your map and your progress are safe.' : 'Join to get the Tuesday classes, your mentor, mastermind, books and the full tracker.'}
              </p>
              {phase === 'before' ? (
                <span style={{ display: 'block', textAlign: 'center', background: 'rgba(255,255,255,.35)', color: '#fff', fontWeight: 700, fontSize: 13, padding: 10, borderRadius: 12 }}>
                  Opens {short(info.opens_on)}
                </span>
              ) : link ? (
                <a href={link} target="_blank" rel="noopener noreferrer"
                   style={{ display: 'block', textAlign: 'center', background: '#fff', color: 'var(--wine)', fontWeight: 700, fontSize: 13, padding: 10, borderRadius: 12, textDecoration: 'none' }}>
                  {past ? 'Renew' : 'Join IMARA'}
                </a>
              ) : (
                <span style={{ display: 'block', fontSize: 12, background: 'rgba(255,255,255,.16)', borderRadius: 12, padding: 10, lineHeight: 1.5 }}>{noLinkNote || ' '}</span>
              )}
            </>
          )}
        </div>

        {/* ---------------- free tiles ---------------- */}
        <div className="home-sec">Free for you</div>
        <div className="home-tiles">
          <button type="button" className="home-tile" onClick={onMirror}>
            <div><div className="home-ic">🪞</div><b>financial mirror</b></div>
            <small>{info?.mirror && A[info.mirror.k] ? `Your result: ${A[info.mirror.k].name}` : 'Takes 5 minutes'}</small>
          </button>
          <button type="button" className="home-tile" onClick={onBudget} disabled={!info}>
            <div><div className="home-ic">💰</div><b>budget tracker</b></div>
            <small>{budgetSub}</small>
          </button>
          {summit ? (
            <a className="home-tile wide" href={summit} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div><div className="home-ic">🌍</div><b>wealth summit</b></div>
              <small>Watch the recordings on YouTube</small>
            </a>
          ) : null}
        </div>

        {/* ---------------- locked tiles ---------------- */}
        <div className="home-sec">With IMARA</div>
        <div className="home-tiles">
          {[['🎓', 'tuesday class', 'Live classes'], ['📚', 'book reading', 'Chapter by chapter'], ['🤝', 'my team', 'Your mentor + circle'], ['🧰', 'toolkit', 'Tools and templates']].map(([ic, t, s]) => (
            <div key={t} className="home-tile off" style={{ position: 'relative', background: 'var(--surface-2)' }}>
              <span style={{ position: 'absolute', top: 10, right: 12, fontSize: 13 }}>🔒</span>
              <div><div className="home-ic">{ic}</div><b>{t}</b></div>
              <small>{s}</small>
            </div>
          ))}
        </div>

        <div className="home-foot">
          <button type="button" className="btn btn-soft btn-sm" onClick={onCheckAgain} disabled={busy} style={{ marginBottom: 10 }}>
            {busy ? 'Checking…' : "I've paid — check again"}
          </button>
          <div>© IMARA Wealth Trybe · Leading Ladies Foundation</div>
          <button type="button" className="btn-link" onClick={onSignOut} style={{ marginTop: 8 }}>Sign out</button>
        </div>
      </div>
    </div>
  )
}

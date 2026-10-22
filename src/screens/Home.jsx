import { CREED } from '../lib/constants'
import { money } from '../lib/format'

// "ada" / "ADA" / "mary jane" -> "Ada" / "Mary Jane"
export const properName = (s) =>
  String(s || '')
    .trim()
    .split(/(\s+|-)/)
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w))
    .join('')

const lagosNow = () => {
  const now = new Date()
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Lagos', hour: 'numeric', hour12: false }).format(now)) % 24
  const day = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Lagos', weekday: 'short', day: 'numeric', month: 'short' }).format(now)
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Lagos', weekday: 'long' }).format(now)
  return { hour, day: day.replace(',', ''), isTuesday: weekday === 'Tuesday' }
}

/**
 * The home page: a dashboard first (what she has saved and invested, where she
 * is in her book and whether today's reading is done), then the doors into the
 * rest of the app.
 *
 *   money    { currency, saved, invested, savingTarget, investingTarget,
 *              hasIncome, allSaved, allInvested }   (null while loading)
 *   reading  result of imara_home_reading           (null while loading)
 */
export default function Home({
  firstName, isMentor, dayOfMonth, daysInMonth, monthName, money: m, reading, renewal,
  onSelectBudget, onSelectReading, onSelectTeam, onSelectToolkit, onSelectTuesday, onContinueReading,
}) {
  const { hour, day, isTuesday } = lagosNow()
  const greeting = hour < 12 ? 'good morning' : hour < 17 ? 'good afternoon' : 'good evening'
  const name = properName(firstName)

  return (
    <div className="shell fade-in home">
      <style>{CSS}</style>

      <div className="home-hero">
        <span className="home-pill">{day}</span>
        <div className="home-eyebrow">Your home</div>
        <h1>{greeting},<br /><span className="home-name">{name}</span></h1>
        {dayOfMonth ? <p>Day {dayOfMonth} of {daysInMonth} · {monthName}</p> : null}
      </div>

      <div className="home-body">
        {/* ---------------- renewal reminder ---------------- */}
        {renewal && <RenewalNote renewal={renewal} />}

        {/* ---------------- saved + invested ---------------- */}
        <div className="home-card">
          <div className="home-lbl" style={{ marginBottom: 10 }}>This month so far</div>
          {!m ? (
            <p className="home-sub">One moment…</p>
          ) : (
            <>
              <div className="home-money">
                <MoneyCol
                  tone="sv" label="Saved" color="#2E7C5C" cur={m.currency}
                  amount={m.saved} target={m.savingTarget} hasIncome={m.hasIncome}
                  lineName="Saving" emptyHint="Log a Saving move to start"
                />
                <MoneyCol
                  tone="iv" label="Invested" color="#B2730A" cur={m.currency}
                  amount={m.invested} target={m.investingTarget} hasIncome={m.hasIncome}
                  lineName="Investing" emptyHint="Log an Investing move to start"
                />
              </div>
              <div className="home-total">
                <span>All months together</span>
                <b>{money(m.allSaved, m.currency)} saved · {money(m.allInvested, m.currency)} invested</b>
              </div>
            </>
          )}
        </div>

        {/* ---------------- reading ---------------- */}
        <ReadingCard reading={reading} onContinue={onContinueReading} onOpen={onSelectReading} />

        {/* ---------------- Tuesday banner ---------------- */}
        {isTuesday && onSelectTuesday && (
          <button type="button" className="home-live" onClick={onSelectTuesday}>
            <span>
              <b>class is live tonight</b>
              <small>IMARA Circle · Foundation Arc</small>
            </span>
            <span className="home-go">Join</span>
          </button>
        )}

        {/* ---------------- the doors ---------------- */}
        <div className="home-sec">Your spaces</div>
        <div className="home-tiles">
          <button type="button" className="home-tile" onClick={onSelectBudget}>
            <span className="home-ic">₦</span>
            <span><b>budget tracker</b><small>Your Gap, Split and thirty days</small></span>
          </button>
          <button type="button" className="home-tile" onClick={onSelectReading}>
            <span className="home-ic">📖</span>
            <span><b>book reading</b><small>Books, chapters and tests</small></span>
          </button>
          {onSelectToolkit && (
            <button type="button" className="home-tile" onClick={onSelectToolkit}>
              <span className="home-ic">🧰</span>
              <span><b>toolkit</b><small>{isMentor ? 'Folders and playlists' : 'Guides and playlists'}</small></span>
            </button>
          )}
          {onSelectTuesday && (
            <button
              type="button" className={`home-tile${isTuesday ? '' : ' off'}`}
              onClick={isTuesday ? onSelectTuesday : undefined} disabled={!isTuesday}
            >
              <span className="home-ic">🎥</span>
              <span><b>tuesday class</b><small>{isTuesday ? "Join tonight's class" : 'Opens on Tuesdays'}</small></span>
            </button>
          )}
          {isMentor && (
            <button type="button" className="home-tile wide" onClick={onSelectTeam}>
              <span className="home-ic">👥</span>
              <span><b>my team</b><small>File this month's report</small></span>
            </button>
          )}
        </div>

        <div className="home-foot">
          <p className="creed">{CREED}</p>
          © IMARA Wealth Trybe · Leading Ladies Foundation
        </div>
      </div>
    </div>
  )
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
function RenewalNote({ renewal }) {
  const [y, m, d] = String(renewal.paid_until).slice(0, 10).split('-')
  const when = `${Number(d)} ${MONTHS[Number(m) - 1]}`
  const left = renewal.daysLeft
  const link = typeof renewal.link === 'string' && renewal.link.startsWith('https://') ? renewal.link : null
  return (
    <div className="home-renew">
      <div>
        <b>{left <= 1 ? 'your access ends tomorrow' : `your access ends in ${left} days`}</b>
        <small>
          Renew before {when} to get December free.
          {!link && !renewal.is_mentor && (renewal.mentor_name
            ? ` Your mentor ${renewal.mentor_name} will send you your payment link.`
            : '')}
        </small>
      </div>
      {link && <a className="home-go" href={link} target="_blank" rel="noopener noreferrer">Renew</a>}
    </div>
  )
}

function MoneyCol({ tone, label, color, cur, amount, target, hasIncome, lineName, emptyHint }) {
  const pct = target > 0 ? Math.min(100, Math.round((amount / target) * 100)) : 0
  return (
    <div className={tone}>
      <div className="home-lbl" style={{ color }}>{label}</div>
      <div className="home-amt">{money(amount, cur)}</div>
      <div className="home-bar"><i style={{ width: `${pct}%` }} /></div>
      <div className="home-sub">
        {amount <= 0 ? emptyHint : hasIncome && target > 0 ? `${pct}% of your ${lineName} line` : `Moved into ${lineName}`}
      </div>
    </div>
  )
}

function ReadingCard({ reading, onContinue, onOpen }) {
  if (!reading) {
    return (
      <div className="home-card">
        <div className="home-lbl">Reading now</div>
        <p className="home-sub" style={{ marginTop: 8 }}>One moment…</p>
      </div>
    )
  }

  if (!reading.has_book) {
    return (
      <div className="home-card">
        <div className="home-lbl">Reading now</div>
        <div className="home-book">{reading.finished_any ? 'pick your next book' : 'pick your first book'}</div>
        <p className="home-sub">
          {reading.finished_any ? 'You finished your last one. Well done.' : 'A chapter a day adds up faster than you think.'}
        </p>
        <button type="button" className="home-btn" onClick={onOpen}>
          {reading.finished_any ? 'Choose a book' : 'Start reading'}
        </button>
      </div>
    )
  }

  const pct = reading.total_chapters > 0 ? Math.round((reading.chapters_done / reading.total_chapters) * 100) : 0
  const goal = Math.max(1, reading.daily_goal || 1)
  const doneToday = Math.min(goal, reading.passed_today || 0)
  const goalMet = doneToday >= goal
  const left = goal - doneToday

  return (
    <div className="home-card">
      <div className="home-read-top">
        <div>
          <div className="home-lbl">Reading now</div>
          <div className="home-book">{reading.title}</div>
          <div className="home-sub">Chapter {reading.current_chapter} of {reading.total_chapters}</div>
        </div>
        <div className="home-ring" style={{ '--p': pct }}><span>{pct}%</span></div>
      </div>

      <div className="home-today">
        <div className="home-dots">
          {Array.from({ length: goal }, (_, i) => (
            <div key={i} className={`home-dot${i < doneToday ? ' on' : ''}`}>{i < doneToday ? '✓' : ''}</div>
          ))}
        </div>
        <div>
          <b>{goalMet ? "Today's reading done" : `${doneToday} of ${goal} chapter${goal === 1 ? '' : 's'} today`}</b>
          <small>
            {goalMet
              ? `${goal} chapter${goal === 1 ? '' : 's'} a day · see you tomorrow`
              : doneToday === 0
                ? `${goal} chapter${goal === 1 ? '' : 's'} a day for this book`
                : `${left} more to hit today's goal`}
          </small>
        </div>
      </div>

      <button
        type="button" className={`home-btn${goalMet ? ' soft' : ''}`}
        onClick={() => onContinue(reading)}
      >
        {goalMet ? `Read ahead · chapter ${reading.current_chapter}` : `Continue chapter ${reading.current_chapter}`}
      </button>
    </div>
  )
}

const CSS = `
.home{--hg:#59BA8E;--hgold:#DD8E0D}
.home-hero{background:var(--maroon-900);color:#fff;padding:24px 20px 72px}
.home-eyebrow{font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;font-weight:700;color:var(--peach);margin-top:2px}
.home-hero h1{font-family:var(--font-display);font-weight:600;font-size:34px;text-transform:lowercase;line-height:1.08;margin-top:6px}
.home-hero h1 .home-name{text-transform:none}
.home-hero p{font-size:12.5px;color:rgba(255,226,204,.68);margin-top:6px}
.home-pill{float:right;background:rgba(255,226,204,.14);color:var(--cream);font-size:11.5px;font-weight:600;padding:6px 11px;border-radius:99px}
.home-body{padding:0 16px 24px;margin-top:-54px}
.home-body>*+*{margin-top:12px}
.home-card{background:var(--surface);border-radius:20px;box-shadow:var(--shadow);padding:16px}
.home-lbl{font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;font-weight:700;color:var(--text-soft)}
.home-money{display:grid;grid-template-columns:1fr 1fr}
.home-money>div{padding:2px 4px;min-width:0}
.home-money>div+div{border-left:1px solid var(--line);padding-left:16px}
.home-amt{font-family:var(--font-display);font-size:24px;font-weight:600;margin:5px 0 7px;letter-spacing:-.01em;overflow-wrap:anywhere}
.home-bar{height:6px;border-radius:9px;background:var(--surface-2);overflow:hidden}
.home-bar i{display:block;height:100%;border-radius:9px}
.sv .home-bar i{background:var(--hg)}.iv .home-bar i{background:var(--hgold)}
.home-sub{font-size:11px;color:var(--text-soft);margin-top:6px;line-height:1.5}
.home-total{border-top:1px solid var(--line);margin-top:13px;padding-top:11px;font-size:12px;color:var(--text-soft);display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap}
.home-total b{color:var(--text);font-weight:700}
.home-read-top{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}
.home-book{font-family:var(--font-display);font-size:20px;font-weight:600;line-height:1.15;margin-top:5px}
.home-ring{width:54px;height:54px;border-radius:50%;background:conic-gradient(var(--clay) calc(var(--p)*1%),var(--surface-2) 0);display:grid;place-items:center;flex:none}
.home-ring span{width:42px;height:42px;border-radius:50%;background:#fff;display:grid;place-items:center;font-size:12px;font-weight:700}
.home-today{margin-top:13px;background:var(--surface-2);border-radius:14px;padding:11px 13px;display:flex;align-items:center;gap:11px}
.home-dots{display:flex;gap:6px}
.home-dot{width:22px;height:22px;border-radius:50%;border:2px solid var(--peach);display:grid;place-items:center;font-size:12px;color:#fff;font-weight:700}
.home-dot.on{background:var(--hg);border-color:var(--hg)}
.home-today b{font-size:13px;display:block}
.home-today small{font-size:11.5px;color:var(--text-soft)}
.home-btn{display:block;width:100%;margin-top:13px;background:var(--maroon-900);color:#fff;border:0;border-radius:13px;padding:12px;font-weight:600;font-size:13.5px;text-align:center;cursor:pointer}
.home-btn.soft{background:var(--surface-2);color:var(--maroon-900)}
.home-live{width:100%;border:0;cursor:pointer;text-align:left;background:linear-gradient(120deg,var(--clay),var(--wine));color:#fff;border-radius:18px;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;gap:10px}
.home-live b{font-family:var(--font-display);font-size:17px;text-transform:lowercase;display:block}
.home-live small{font-size:11.5px;opacity:.86}
.home-go{background:#fff;color:var(--wine);font-weight:700;font-size:12.5px;padding:8px 13px;border-radius:11px;white-space:nowrap}
.home-renew{display:flex;align-items:center;justify-content:space-between;gap:10px;background:var(--cream);border:1px solid var(--peach);border-radius:16px;padding:12px 14px}
.home-renew b{font-family:var(--font-display);font-size:15.5px;text-transform:lowercase;display:block;color:var(--maroon-900)}
.home-renew small{font-size:11.5px;color:var(--text-soft);line-height:1.5;display:block;margin-top:2px}
.home-renew .home-go{background:var(--maroon-900);color:#fff;text-decoration:none}
.home-sec{font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;font-weight:700;color:var(--text-soft);margin:22px 2px 10px}
.home-tiles{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:0!important}
.home-tile{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:14px;min-height:98px;display:flex;flex-direction:column;justify-content:space-between;text-align:left;cursor:pointer}
.home-tile.wide{grid-column:span 2}
.home-tile.off{opacity:.5;cursor:default}
.home-ic{width:34px;height:34px;border-radius:11px;display:grid;place-items:center;font-size:16px;background:var(--surface-2)}
.home-tile b{font-family:var(--font-display);font-size:16px;text-transform:lowercase;display:block;margin-top:9px}
.home-tile small{font-size:11px;color:var(--text-soft);line-height:1.4;display:block}
.home-foot{text-align:center;font-size:10.5px;color:var(--text-faint);padding:10px 0 0;line-height:1.7}
.home-foot .creed{margin-bottom:6px}
`

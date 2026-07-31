import { useEffect, useMemo, useState } from 'react'
import { rpc } from '../lib/supabase'
import { cohort } from '../lib/calc'
import { ARCHETYPES } from '../lib/constants'
import { money, moneyShort, pct, shortDate } from '../lib/format'
import EntryList from '../components/EntryList'

const KEY = 'imara_admin_pw'

export default function Admin() {
  const [password, setPassword] = useState(() => sessionStorage.getItem(KEY) || '')
  const [authed, setAuthed] = useState(false)
  const [data, setData] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = async (pw) => {
    setBusy(true); setError('')
    try {
      const payload = await rpc('imara_admin_dashboard', { p_password: pw })
      sessionStorage.setItem(KEY, pw)
      setData(payload); setAuthed(true)
    } catch (e) {
      setError(e.message); setAuthed(false); sessionStorage.removeItem(KEY)
    } finally { setBusy(false) }
  }

  // Silently resume if the password is still in this tab's session.
  useEffect(() => {
    const saved = sessionStorage.getItem(KEY)
    if (saved) load(saved)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!authed) {
    return (
      <div className="login-wrap">
        <div className="login-card">
          <div className="eyebrow">IMARA Admin</div>
          <h1 className="display d-lg" style={{ margin: '10px 0 8px' }}>the team view</h1>
          <p className="small muted" style={{ marginBottom: 22, lineHeight: 1.7 }}>
            Everything behind this password belongs to a woman who trusted us with it.
            We look so we can walk with her — not to grade her.
          </p>
          <form onSubmit={(e) => { e.preventDefault(); load(password) }} className="stack">
            <div className="field">
              <label className="label">Shared team password</label>
              <input
                className="input" type="password" value={password} autoFocus
                onChange={(e) => { setPassword(e.target.value); setError('') }}
              />
            </div>
            {error && <div className="error-note">{error}</div>}
            <button className="btn btn-primary" disabled={busy || !password}>
              {busy ? 'Checking…' : 'Open the console'}
            </button>
          </form>
          <p className="tiny faint center" style={{ marginTop: 20 }}>
            © IMARA Wealth Trybe · Leading Ladies Foundation
          </p>
        </div>
      </div>
    )
  }

  return <Console data={data} onRefresh={() => load(password)} busy={busy} onLock={() => {
    sessionStorage.removeItem(KEY); setAuthed(false); setPassword(''); setData(null)
  }} />
}

// ---------------------------------------------------------------------------

function Console({ data, onRefresh, busy, onLock }) {
  const [query, setQuery] = useState('')
  const [archFilter, setArchFilter] = useState('all')
  const [openId, setOpenId] = useState(null)

  const c = useMemo(() => cohort(data), [data])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return c.snapshots.filter((s) => {
      if (archFilter !== 'all' && (s.woman.archetype || 'unassigned') !== archFilter) return false
      if (!q) return true
      return [s.woman.first_name, s.woman.phone, s.woman.email]
        .filter(Boolean).some((v) => String(v).toLowerCase().includes(q))
    })
  }, [c.snapshots, query, archFilter])

  const open = c.snapshots.find((s) => s.woman.id === openId)

  return (
    <>
      <div className="admin-bar">
        <div className="admin-bar-inner">
          <div>
            <div className="eyebrow" style={{ color: 'var(--peach)' }}>IMARA Admin · The Map</div>
            <h1 className="display d-md" style={{ marginTop: 4 }}>the trybe at a glance</h1>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn-sm btn-soft" onClick={onRefresh} disabled={busy}>
              {busy ? 'Refreshing…' : 'Refresh'}
            </button>
            <button className="btn btn-sm btn-soft" onClick={onLock}>Lock</button>
          </div>
        </div>
      </div>

      <div className="admin">
        {/* ---- Headline metrics ---- */}
        <div className="metrics">
          <Metric k="Women tracking" v={c.activeWomen} s={`${c.totalWomen} signed up in total`} tone="ink" />
          <Metric k="Logging consistency" v={pct(c.consistency)} s="Share of days logged, cohort average" tone={c.consistency >= 0.6 ? 'good' : 'warn'} />
          <Metric
            k="Average Gap" v={moneyShort(c.avgGap, c.currency)}
            s={c.mixedCurrency
              ? `${pct(c.surplusShare)} in surplus · mixed currencies, read with care`
              : `${pct(c.surplusShare)} of women in surplus`}
            tone={c.avgGap >= 0 ? 'good' : 'warn'}
          />
          <Metric k="Hitting the Split" v={pct(c.onTrackShare)} s="3 or more of the 5 lines landing" tone={c.onTrackShare >= 0.5 ? 'good' : 'warn'} />
          <Metric k="Worth reaching out to" v={c.needsSupport.length} s="Quiet, or running a shortfall" tone="warn" />
        </div>

        <div className="grid-2" style={{ marginTop: 16 }}>
          {/* ---- Gap trend ---- */}
          <div className="panel">
            <div className="section-head" style={{ marginTop: 0 }}>
              <span className="eyebrow">Average Gap, month over month</span>
            </div>
            {c.gapTrend.length ? (
              <>
                <div className="trend">
                  {c.gapTrend.map((g) => {
                    const max = Math.max(...c.gapTrend.map((x) => Math.abs(x.avgGap)), 1)
                    const h = Math.max(4, (Math.abs(g.avgGap) / max) * 100)
                    return (
                      <div className="trend-col" key={g.month}>
                        <span className="trend-val" style={{ color: g.avgGap >= 0 ? '#2E7C5C' : 'var(--clay)' }}>
                          {moneyShort(g.avgGap, c.currency)}
                        </span>
                        <div className={`trend-bar ${g.avgGap >= 0 ? 'trend-pos' : 'trend-neg'}`} style={{ height: `${h}%` }} />
                        <span className="trend-lbl">Month {g.month}</span>
                        <span className="trend-lbl faint">{g.women} {g.women === 1 ? 'woman' : 'women'}</span>
                      </div>
                    )
                  })}
                </div>
                <p className="tiny muted" style={{ marginTop: 14, lineHeight: 1.6 }}>
                  Each bar is the average Gap across every woman in her Nth month of tracking.
                  Rising bars mean the cohort is closing its gap over time.
                </p>
              </>
            ) : <p className="small muted">No months with logged money yet.</p>}
          </div>

          {/* ---- Split lines ---- */}
          <div className="panel">
            <div className="section-head" style={{ marginTop: 0 }}>
              <span className="eyebrow">Which split lines are landing</span>
            </div>
            <div className="stack" style={{ gap: 13 }}>
              {c.lineHits.map((l) => (
                <div key={l.key}>
                  <div className="row-between" style={{ marginBottom: 5 }}>
                    <span className="small" style={{ fontWeight: 600 }}>
                      {l.label} <span className="split-pct">{Math.round(l.pct * 100)}%</span>
                    </span>
                    <span className="small numeric muted">{pct(l.share)} · {l.hits}/{l.of}</span>
                  </div>
                  <div className={`bar bar-${l.key}`}><span style={{ width: `${Math.min(100, l.share * 100)}%` }} /></div>
                </div>
              ))}
            </div>
            <p className="tiny muted" style={{ marginTop: 14, lineHeight: 1.6 }}>
              A line counts as landing when she has reached 80% of its target — except Living,
              which lands when she has stayed at or under her 60%.
            </p>
          </div>
        </div>

        {/* ---- By archetype ---- */}
        <div className="panel" style={{ marginTop: 16 }}>
          <div className="section-head" style={{ marginTop: 0 }}>
            <span className="eyebrow">By archetype</span>
          </div>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Archetype</th><th className="num">Women</th><th className="num">Consistency</th>
                  <th className="num">Average Gap</th><th className="num">In surplus</th><th className="num">Hitting split</th>
                </tr>
              </thead>
              <tbody>
                {c.byArchetype.map((a) => {
                  const meta = ARCHETYPES[a.key]
                  return (
                    <tr key={a.key} onClick={() => setArchFilter(a.key)}>
                      <td>
                        <span className={`tag tag-${a.key}`}>{meta ? `${meta.name} · ${meta.title}` : 'Not yet chosen'}</span>
                      </td>
                      <td className="num">{a.count}</td>
                      <td className="num">{pct(a.consistency)}</td>
                      <td className="num" style={{ color: a.avgGap >= 0 ? '#2E7C5C' : 'var(--clay)', fontWeight: 600 }}>
                        {moneyShort(a.avgGap, c.currency)}
                      </td>
                      <td className="num">{pct(a.surplusShare)}</td>
                      <td className="num">{pct(a.onTrackShare)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ---- Every woman ---- */}
        <div className="panel" style={{ marginTop: 16 }}>
          <div className="row-between" style={{ marginBottom: 14, flexWrap: 'wrap' }}>
            <span className="eyebrow">Every woman · {rows.length} shown</span>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <input
                className="input" style={{ width: 250, padding: '10px 14px', fontSize: 14 }}
                placeholder="Search name, phone or email"
                value={query} onChange={(e) => setQuery(e.target.value)}
              />
              <select
                className="select" style={{ width: 190, padding: '10px 36px 10px 14px', fontSize: 14 }}
                value={archFilter} onChange={(e) => setArchFilter(e.target.value)}
              >
                <option value="all">All archetypes</option>
                {Object.values(ARCHETYPES).map((a) => <option key={a.key} value={a.key}>{a.name} · {a.title}</option>)}
                <option value="unassigned">Not yet chosen</option>
              </select>
            </div>
          </div>

          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Name</th><th>Contact</th><th>Archetype</th><th>Month</th>
                  <th style={{ minWidth: 130 }}>Consistency</th>
                  <th className="num">In</th><th className="num">Out</th><th className="num">Gap</th>
                  <th className="num">Split</th><th>Last logged</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.woman.id} onClick={() => setOpenId(s.woman.id)}>
                    <td style={{ fontWeight: 600 }}>{s.woman.first_name}</td>
                    <td className="tiny muted">
                      {s.woman.phone}<br />{s.woman.email}
                    </td>
                    <td>
                      <span className={`tag tag-${s.woman.archetype || 'unassigned'}`}>
                        {s.woman.archetype ? ARCHETYPES[s.woman.archetype].name : 'Not chosen'}
                      </span>
                    </td>
                    <td className="tiny">
                      {s.period ? <>#{s.period.period_number}<br /><span className="muted">{s.period.status}</span></> : '—'}
                    </td>
                    <td>
                      <div className="row" style={{ gap: 8 }}>
                        <div className="mini-bar"><span style={{ width: `${Math.min(100, s.consistency * 100)}%` }} /></div>
                        <span className="tiny numeric muted">{s.daysLogged}/{s.daysElapsed}</span>
                      </div>
                    </td>
                    <td className="num">{moneyShort(s.totals.moneyIn, s.woman.currency)}</td>
                    <td className="num">{moneyShort(s.totals.moneyOut, s.woman.currency)}</td>
                    <td className="num" style={{ fontWeight: 700, color: s.totals.gap >= 0 ? '#2E7C5C' : 'var(--clay)' }}>
                      {moneyShort(s.totals.gap, s.woman.currency)}
                    </td>
                    <td className="num">
                      <span className={`tag ${s.split.onTrack ? 'tag-good' : 'tag-warn'}`}>{s.split.linesOnMap}/5</span>
                    </td>
                    <td className="tiny muted">{s.lastLogged ? shortDate(s.lastLogged) : 'Never'}</td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr><td colSpan={10} className="center muted" style={{ padding: 30 }}>No one matches that search.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ---- Reach out ---- */}
        {c.needsSupport.length > 0 && (
          <div className="panel" style={{ marginTop: 16 }}>
            <div className="section-head" style={{ marginTop: 0 }}>
              <span className="eyebrow">Worth a message this week</span>
            </div>
            <p className="small muted" style={{ marginBottom: 14, lineHeight: 1.65 }}>
              These women have either gone quiet for a stretch, or their numbers are showing a
              shortfall. Not a list of who is failing — a list of who to check in on.
            </p>
            <div className="stack" style={{ gap: 8 }}>
              {c.needsSupport.map((s) => (
                <div className="history-row" key={s.woman.id} onClick={() => setOpenId(s.woman.id)} style={{ cursor: 'pointer' }}>
                  <div>
                    <div className="small" style={{ fontWeight: 600 }}>
                      {s.woman.first_name}
                      {s.woman.archetype && (
                        <span className={`tag tag-${s.woman.archetype}`} style={{ marginLeft: 8 }}>
                          {ARCHETYPES[s.woman.archetype].name}
                        </span>
                      )}
                    </div>
                    <div className="tiny muted">
                      {s.woman.phone} · logged {s.daysLogged} of {s.daysElapsed} days
                      {s.totals.gap < 0 && ` · shortfall of ${money(Math.abs(s.totals.gap), s.woman.currency)}`}
                    </div>
                  </div>
                  <span className="tiny" style={{ color: 'var(--clay)', fontWeight: 600 }}>Open →</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="tiny faint center" style={{ marginTop: 30 }}>
          © IMARA Wealth Trybe · Leading Ladies Foundation · the map is not the judgment, it's the way out.
        </p>
      </div>

      {open && <Drilldown s={open} onClose={() => setOpenId(null)} />}
    </>
  )
}

function Metric({ k, v, s, tone }) {
  return (
    <div className="metric">
      <div className="k">{k}</div>
      <div className={`v v-${tone || 'ink'}`}>{v}</div>
      <div className="s">{s}</div>
    </div>
  )
}

// ---------------------------------------------------------------------------

function Drilldown({ s, onClose }) {
  const cur = s.woman.currency || '₦'
  const arch = ARCHETYPES[s.woman.archetype]

  return (
    <div className="drill" onClick={onClose}>
      <div className="drill-panel" onClick={(e) => e.stopPropagation()}>
        <div className="drill-head">
          <div className="row-between" style={{ alignItems: 'flex-start' }}>
            <div>
              <div className="eyebrow" style={{ color: 'var(--peach)' }}>
                {arch ? `${arch.name} · ${arch.title}` : 'Archetype not yet chosen'}
              </div>
              <h2 className="display d-lg" style={{ marginTop: 6 }}>{s.woman.first_name.toLowerCase()}</h2>
              <p className="tiny" style={{ color: 'rgba(255,226,204,0.7)', marginTop: 6 }}>
                {s.woman.phone} · {s.woman.email} · joined {shortDate(s.woman.created_at?.slice(0, 10))}
              </p>
            </div>
            <button className="btn btn-sm btn-soft" onClick={onClose}>Close</button>
          </div>
          {arch && (
            <p style={{ fontSize: 13, color: 'var(--blush)', fontStyle: 'italic', marginTop: 14 }}>
              "{arch.mantra}"
            </p>
          )}
        </div>

        <div className="drill-body">
          <div className="metrics">
            <Metric k="Money in" v={money(s.totals.moneyIn, cur)} s="This month" tone="ink" />
            <Metric k="Money out" v={money(s.totals.moneyOut, cur)} s="This month" tone="ink" />
            <Metric
              k="The Gap" v={`${s.totals.gap >= 0 ? '+' : '−'}${money(Math.abs(s.totals.gap), cur)}`}
              s={s.totals.gap >= 0 ? 'Surplus' : 'Shortfall'} tone={s.totals.gap >= 0 ? 'good' : 'warn'}
            />
            <Metric k="Consistency" v={pct(s.consistency)} s={`${s.daysLogged} of ${s.daysElapsed} days`} tone={s.consistency >= 0.6 ? 'good' : 'warn'} />
          </div>

          {/* Split performance */}
          <div className="section">
            <div className="section-head"><span className="eyebrow">Her split this month</span></div>
            <div className="card">
              {s.split.moneyIn > 0 ? s.split.lines.map((l) => (
                <div key={l.key} style={{ padding: '8px 0' }}>
                  <div className="row-between" style={{ marginBottom: 5 }}>
                    <span className="small" style={{ fontWeight: 600 }}>
                      {l.label} <span className="split-pct">{Math.round(l.pct * 100)}%</span>
                      {l.kind === 'build' && <span className="tag tag-unassigned" style={{ marginLeft: 6 }}>moved, not spent</span>}
                    </span>
                    <span className="small numeric muted">
                      <b style={{ color: 'var(--text)' }}>{money(l.actual, cur)}</b> / {money(l.target, cur)}
                      {l.onMap && <span className="tag tag-good" style={{ marginLeft: 8 }}>landed</span>}
                    </span>
                  </div>
                  <div className={`bar bar-${l.key}`}><span style={{ width: `${Math.min(100, l.progress * 100)}%` }} /></div>
                </div>
              )) : <p className="small muted">No income logged this month yet.</p>}
            </div>
          </div>

          {/* Gap history */}
          {s.gapHistory.length > 0 && (
            <div className="section">
              <div className="section-head"><span className="eyebrow">Her Gap, month by month</span></div>
              <div className="stack" style={{ gap: 8 }}>
                {s.gapHistory.map((h) => (
                  <div className="history-row" key={h.period.id}>
                    <div>
                      <div className="small" style={{ fontWeight: 600 }}>
                        Month {h.period.period_number}
                        <span className={`tag ${h.period.status === 'active' ? 'tag-good' : 'tag-unassigned'}`} style={{ marginLeft: 8 }}>
                          {h.period.status}
                        </span>
                      </div>
                      <div className="tiny muted">
                        {shortDate(h.period.start_date)} — {shortDate(h.period.end_date)} ·
                        in {money(h.moneyIn, cur)} · out {money(h.moneyOut, cur)}
                      </div>
                      {h.period.realisation && (
                        <div className="tiny" style={{ color: 'var(--clay)', fontStyle: 'italic', marginTop: 4 }}>
                          "{h.period.realisation}"
                        </div>
                      )}
                    </div>
                    <span className="numeric small" style={{ fontWeight: 700, color: h.gap >= 0 ? '#2E7C5C' : 'var(--clay)' }}>
                      {h.gap >= 0 ? '+' : '−'}{money(Math.abs(h.gap), cur)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Day by day */}
          <div className="section">
            <div className="section-head"><span className="eyebrow">Her log, day by day</span></div>
            <div className="card">
              <EntryList entries={s.currentEntries} currency={cur} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

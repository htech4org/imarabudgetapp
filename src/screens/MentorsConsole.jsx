import { useEffect, useState } from 'react'

const MONTH_NAMES = ['January','February','March','April','May','June','July','August',
  'September','October','November','December']

function monthLabel(iso) {
  if (!iso) return ''
  const [y, m] = iso.split('-')
  return `${MONTH_NAMES[Number(m) - 1]} ${y}`
}

function thisMonthIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

// Admin's "Mentors" tab: three sub-views —
//   Mentors   — flag/unflag women as mentors
//   Team      — assign each woman to one of the flagged mentors
//   Overview  — this month's report status across every assigned woman
//
// All data comes in as props (loaded/refreshed by the parent via the
// imara_admin_* RPCs) and every action calls back up to the parent, which
// owns the admin password and re-fetches after each write. This component
// holds no password and makes no network calls itself.
export default function MentorsConsole({
  busy,
  mentors,        // [{ mentor_id, first_name, phone, email, team_size }]
  women,          // [{ woman_id, first_name, phone, email, mentor_id, mentor_name }]
  overview,       // { month, rows: [...] } | null
  onRefreshAll,
  onSetMentor,        // (womanId, isMentor) => Promise
  onAssignMentor,     // (womanId, mentorId|null) => Promise
  onLoadOverview,     // (monthIso) => Promise
}) {
  const [tab, setTab] = useState('mentors')
  const [query, setQuery] = useState('')
  const [month, setMonth] = useState(overview?.month || thisMonthIso())
  const [error, setError] = useState('')

  useEffect(() => { onRefreshAll?.() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const runAction = async (fn) => {
    setError('')
    try { await fn() } catch (e) { setError(e.message) }
  }

  const filteredWomen = women.filter((w) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return (w.first_name || '').toLowerCase().includes(q)
      || (w.phone || '').includes(q)
      || (w.email || '').toLowerCase().includes(q)
  })

  return (
    <div className="stack" style={{ gap: 18 }}>
      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        <button className={`btn-sm ${tab === 'mentors' ? 'btn-primary' : 'btn-soft'}`} onClick={() => setTab('mentors')}>
          Mentors ({mentors.length})
        </button>
        <button className={`btn-sm ${tab === 'team' ? 'btn-primary' : 'btn-soft'}`} onClick={() => setTab('team')}>
          Assign teams
        </button>
        <button className={`btn-sm ${tab === 'rosters' ? 'btn-primary' : 'btn-soft'}`} onClick={() => setTab('rosters')}>
          Rosters
        </button>
        <button className={`btn-sm ${tab === 'overview' ? 'btn-primary' : 'btn-soft'}`} onClick={() => setTab('overview')}>
          This month
        </button>
      </div>

      {error && <div className="error-note">{error}</div>}

      {tab === 'mentors' && (
        <div className="stack-s">
          <p className="tiny muted">
            Flag which women are mentors. Unflagging someone also clears her whole team's
            assignment to her, so nobody silently reports to a mentor who can no longer see it.
          </p>
          <div className="field">
            <input
              className="input" placeholder="Search by name, phone or email"
              value={query} onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="stack" style={{ gap: 8 }}>
            {filteredWomen.map((w) => (
              <div className="card" key={w.woman_id}>
                <div className="row-between">
                  <div>
                    <span className="small" style={{ fontWeight: 700 }}>{w.first_name}</span>
                    <p className="tiny muted">{w.phone || w.email || '—'}</p>
                  </div>
                  <button
                    className={`btn btn-sm ${w.is_mentor ? 'btn-clay' : 'btn-soft'}`}
                    disabled={busy}
                    onClick={() => runAction(() => onSetMentor(w.woman_id, !w.is_mentor))}
                  >
                    {w.is_mentor ? 'Mentor · remove' : 'Make mentor'}
                  </button>
                </div>
              </div>
            ))}
            {filteredWomen.length === 0 && <p className="small muted">No matches.</p>}
          </div>
        </div>
      )}

      {tab === 'team' && (
        <div className="stack-s">
          <p className="tiny muted">
            Assign each woman to the mentor running her Imara Circle or mastermind group.
            This is filled in by hand for now — it will follow the real Selar affiliate list
            once that export is wired in.
          </p>
          <div className="field">
            <input
              className="input" placeholder="Search by name, phone or email"
              value={query} onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="stack" style={{ gap: 8 }}>
            {filteredWomen.map((w) => (
              <div className="card" key={w.woman_id}>
                <div className="row-between" style={{ alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <span className="small" style={{ fontWeight: 700 }}>{w.first_name}</span>
                    <p className="tiny muted">{w.phone || w.email || '—'}</p>
                  </div>
                  <select
                    className="input" style={{ maxWidth: 220 }}
                    disabled={busy}
                    value={w.mentor_id || ''}
                    onChange={(e) => runAction(() => onAssignMentor(w.woman_id, e.target.value || null))}
                  >
                    <option value="">— No mentor —</option>
                    {mentors
                      .filter((m) => m.mentor_id !== w.woman_id)
                      .map((m) => (
                        <option key={m.mentor_id} value={m.mentor_id}>{m.first_name}</option>
                      ))}
                  </select>
                </div>
              </div>
            ))}
            {filteredWomen.length === 0 && <p className="small muted">No matches.</p>}
          </div>
        </div>
      )}

      {tab === 'rosters' && (
        <div className="stack" style={{ gap: 12 }}>
          <p className="tiny muted">
            Every mentor, with who's currently on her team.
          </p>
          {mentors.length === 0 ? (
            <div className="empty-state">
              <p className="small muted">No one is flagged as a mentor yet — start on the Mentors tab.</p>
            </div>
          ) : (
            mentors.map((m) => {
              const team = women.filter((w) => w.mentor_id === m.mentor_id)
              return (
                <div className="card" key={m.mentor_id}>
                  <div className="row-between">
                    <span className="small" style={{ fontWeight: 700 }}>{m.first_name}</span>
                    <span className="tag tag-good">{team.length} on team</span>
                  </div>
                  {team.length === 0 ? (
                    <p className="tiny muted" style={{ marginTop: 8 }}>No one assigned to her yet.</p>
                  ) : (
                    <div className="stack-s" style={{ marginTop: 10 }}>
                      {team.map((w) => (
                        <div className="row-between" key={w.woman_id}>
                          <span className="small">{w.first_name}</span>
                          <span className="tiny muted">{w.phone || w.email || '—'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}

      {tab === 'overview' && (
        <div className="stack-s">
          <div className="row" style={{ gap: 8, alignItems: 'center' }}>
            <span className="tiny muted">Reporting for</span>
            <span className="small" style={{ fontWeight: 700 }}>{monthLabel(overview?.month || month)}</span>
            <button className="btn-link" disabled={busy} onClick={() => runAction(() => onLoadOverview(month))}>
              Refresh
            </button>
          </div>

          {!overview ? (
            <p className="small muted">Loading…</p>
          ) : overview.rows.length === 0 ? (
            <div className="empty-state">
              <p className="small muted">No woman has an assigned mentor yet.</p>
            </div>
          ) : (
            <div className="stack" style={{ gap: 8 }}>
              {overview.rows.map((r) => (
                <div className="card" key={r.woman_id}>
                  <div className="row-between">
                    <span className="small" style={{ fontWeight: 700 }}>{r.first_name}</span>
                    <span className="tiny muted">mentor: {r.mentor_name}</span>
                  </div>
                  <div className="row" style={{ gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                    <span className={`tag ${r.reported_at ? 'tag-good' : 'tag-unassigned'}`}>
                      {r.reported_at ? 'Attendance filed' : 'Not filed yet'}
                    </span>
                    <span className={`tag ${r.attended_circle ? 'tag-good' : 'tag-unassigned'}`}>
                      {r.attended_circle ? 'Circle ✓' : 'Circle —'}
                    </span>
                    <span className={`tag ${r.attended_sisters_connect ? 'tag-good' : 'tag-unassigned'}`}>
                      {r.attended_sisters_connect ? 'Sisters Connect ✓' : 'Sisters Connect —'}
                    </span>
                    <span className={`tag ${r.read_this_month ? 'tag-good' : 'tag-unassigned'}`}>
                      {r.read_this_month ? 'Read ✓' : 'No reading'}
                    </span>
                    <span className={`tag ${r.invested_this_month ? 'tag-good' : 'tag-unassigned'}`}>
                      {r.invested_this_month ? 'Invested ✓' : 'Not invested'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

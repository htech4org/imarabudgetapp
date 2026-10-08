import { useEffect, useMemo, useState } from 'react'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function fmt(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`
}

const LINK_FIELDS = [
  { key: 'mentor_payment_link',  label: 'Mentor payment link (Selar)' },
  { key: 'imara_toolkit_link',   label: 'IMARA Toolkit (Drive folder)' },
  { key: 'mentors_toolkit_link', label: 'Mentors Toolkit (Drive folder)' },
]

// Needs-attention first: expired, then pending, then active, then exempt.
const ORDER = { expired: 0, pending: 1, active: 2, exempt: 3, none: 4 }

// Admin's "Access" tab. Pure presentation: all data comes in as props and
// every action calls back to the parent, which owns the admin password and
// re-fetches after each write.
export default function AccessConsole({
  busy,
  data,              // { enforcement, today, links, rows }
  onRefresh,
  onMarkPaid,        // (womanIds[], days) => Promise
  onSetPaidUntil,    // (womanId, isoDate|null) => Promise
  onSetExempt,       // (womanId, bool) => Promise
  onSetEnforcement,  // (bool) => Promise
  onSetLink,         // (key, value) => Promise
}) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('needs')   // 'needs' | 'all' | 'active' | 'exempt'
  const [selected, setSelected] = useState(() => new Set())
  const [linkDraft, setLinkDraft] = useState({})
  const [error, setError] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => { onRefresh?.() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (data?.links) setLinkDraft(data.links)
  }, [data?.links?.mentor_payment_link, data?.links?.imara_toolkit_link, data?.links?.mentors_toolkit_link]) // eslint-disable-line react-hooks/exhaustive-deps

  const runAction = async (fn, okNote) => {
    setError(''); setNote('')
    try { await fn(); if (okNote) setNote(okNote) } catch (e) { setError(e.message) }
  }

  const rows = data?.rows || []
  const on = data?.enforcement === 'on'

  const counts = useMemo(() => {
    const c = { active: 0, exempt: 0, expired: 0, pending: 0 }
    rows.forEach((r) => { if (c[r.status] !== undefined) c[r.status] += 1 })
    return c
  }, [rows])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows
      .filter((r) => {
        if (filter === 'needs' && !(r.status === 'expired' || r.status === 'pending')) return false
        if (filter === 'active' && r.status !== 'active') return false
        if (filter === 'exempt' && r.status !== 'exempt') return false
        if (!q) return true
        return [r.first_name, r.phone, r.email, r.mentor_name]
          .filter(Boolean).some((v) => String(v).toLowerCase().includes(q))
      })
      .sort((a, b) => (ORDER[a.status] - ORDER[b.status]) || String(a.first_name).localeCompare(String(b.first_name)))
  }, [rows, query, filter])

  const toggle = (id) => setSelected((prev) => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })
  const allShownSelected = shown.length > 0 && shown.every((r) => selected.has(r.woman_id))
  const toggleAllShown = () => setSelected((prev) => {
    const next = new Set(prev)
    if (allShownSelected) shown.forEach((r) => next.delete(r.woman_id))
    else shown.forEach((r) => next.add(r.woman_id))
    return next
  })

  const markSelected = () => runAction(async () => {
    const ids = [...selected]
    await onMarkPaid(ids, 30)
    setSelected(new Set())
  }, 'Marked paid for 30 days.')

  const editDate = (r) => runAction(async () => {
    const v = window.prompt(
      `Access ends on (YYYY-MM-DD) for ${r.first_name}.\nLeave blank to clear (back to pending).`,
      r.paid_until || ''
    )
    if (v === null) return
    const t = v.trim()
    if (t === '') { await onSetPaidUntil(r.woman_id, null); return }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(t) || Number.isNaN(new Date(`${t}T00:00:00`).getTime())) {
      throw new Error('Use the format YYYY-MM-DD, for example 2026-11-05.')
    }
    await onSetPaidUntil(r.woman_id, t)
  })

  const switchLock = () => {
    if (!on) {
      const needs = counts.expired + counts.pending
      const ok = window.confirm(
        `Turn the subscription lock ON?\n\n${needs} ${needs === 1 ? 'woman' : 'women'} (pending or expired) will be locked out until you mark them paid.\n` +
        `${counts.active} active and ${counts.exempt} exempt will keep access.`
      )
      if (!ok) return
    }
    runAction(() => onSetEnforcement(!on), on ? 'Lock is now OFF.' : 'Lock is now ON.')
  }

  const statusTag = (r) => {
    if (r.status === 'exempt')  return <span className="tag tag-good">Exempt</span>
    if (r.status === 'active')  return <span className="tag tag-good">Active · ends {fmt(r.paid_until)}</span>
    if (r.status === 'expired') return <span className="tag tag-unassigned">Expired {fmt(r.paid_until)}</span>
    return <span className="tag tag-unassigned">Pending</span>
  }

  return (
    <div className="stack" style={{ gap: 18 }}>
      {error && <div className="error-note">{error}</div>}
      {note && <p className="tiny" style={{ color: 'var(--text-soft)' }}>{note}</p>}

      {!data ? (
        <p className="small muted">Loading…</p>
      ) : (
        <>
          {/* ---- Master switch ---- */}
          <div className="card">
            <div className="row-between" style={{ alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ maxWidth: 520 }}>
                <span className="small" style={{ fontWeight: 700 }}>
                  Subscription lock is {on ? 'ON' : 'OFF'}
                </span>
                <p className="tiny muted" style={{ marginTop: 4, lineHeight: 1.6 }}>
                  {on
                    ? 'Women without an active subscription see the "renew" screen instead of the app.'
                    : 'Everyone currently has full access. Mark who has paid (and the exempt mentors) first, then turn the lock on.'}
                </p>
              </div>
              <button className={`btn btn-sm ${on ? 'btn-soft' : 'btn-clay'}`} disabled={busy} onClick={switchLock}>
                {on ? 'Turn lock off' : 'Turn lock on'}
              </button>
            </div>
            <div className="row" style={{ gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <span className="tag tag-good">{counts.active} active</span>
              <span className="tag tag-good">{counts.exempt} exempt</span>
              <span className="tag tag-unassigned">{counts.expired} expired</span>
              <span className="tag tag-unassigned">{counts.pending} pending</span>
            </div>
          </div>

          {/* ---- Filters ---- */}
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            {[
              ['needs', `Needs payment (${counts.expired + counts.pending})`],
              ['active', `Active (${counts.active})`],
              ['exempt', `Exempt (${counts.exempt})`],
              ['all', `Everyone (${rows.length})`],
            ].map(([key, label]) => (
              <button
                key={key}
                className={`btn-sm ${filter === key ? 'btn-primary' : 'btn-soft'}`}
                onClick={() => setFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="field">
            <input
              className="input" placeholder="Search by name, phone, email or mentor"
              value={query} onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {/* ---- Bulk bar ---- */}
          <div className="row-between" style={{ alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <label className="tiny muted" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={allShownSelected} onChange={toggleAllShown} />
              Select all shown ({shown.length})
            </label>
            <button
              className="btn btn-sm btn-primary"
              disabled={busy || selected.size === 0}
              onClick={markSelected}
            >
              Mark {selected.size} selected paid · +30 days
            </button>
          </div>

          {/* ---- Women ---- */}
          <div className="stack" style={{ gap: 8 }}>
            {shown.map((r) => (
              <div className="card" key={r.woman_id}>
                <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
                  <input
                    type="checkbox" style={{ marginTop: 4 }}
                    checked={selected.has(r.woman_id)} onChange={() => toggle(r.woman_id)}
                    aria-label={`Select ${r.first_name}`}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="row-between" style={{ gap: 8, flexWrap: 'wrap' }}>
                      <span className="small" style={{ fontWeight: 700 }}>
                        {r.first_name}{r.is_mentor ? ' · mentor' : ''}
                      </span>
                      {statusTag(r)}
                    </div>
                    <p className="tiny muted" style={{ marginTop: 2 }}>
                      {r.phone || r.email || '—'}
                      {!r.is_mentor && r.mentor_name ? ` · mentor: ${r.mentor_name}` : ''}
                      {!r.is_mentor && !r.mentor_name ? ' · no mentor assigned' : ''}
                      {!r.is_mentor && r.mentor_name && !r.has_link ? ' · no payment link yet' : ''}
                    </p>
                    <div className="row" style={{ gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                      <button
                        className="btn btn-sm btn-soft" disabled={busy}
                        onClick={() => runAction(() => onMarkPaid([r.woman_id], 30), `${r.first_name} marked paid for 30 days.`)}
                      >
                        Paid · +30 days
                      </button>
                      <button
                        className={`btn btn-sm ${r.access_exempt ? 'btn-clay' : 'btn-soft'}`} disabled={busy}
                        onClick={() => runAction(() => onSetExempt(r.woman_id, !r.access_exempt))}
                      >
                        {r.access_exempt ? 'Exempt · remove' : 'Make exempt'}
                      </button>
                      <button className="btn-link" disabled={busy} onClick={() => editDate(r)}>
                        Edit end date
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {shown.length === 0 && <p className="small muted">No one matches.</p>}
          </div>

          {/* ---- Links ---- */}
          <div className="card">
            <span className="small" style={{ fontWeight: 700 }}>Links</span>
            <p className="tiny muted" style={{ margin: '4px 0 12px', lineHeight: 1.6 }}>
              Changing these takes effect straight away — no redeploy. Must start with https://
            </p>
            <div className="stack" style={{ gap: 12 }}>
              {LINK_FIELDS.map(({ key, label }) => (
                <div key={key}>
                  <p className="tiny muted" style={{ marginBottom: 5 }}>{label}</p>
                  <div className="row" style={{ gap: 8 }}>
                    <input
                      className="input" style={{ flex: 1, minWidth: 0 }}
                      value={linkDraft[key] || ''}
                      onChange={(e) => setLinkDraft((d) => ({ ...d, [key]: e.target.value }))}
                    />
                    <button
                      className="btn btn-sm btn-soft"
                      disabled={busy || (linkDraft[key] || '') === (data.links?.[key] || '')}
                      onClick={() => runAction(() => onSetLink(key, linkDraft[key] || ''), 'Link saved.')}
                    >
                      Save
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

import { Fragment, useEffect, useMemo, useState } from 'react'
import { rpc } from '../lib/supabase'

// Admin → Structure. The PROPOSED December structure. It is stored separately and
// changes nothing that runs today. Scores are read-only copies of today's Journey.
const LEVELS = {
  1: { label: 'Regional leader', bg: '#4C050B', fg: '#FFE2CC' },
  2: { label: 'Council leader', bg: '#BE512A', fg: '#fff' },
  3: { label: 'Trybe Leader', bg: '#FAEEDA', fg: '#633806' },
  4: { label: 'Mentor', bg: '#EAF3DE', fg: '#27500A' },
}
const CHILD = { 1: 'council leader', 2: 'Trybe Leader', 3: 'mentor' }
const LOW = 40
const num = (v) => (v == null ? null : Number(v))
const tone = (s) => (s == null ? { bg: 'var(--peach)', fg: 'var(--ink-soft, #7a5a5a)' } : s >= 70 ? { bg: '#DDF3E8', fg: '#1f7a55' } : s >= LOW ? { bg: '#FFF0CC', fg: '#8a5a00' } : { bg: '#FFD9DF', fg: 'var(--wine)' })

export default function OrgTree({ password }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState({})
  const [adding, setAdding] = useState(null)   // { parent, level }
  const [acting, setActing] = useState(null)   // node id with the action strip open
  const [q, setQ] = useState('')
  const [nameOnly, setNameOnly] = useState('')
  const [moveTo, setMoveTo] = useState('')
  const [editName, setEditName] = useState('')
  const [linkTo, setLinkTo] = useState('')

  const load = async () => {
    try { setData(await rpc('imara_admin_org_tree', { p_admin_password: password })) }
    catch (e) { setError(e.message) }
  }
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const nodes = data?.nodes || []
  const byParent = useMemo(() => {
    const m = new Map()
    nodes.forEach((n) => { const k = n.parent_id || 'root'; m.set(k, [...(m.get(k) || []), n]) })
    return m
  }, [nodes])
  const kids = (id) => byParent.get(id) || []
  const roots = kids('root')

  // everyone below a node (for the roll-up score)
  const below = (id) => kids(id).flatMap((c) => [c, ...below(c.id)])
  const avg = (list) => {
    const v = list.map((n) => num(n.score)).filter((x) => x != null)
    return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null
  }

  const run = async (fn, ok) => {
    setBusy(true); setError(''); setNote('')
    try { await fn(); await load(); if (ok) setNote(ok) } catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  const add = (level, parent, womanId, name, okName) => run(async () => {
    await rpc('imara_admin_org_add', { p_admin_password: password, p_level: level, p_parent_id: parent, p_woman_id: womanId || null, p_name: name || null })
    setNameOnly(''); setQ('')
  }, `${okName} added.`)

  const counts = [1, 2, 3, 4].map((l) => nodes.filter((n) => n.level === l).length)
  const plan = [1, 2, 10, 50]

  const NodeRow = ({ n, depth }) => {
    const L = LEVELS[n.level]
    const ch = kids(n.id)
    const isOpen = open[n.id] ?? depth < 2
    const desc = below(n.id)
    const roll = n.level === 4 ? num(n.score) : avg(desc)
    const t = tone(roll)
    const lowN = desc.filter((d) => num(d.score) != null && num(d.score) < LOW).length + (n.level === 4 && num(n.score) != null && num(n.score) < LOW ? 1 : 0)
    const full = n.level < 4 && ch.length >= 5
    const sibsForMove = nodes.filter((x) => x.level === n.level - 1 && x.id !== n.parent_id && kids(x.id).length < 5)
    return (
      <div>
        <div className="ot-row" onClick={() => setOpen({ ...open, [n.id]: !isOpen })}>
          <span className="ot-lv" style={{ background: L.bg, color: L.fg }}>{L.label}</span>
          <b className="ot-nm">{n.name}{!n.woman_id && <i className="ot-no" title="Not linked to a member account"> · name only</i>}</b>
          {n.level < 4 && <span className="ot-sl">{ch.length} of 5</span>}
          {n.level === 4 && n.team_size != null && <span className="ot-sl">team of {n.team_size}</span>}
          {roll != null && <span className="ot-sc" style={{ background: t.bg, color: t.fg }}>{roll}%</span>}
          {lowN > 0 && <span className="ot-sc" style={{ background: '#FFD9DF', color: 'var(--wine)' }}>{lowN} below {LOW}%</span>}
          <button className="ot-act" onClick={(e) => { e.stopPropagation(); setActing(acting === n.id ? null : n.id); setMoveTo(''); setEditName(n.name); setLinkTo('') }}>⋯</button>
          {n.level < 4 && <span className="ot-sl">{isOpen ? '▾' : '▸'}</span>}
        </div>
        {acting === n.id && (
          <div className="ot-strip">
            {n.level > 1 && (
              <span className="ot-grp">
                <select className="input" value={moveTo} onChange={(e) => setMoveTo(e.target.value)}>
                  <option value="">Move to…</option>
                  {sibsForMove.map((x) => <option key={x.id} value={x.id}>{x.name} ({kids(x.id).length} of 5)</option>)}
                </select>
                <button className="btn-sm btn-soft" disabled={busy || !moveTo} onClick={() => run(() => rpc('imara_admin_org_move', { p_admin_password: password, p_node_id: n.id, p_new_parent_id: moveTo }), `${n.name} moved.`)}>Move</button>
              </span>
            )}
            <span className="ot-grp">
              <input className="input" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Name" />
              <button className="btn-sm btn-soft" disabled={busy || !editName.trim()} onClick={() => run(() => rpc('imara_admin_org_edit', { p_admin_password: password, p_node_id: n.id, p_name: editName, p_woman_id: n.woman_id }), 'Name saved.')}>Rename</button>
            </span>
            <span className="ot-grp">
              <select className="input" value={linkTo} onChange={(e) => setLinkTo(e.target.value)}>
                <option value="">{n.woman_id ? 'Link a different account…' : 'Link to a member account…'}</option>
                {(data?.available || []).map((a) => <option key={a.woman_id} value={a.woman_id}>{a.first_name}</option>)}
              </select>
              <button className="btn-sm btn-soft" disabled={busy || !linkTo} onClick={() => run(() => rpc('imara_admin_org_edit', { p_admin_password: password, p_node_id: n.id, p_name: null, p_woman_id: linkTo }), 'Linked.')}>Link</button>
            </span>
            <button className="btn-link" style={{ color: 'var(--wine)' }} disabled={busy}
              onClick={() => window.confirm(`Take ${n.name} out of the tree? She keeps her role and stays a member.`) && run(() => rpc('imara_admin_org_remove', { p_admin_password: password, p_node_id: n.id }), `${n.name} taken out of the tree.`)}>
              Remove from tree
            </button>
          </div>
        )}
        {n.level < 4 && isOpen && (
          <div className="ot-kids">
            {ch.map((c) => <Fragment key={c.id}>{NodeRow({ n: c, depth: depth + 1 })}</Fragment>)}
            {!full && (
              <div className="ot-empty" onClick={() => { setAdding({ parent: n.id, level: n.level + 1, parentName: n.name }); setQ(''); setNameOnly('') }}>
                <span>Open place for a {CHILD[n.level]}</span><span>+ Add</span>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  if (!data) return <div className="panel">{error ? <div className="error-note">{error}</div> : <p className="small muted">Loading…</p>}</div>

  const list = (data.available || []).filter((a) => a.first_name.toLowerCase().includes(q.trim().toLowerCase()))
  const showRegional = roots.length === 0

  return (
    <div className="admin">
      <style>{CSS}</style>
      <div className="panel">
        <div className="row-between" style={{ flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <span className="small" style={{ fontWeight: 700 }}>December structure · proposed</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn-sm btn-soft" onClick={() => setOpen(Object.fromEntries(nodes.map((n) => [n.id, true])))}>Expand all</button>
            <button className="btn-sm btn-soft" onClick={() => setOpen(Object.fromEntries(nodes.map((n) => [n.id, false])))}>Collapse all</button>
          </div>
        </div>
        <p className="tiny muted" style={{ margin: '6px 0 10px' }}>
          Plan: 1 regional leader, 2 council leaders, 10 Trybe Leaders, 50 mentors, 5 under each. This is a plan only. It changes no one's role, team or score today.
        </p>
        <div className="ot-count">
          {['Regional', 'Council', 'Trybe Leaders', 'Mentors'].map((k, i) => (
            <div key={k}><b>{counts[i]}</b><span> of {plan[i]}</span><small>{k}</small></div>
          ))}
        </div>
        {error && <div className="error-note" style={{ marginTop: 10 }}>{error}</div>}
        {note && <p className="small" style={{ color: '#1f7a55', marginTop: 10 }}>{note}</p>}
        <div style={{ marginTop: 12 }}>
          {roots.map((n) => <Fragment key={n.id}>{NodeRow({ n, depth: 0 })}</Fragment>)}
          {showRegional && (
            <div className="ot-empty" onClick={() => { setAdding({ parent: null, level: 1, parentName: 'the top' }); setQ(''); setNameOnly('') }}>
              <span>Open place for the regional leader</span><span>+ Add</span>
            </div>
          )}
        </div>
      </div>

      {adding && (
        <div className="panel" style={{ marginTop: 14 }}>
          <div className="row-between" style={{ flexWrap: 'wrap', gap: 6 }}>
            <b className="small">Add a {adding.level === 3 ? 'Trybe Leader' : LEVELS[adding.level].label.toLowerCase()} under {adding.parentName}</b>
            <button className="btn-link" onClick={() => setAdding(null)}>Close</button>
          </div>
          <input className="input" style={{ margin: '10px 0' }} placeholder="Search paid members by name…" value={q} onChange={(e) => setQ(e.target.value)} />
          <p className="tiny muted" style={{ marginBottom: 4 }}>Paid members not yet in the tree · {data.available.length}</p>
          <div style={{ maxHeight: 280, overflowY: 'auto' }}>
            {list.length === 0 && <p className="small muted" style={{ padding: '8px 0' }}>No one matches.</p>}
            {list.map((a) => (
              <div key={a.woman_id} className="ot-pick">
                <b style={{ flex: 1 }}>{a.first_name}</b>
                <span className="tiny muted">{a.is_trybe_leader ? 'Trybe Leader today' : a.is_mentor ? `mentor today · team of ${a.team_size}` : ''}</span>
                <button className="btn-sm btn-soft" disabled={busy} onClick={() => add(adding.level, adding.parent, a.woman_id, null, a.first_name)}>Add</button>
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid var(--line)', marginTop: 10, paddingTop: 10 }}>
            <p className="tiny muted" style={{ marginBottom: 6 }}>Not a member in the app? Add by name.</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input className="input" style={{ flex: 1, minWidth: 160 }} placeholder="Full name" value={nameOnly} onChange={(e) => setNameOnly(e.target.value)} />
              <button className="btn-sm btn-soft" disabled={busy || !nameOnly.trim()} onClick={() => add(adding.level, adding.parent, null, nameOnly, nameOnly.trim())}>Add by name</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const CSS = `
.ot-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:9px 11px;border:1px solid var(--line);border-radius:12px;cursor:pointer;background:var(--cream, #fff)}
.ot-row:hover{border-color:var(--clay)}
.ot-lv{font-size:9.5px;letter-spacing:.08em;text-transform:uppercase;padding:3px 8px;border-radius:8px;font-weight:700;white-space:nowrap}
.ot-nm{flex:1;min-width:120px;font-size:13.5px}
.ot-no{font-weight:400;font-size:11px;opacity:.6}
.ot-sl{font-size:11.5px;opacity:.7;white-space:nowrap}
.ot-sc{font-size:11.5px;font-weight:700;padding:2px 9px;border-radius:99px;white-space:nowrap}
.ot-act{border:1px solid var(--line);background:none;border-radius:8px;padding:1px 9px;cursor:pointer;font-size:15px;line-height:1.3}
.ot-kids{margin:6px 0 0 14px;padding-left:12px;border-left:2px solid var(--line);display:flex;flex-direction:column;gap:6px}
.ot-empty{border:1.5px dashed var(--line);border-radius:12px;padding:8px 11px;font-size:12.5px;opacity:.75;cursor:pointer;display:flex;justify-content:space-between}
.ot-empty:hover{background:var(--peach);opacity:1}
.ot-strip{display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:8px 4px 4px 10px}
.ot-grp{display:flex;gap:6px;align-items:center}
.ot-grp .input{max-width:190px;padding:6px 10px}
.ot-count{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.ot-count div{background:var(--peach);border-radius:10px;padding:8px 10px}
.ot-count b{font-size:20px}.ot-count span{font-size:12px;opacity:.7}.ot-count small{display:block;font-size:10.5px;opacity:.7;text-transform:uppercase;letter-spacing:.06em}
.ot-pick{display:flex;align-items:center;gap:10px;padding:8px 0;border-top:1px solid var(--line);font-size:13px}
@media(max-width:600px){.ot-count{grid-template-columns:repeat(2,minmax(0,1fr))}}
`

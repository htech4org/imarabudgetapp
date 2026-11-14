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
// match a member by nickname/name or by phone number (any format: 0803…, +234 803…)
const digits = (v) => String(v || '').replace(/\D/g, '').replace(/^(234|0)/, '')
const matchWoman = (a, q) => {
  const t = String(q || '').trim().toLowerCase()
  if (!t) return true
  if (String(a.first_name || '').toLowerCase().includes(t)) return true
  const d = digits(t)
  return d.length >= 3 && digits(a.phone).includes(d)
}
const phoneTail = (p) => { const d = String(p || '').replace(/\D/g, ''); return d.length >= 4 ? `…${d.slice(-4)}` : '' }
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
  const [linkQ, setLinkQ] = useState('')
  const [view, setView] = useState(() => (typeof window !== 'undefined' && window.innerWidth >= 900 ? 'chart' : 'list'))

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

  const strip = (n) => {
    const sibsForMove = nodes.filter((x) => x.level === n.level - 1 && x.id !== n.parent_id && kids(x.id).length < 5)
    return (
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
        <span className="ot-grp" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
          <input className="input" value={linkQ} onChange={(e) => setLinkQ(e.target.value)} placeholder={n.woman_id ? 'Link a different account: name or phone' : 'Link an account: name or phone'} style={{ minWidth: 230 }} />
          {linkQ.trim().length >= 2 && (
            <span style={{ display: 'flex', flexDirection: 'column', gap: 4, maxWidth: 330 }}>
              {(data?.available || []).filter((a) => matchWoman(a, linkQ)).slice(0, 6).map((a) => (
                <span key={a.woman_id} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12.5 }}>
                  <b style={{ flex: 1 }}>{a.first_name} <span className="tiny muted" style={{ fontWeight: 400 }}>{phoneTail(a.phone)}</span></b>
                  <button className="btn-sm btn-soft" disabled={busy} onClick={() => run(async () => { await rpc('imara_admin_org_edit', { p_admin_password: password, p_node_id: n.id, p_name: null, p_woman_id: a.woman_id }); setLinkQ('') }, `${n.name} linked to ${a.first_name}.`)}>Link</button>
                </span>
              ))}
              {(data?.available || []).filter((a) => matchWoman(a, linkQ)).length === 0 && <span className="tiny muted">No paid member matches.</span>}
            </span>
          )}
        </span>
        <button className="btn-link" style={{ color: 'var(--wine)' }} disabled={busy}
          onClick={() => window.confirm(`Take ${n.name} out of the tree? She keeps her role and stays a member.`) && run(() => rpc('imara_admin_org_remove', { p_admin_password: password, p_node_id: n.id }), `${n.name} taken out of the tree.`)}>
          Remove from tree
        </button>
      </div>
    )
  }

  const NodeRow = ({ n, depth }) => {
    const L = LEVELS[n.level]
    const ch = kids(n.id)
    const isOpen = open[n.id] ?? depth < 2
    const desc = below(n.id)
    const own = num(n.score)
    const team = n.level < 4 ? avg(desc) : null
    const t = tone(own)
    const tt = tone(team)
    const lowN = desc.filter((d) => num(d.score) != null && num(d.score) < LOW).length
    const full = n.level < 4 && ch.length >= 5
    return (
      <div>
        <div className="ot-row" onClick={() => setOpen({ ...open, [n.id]: !isOpen })}>
          <span className="ot-lv" style={{ background: L.bg, color: L.fg }}>{L.label}</span>
          <b className="ot-nm">{n.name}{!n.woman_id && <i className="ot-no" title="Not linked to a member account"> · name only</i>}</b>
          {n.level < 4 && <span className="ot-sl">{ch.length} of 5</span>}
          {n.level === 4 && n.team_size != null && <span className="ot-sl">team of {n.team_size}</span>}
          {n.woman_id && <span className="ot-sc" style={{ background: t.bg, color: t.fg }}>own {own == null ? '–' : `${own}%`}</span>}
          {n.level < 4 && <span className="ot-sc" style={{ background: team == null ? 'transparent' : tt.bg, color: team == null ? 'inherit' : tt.fg }}>team {team == null ? '–' : `${team}%`}</span>}
          {lowN > 0 && <span className="ot-sc" style={{ background: '#FFD9DF', color: 'var(--wine)' }}>{lowN} below {LOW}% under her</span>}
          <button className="ot-act" onClick={(e) => { e.stopPropagation(); setActing(acting === n.id ? null : n.id); setMoveTo(''); setEditName(n.name); setLinkTo(''); setLinkQ('') }}>⋯</button>
          {n.level < 4 && <span className="ot-sl">{isOpen ? '▾' : '▸'}</span>}
        </div>
        {acting === n.id && strip(n)}
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


  // ---------- chart view (laptop) ----------
  const ChartBox = (n) => {
    const L = LEVELS[n.level]
    const own = num(n.score)
    const team = n.level < 4 ? avg(below(n.id)) : null
    const to = tone(own)
    const tt = tone(team)
    const sel = acting === n.id
    const ch = kids(n.id)
    return (
      <div className={`oc-box l${n.level}${sel ? ' sel' : ''}`} onClick={() => { setActing(sel ? null : n.id); setMoveTo(''); setEditName(n.name); setLinkTo(''); setLinkQ('') }}>
        <b>{n.name}</b>
        <small>{L.label}</small>
        {n.level < 4 && <small>{ch.length} of 5</small>}
        {!n.woman_id
          ? <small className="oc-no">not linked</small>
          : <span className="oc-sc" style={{ background: to.bg, color: to.fg }}>{own == null ? 'own –' : `own ${own}%`}</span>}
        {n.level < 4 && <span className="oc-tm" style={{ background: team == null ? 'transparent' : tt.bg, color: team == null ? 'inherit' : tt.fg }}>{team == null ? 'team –' : `team ${team}%`}</span>}
      </div>
    )
  }
  const MentorChip = (m) => {
    const sv = num(m.score)
    const cls = sv == null ? '' : sv >= 70 ? 'g' : sv >= LOW ? 'a' : 'r'
    return (
      <div key={m.id} className={`oc-m ${cls}${acting === m.id ? ' sel' : ''}`} onClick={() => { setActing(acting === m.id ? null : m.id); setMoveTo(''); setEditName(m.name); setLinkTo(''); setLinkQ('') }}>
        <b>{m.name}</b>{sv != null ? `${sv}%` : m.woman_id ? '–' : 'name only'}
      </div>
    )
  }
  const Plus = (level, parent, parentName, label) => (
    <div className="oc-plus" onClick={() => { setAdding({ parent, level, parentName }); setQ(''); setNameOnly('') }}>{label}</div>
  )
  const ChartNode = (n) => {
    const ch = n.level === 1 ? [...kids(n.id)].sort((a, b) => a.name.localeCompare(b.name)) : kids(n.id)
    return (
      <li key={n.id}>
        {ChartBox(n)}
        {n.level === 3 ? (
          <div className="oc-stack">
            <div className="oc-vl" />
            {ch.map(MentorChip)}
            {ch.length < 5 && Array.from({ length: 5 - ch.length }).map((_, i) => <Fragment key={`e${i}`}>{Plus(4, n.id, n.name, '+')}</Fragment>)}
          </div>
        ) : n.level < 3 ? (
          <ul>
            {ch.map(ChartNode)}
            {n.level > 1 && ch.length < 5 && <li key="plus">{Plus(n.level + 1, n.id, n.name, `+ ${CHILD[n.level]}`)}</li>}
          </ul>
        ) : null}
      </li>
    )
  }
  const sortedRoots = roots
  const selNode = acting ? nodes.find((x) => x.id === acting) : null

  if (!data) return <div className="panel">{error ? <div className="error-note">{error}</div> : <p className="small muted">Loading…</p>}</div>

  const list = (data.available || []).filter((a) => matchWoman(a, q))
  const showRegional = roots.length === 0

  return (
    <div className="admin">
      <style>{CSS}</style>
      <div className="panel">
        <div className="row-between" style={{ flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <span className="small" style={{ fontWeight: 700 }}>December structure · proposed</span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button className={`btn-sm ${view === 'chart' ? 'btn-primary' : 'btn-soft'}`} onClick={() => setView('chart')}>Chart</button>
            <button className={`btn-sm ${view === 'list' ? 'btn-primary' : 'btn-soft'}`} onClick={() => setView('list')}>List</button>
            {view === 'chart' && roots[0] && kids(roots[0].id).length < 5 && (
              <button className="btn-sm btn-soft" onClick={() => { setAdding({ parent: roots[0].id, level: 2, parentName: roots[0].name }); setQ(''); setNameOnly('') }}>+ Council leader</button>
            )}
            {view === 'list' && <>
              <button className="btn-sm btn-soft" onClick={() => setOpen(Object.fromEntries(nodes.map((n) => [n.id, true])))}>Expand all</button>
              <button className="btn-sm btn-soft" onClick={() => setOpen(Object.fromEntries(nodes.map((n) => [n.id, false])))}>Collapse all</button>
            </>}
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
        {view === 'chart' && (
          <>
            <div className="oc-wrap">
              <ul className="oc-tree">
                {sortedRoots.map(ChartNode)}
              </ul>
              {showRegional && Plus(1, null, 'the top', '+ regional leader')}
            </div>
            <p className="tiny muted" style={{ marginTop: 4 }}>On each box: <b>own</b> is her own Journey score this week. <b>team</b> is the average of everyone under her in this tree. Name-only places have no score until you link an account.</p>
            {selNode && (
              <div className="oc-sel">
                <div className="row-between" style={{ flexWrap: 'wrap', gap: 6 }}>
                  <b className="small">{selNode.name} · {LEVELS[selNode.level].label}</b>
                  <button className="btn-link" onClick={() => setActing(null)}>Close</button>
                </div>
                {strip(selNode)}
              </div>
            )}
          </>
        )}
        <div style={{ marginTop: 12, display: view === 'list' ? 'block' : 'none' }}>
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
          <input className="input" style={{ margin: '10px 0' }} placeholder="Search by name, nickname or phone number…" value={q} onChange={(e) => setQ(e.target.value)} />
          <p className="tiny muted" style={{ marginBottom: 4 }}>Paid members not yet in the tree · {data.available.length}</p>
          <div style={{ maxHeight: 280, overflowY: 'auto' }}>
            {list.length === 0 && <p className="small muted" style={{ padding: '8px 0' }}>No one matches.</p>}
            {list.map((a) => (
              <div key={a.woman_id} className="ot-pick">
                <b style={{ flex: 1 }}>{a.first_name} <span className="tiny muted" style={{ fontWeight: 400 }}>{a.phone || ''}</span></b>
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
.oc-wrap{overflow-x:auto;padding:10px 0 14px}
.oc-tree,.oc-tree ul{display:flex;justify-content:center;padding:0;margin:0;position:relative}
.oc-tree{min-width:max-content;margin:0 auto}
.oc-tree ul{padding-top:16px}
.oc-tree li{list-style:none;text-align:center;position:relative;padding:16px 3px 0;display:flex;flex-direction:column;align-items:center}
.oc-tree>li{padding-top:0}
.oc-tree li::before,.oc-tree li::after{content:'';position:absolute;top:0;right:50%;width:50%;height:16px;border-top:1px solid var(--line-strong,#c9a89a)}
.oc-tree li::after{right:auto;left:50%;border-left:1px solid var(--line-strong,#c9a89a)}
.oc-tree>li::before,.oc-tree>li::after{display:none}
.oc-tree li:only-child::before,.oc-tree li:only-child::after{display:none}
.oc-tree li:only-child{padding-top:16px}
.oc-tree li:first-child::before,.oc-tree li:last-child::after{border:0 none}
.oc-tree li:last-child::before{border-right:1px solid var(--line-strong,#c9a89a);border-radius:0 6px 0 0}
.oc-tree li:first-child::after{border-radius:6px 0 0 0}
.oc-tree ul::before{content:'';position:absolute;top:0;left:50%;border-left:1px solid var(--line-strong,#c9a89a);height:16px}
.oc-box{width:96px;box-sizing:border-box;padding:7px 4px;border-radius:12px;cursor:pointer;border:1.5px solid transparent;display:flex;flex-direction:column;gap:2px;align-items:center}
.oc-box b{font-size:12px;line-height:1.2}
.oc-box small{font-size:10.5px;opacity:.8;line-height:1.25}
.oc-no{font-style:italic}
.oc-box.l1{background:#4C050B;color:#FFE2CC;width:150px}
.oc-box.l2{background:#BE512A;color:#fff;width:136px}
.oc-box.l3{background:#FAEEDA;color:#633806}
.oc-box.sel,.oc-m.sel{border-color:var(--gold,#DD8E0D);box-shadow:0 0 0 2px rgba(221,142,13,.25)}
.oc-sc{font-size:10.5px;font-weight:700;padding:1px 8px;border-radius:99px;margin-top:3px}
.oc-tm{font-size:10.5px;font-weight:600;padding:1px 8px;border-radius:99px;margin-top:2px;border:1px dashed rgba(0,0,0,.12)}
.oc-stack{display:flex;flex-direction:column;gap:5px;margin-top:0;width:96px;align-items:stretch}
.oc-vl{width:1px;height:10px;background:var(--line-strong,#c9a89a);margin:0 auto}
.oc-m{background:#fff;border:1px solid var(--line);border-left:4px solid #bbb;border-radius:8px;padding:4px 3px;font-size:11px;cursor:pointer;text-align:center}
.oc-m b{display:block;font-size:11.5px;font-weight:600}
.oc-m.g{border-left-color:#59BA8E}.oc-m.a{border-left-color:#F2C46B}.oc-m.r{border-left-color:#E86C7E}
.oc-plus{border:1.5px dashed var(--line);border-radius:8px;padding:5px 8px;font-size:11.5px;color:var(--ink-soft,#8a6a6a);cursor:pointer;text-align:center;white-space:nowrap}
.oc-plus:hover{background:var(--peach)}
.oc-sel{border:1.5px solid var(--gold,#DD8E0D);border-radius:14px;padding:12px 14px;margin-top:10px;background:var(--cream,#fff)}

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

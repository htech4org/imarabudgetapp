import { useEffect, useMemo, useState } from 'react'
import { rpc } from '../lib/supabase'
import { CSS } from './Home'

// ---------------------------------------------------------------------------
// "Your story": the IMARA Impact & Experience survey, one question per screen.
// Taps first, then her own words, then permission. Nothing is shared publicly
// unless she chooses it on the last screen.
// ---------------------------------------------------------------------------

const TAPS = [
  { key: 'tenure', section: 'Your IMARA experience', q: 'How long have you been part of IMARA?', type: 'one',
    opts: [['lt1', 'Less than a month'], ['1-3', '1 to 3 months'], ['4-6', '4 to 6 months'], ['6+', 'More than 6 months']] },
  { key: 'rating', section: 'Your IMARA experience', q: 'How would you describe your experience so far?', type: 'one',
    opts: [['excellent', 'Excellent'], ['very_good', 'Very good'], ['good', 'Good'], ['fair', 'Fair'], ['finding_feet', 'I am still finding my feet']] },
  { key: 'valuable', section: 'Your IMARA experience', q: 'What has been most valuable to you?', hint: 'Choose all that apply.', type: 'many',
    opts: [['learning', 'Financial education and learning sessions'], ['reading', 'Book reading and chapter quizzes'], ['circle', 'IMARA Circle sessions'],
           ['savings', 'Savings and investment activities'], ['mentorship', 'Mentorship and mastermind sessions'], ['trybe', 'Trybe community and interactions'],
           ['accountability', 'Accountability and weekly activities'], ['app', 'The IMARA app and resources']] },
  { key: 'change', section: 'Your growth', q: 'Has being part of IMARA changed how you handle money?', type: 'one',
    opts: [['significantly', 'Yes, significantly'], ['somewhat', 'Yes, somewhat'], ['little', 'A little'], ['not_yet', 'Not yet']] },
  { key: 'steps', section: 'Your growth', q: 'Which of these have you done since joining IMARA?', hint: 'Choose all that apply.', type: 'many',
    opts: [['first_investment', 'Made my first-ever investment'], ['consistent_investing', 'Started investing more consistently'], ['savings_habit', 'Started or improved my savings habit'],
           ['budget', 'Created a budget or become more intentional with spending'], ['goals', 'Set specific financial goals'], ['tracking', 'Started tracking my finances'],
           ['understanding', 'Understand investment opportunities better'], ['none', 'None of these yet']] },
  { key: 'first_help', section: 'Your growth', q: 'Was IMARA part of what helped you make that first investment?', type: 'one',
    only: (a) => (a.steps || []).includes('first_investment'),
    opts: [['knowledge', 'Yes, IMARA gave me the knowledge and confidence'], ['community', 'Yes, the community encouraged me to act'],
           ['both', 'Yes, the learning and the accountability both helped'], ['before', 'I had invested before joining IMARA']] },
  { key: 'books', section: 'Your growth', q: 'How has the book reading influenced you?', type: 'one', other: true,
    opts: [['mindset', 'It has changed how I think about money and wealth'], ['concepts', 'It helped me understand financial concepts better'],
           ['practical', 'It encouraged me to take practical steps'], ['habit', 'It improved my reading and learning habits'], ['not_yet', 'I have not taken part consistently yet']] },
]

const WORDS = [
  { key: 'since', section: 'Your story', q: 'Since joining IMARA, I have...', ph: 'Finished my first book, and made my first investment.', rows: 3 },
  { key: 'milestone', section: 'Your story', q: 'What is one change or milestone you can point to?', hint: 'What changed, what you did differently, and what happened.', ph: 'Tell us in your own words.', rows: 4 },
  { key: 'advice', section: 'Your story', q: 'What would you tell a woman who is thinking of joining IMARA?', ph: 'Talk to her like your sister.', rows: 4 },
  { key: 'improve', section: 'Your story', q: 'What is one thing IMARA could do better?', hint: 'Honest answers help us most. This one is optional.', ph: 'Be as honest as you like.', rows: 3 },
]

const PERMS = [
  ['name', 'Yes, with my first name'],
  ['anonymous', 'Yes, but keep me anonymous'],
  ['ask', 'Ask me first'],
  ['private', 'Keep it private to IMARA'],
]
const MEDIA = [['yes', 'Yes'], ['maybe', 'Maybe, tell me more'], ['no', 'No']]

const SV_CSS = `
.sv-top{display:flex;justify-content:space-between;font-size:12px;color:var(--text-soft);margin-bottom:6px}
.sv-bar{height:6px;background:var(--surface-2);border-radius:9px;margin-bottom:16px;overflow:hidden}
.sv-bar i{display:block;height:100%;background:#DD8E0D;border-radius:9px;transition:width .25s}
.sv-q{font-size:19px;font-weight:700;line-height:1.3;color:var(--maroon-900,#4C050B);margin:0 0 4px}
.sv-hint{font-size:12.5px;color:var(--text-soft);margin:0 0 12px}
.sv-opt{display:block;width:100%;text-align:left;border:1px solid var(--line);background:#fff;border-radius:12px;padding:12px 14px;font-size:14.5px;color:var(--maroon-900,#4C050B);margin-top:8px;cursor:pointer}
.sv-opt.on{border:2px solid var(--maroon-900,#4C050B);background:var(--surface-2);font-weight:600;padding:11px 13px}
.sv-ta{width:100%;border:1px solid var(--line);border-radius:12px;padding:12px;font-size:15px;font-family:inherit;line-height:1.5;resize:vertical;box-sizing:border-box}
.sv-row{display:flex;justify-content:space-between;align-items:center;margin-top:18px}
.sv-next{border:0;cursor:pointer;background:var(--maroon-900,#4C050B);color:#FBEFE6;font-weight:700;font-size:14.5px;padding:12px 26px;border-radius:99px}
.sv-back{border:0;background:none;cursor:pointer;color:var(--text-soft);font-size:14px;padding:8px 4px}
.sv-err{color:#A32D2D;font-size:13px;margin-top:10px}
.sv-quote{background:var(--surface-2);border-radius:12px;padding:11px 13px;font-size:13.5px;line-height:1.5;color:var(--maroon-900,#4C050B);margin-top:8px}
.sv-note{font-size:12px;color:var(--text-soft);line-height:1.5;margin-top:10px}
`

export default function Survey({ womanId, onDone }) {
  const [st, setSt] = useState(null)
  const [a, setA] = useState({})              // tap answers (arrays for multi)
  const [t, setT] = useState({ since: '', milestone: '', advice: '', improve: '' })
  const [perm, setPerm] = useState('')
  const [dname, setDname] = useState('')
  const [media, setMedia] = useState('')
  const [i, setI] = useState(0)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(null)      // { first_time }

  useEffect(() => {
    rpc('imara_survey_state', { p_woman_id: womanId }).then((s) => {
      setSt(s)
      if (s?.saved) {
        setA(s.saved.answers || {})
        setT({ since: s.saved.since || '', milestone: s.saved.milestone || '', advice: s.saved.advice || '', improve: s.saved.improve || '' })
        setPerm(s.saved.permission || '')
        setDname(s.saved.display_name || '')
        setMedia(s.saved.media || '')
      } else if (s?.first_name) setDname(s.first_name)
    }).catch((e) => setErr(e.message))
  }, [womanId])

  const steps = useMemo(() => {
    const taps = TAPS.filter((s) => !s.only || s.only(a)).map((s) => ({ kind: 'tap', ...s }))
    return [...taps, ...WORDS.map((s) => ({ kind: 'words', ...s })), { kind: 'permission', section: 'Sharing your story' }]
  }, [a])

  if (!st) return <Shell><p className="home-sub">{err || 'One moment…'}</p></Shell>
  if (!st.eligible) return <Shell><p className="home-sub">This is for members with active access.</p></Shell>

  if (done) {
    return (
      <Shell>
        <div className="home-card" style={{ background: 'var(--maroon-900, #4C050B)', color: '#FBEFE6', textAlign: 'center', padding: 22 }}>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{done.first_time ? 'Thank you, your story matters' : 'Your story is updated'}</div>
          <p style={{ fontSize: 13.5, lineHeight: 1.5, color: '#E9C9CC', margin: '8px 0 14px' }}>
            {done.first_time ? 'Your 20 point bonus has been added to this week of your Journey.' : 'We have saved your changes.'}
            <br />Stronger together. Building wealth.
          </p>
          <button type="button" className="sv-next" style={{ background: '#DD8E0D', color: '#4C050B' }} onClick={onDone}>Back to Home</button>
        </div>
      </Shell>
    )
  }

  const s = steps[Math.min(i, steps.length - 1)]
  const total = steps.length
  const setOne = (k, v) => { setErr(''); setA((x) => ({ ...x, [k]: v })) }
  const toggle = (k, v) => {
    setErr('')
    setA((x) => {
      const cur = x[k] || []
      let next = cur.includes(v) ? cur.filter((y) => y !== v) : [...cur, v]
      if (v === 'none') next = cur.includes('none') ? [] : ['none']        // "none of these yet" stands alone
      else next = next.filter((y) => y !== 'none')
      return { ...x, [k]: next }
    })
  }
  const goNext = () => {
    if (s.kind === 'tap') {
      const v = a[s.key]
      if (!v || (Array.isArray(v) && !v.length)) { setErr('Choose an answer to continue.'); return }
      if (s.other && v === 'other' && !(a.books_other || '').trim()) { setErr('Tell us a little, or choose another answer.'); return }
    }
    if (s.kind === 'words' && s.key === 'advice') {
      const best = Math.max(t.since.trim().length, t.milestone.trim().length, t.advice.trim().length)
      if (best < 15) { setErr('Tell us a little more in your own words on at least one of these three. A full sentence is enough.'); return }
    }
    setErr(''); setI((n) => n + 1)
  }
  const submit = async () => {
    if (!perm) { setErr('Choose how we may share your story.'); return }
    setBusy(true); setErr('')
    try {
      const r = await rpc('imara_survey_submit', {
        p_woman_id: womanId, p_answers: a, p_since: t.since, p_milestone: t.milestone, p_advice: t.advice, p_improve: t.improve,
        p_permission: perm, p_display_name: perm === 'name' ? dname : null, p_media: media || null,
      })
      setDone(r)
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }

  return (
    <Shell>
      <div className="home-card">
        <div className="sv-top"><span>{s.section}</span><span>{Math.min(i + 1, total)} of {total}</span></div>
        <div className="sv-bar"><i style={{ width: `${((Math.min(i + 1, total)) / total) * 100}%` }} /></div>

        {s.kind === 'tap' && (
          <>
            <h2 className="sv-q">{s.q}</h2>
            {s.hint && <p className="sv-hint">{s.hint}</p>}
            {s.opts.map(([v, label]) => {
              const on = s.type === 'many' ? (a[s.key] || []).includes(v) : a[s.key] === v
              return <button key={v} type="button" className={`sv-opt${on ? ' on' : ''}`} onClick={() => (s.type === 'many' ? toggle(s.key, v) : setOne(s.key, v))}>{label}</button>
            })}
            {s.other && (
              <>
                <button type="button" className={`sv-opt${a[s.key] === 'other' ? ' on' : ''}`} onClick={() => setOne(s.key, 'other')}>Something else</button>
                {a[s.key] === 'other' && <textarea className="sv-ta" rows={2} style={{ marginTop: 8 }} placeholder="Tell us in a few words" value={a.books_other || ''} onChange={(e) => setA((x) => ({ ...x, books_other: e.target.value }))} />}
              </>
            )}
          </>
        )}

        {s.kind === 'words' && (
          <>
            <h2 className="sv-q">{s.q}</h2>
            {s.hint && <p className="sv-hint">{s.hint}</p>}
            <textarea className="sv-ta" rows={s.rows} maxLength={1500} placeholder={s.ph} value={t[s.key]} onChange={(e) => { setErr(''); setT((x) => ({ ...x, [s.key]: e.target.value })) }} />
          </>
        )}

        {s.kind === 'permission' && (
          <>
            <h2 className="sv-q">Can we share your words?</h2>
            <p className="sv-hint">Nothing is shared until you choose. You can change this later.</p>
            {[['Since joining IMARA, I have...', t.since], ['Your milestone', t.milestone], ['For a woman thinking of joining', t.advice]].filter(([, v]) => v.trim()).map(([l, v]) => (
              <div key={l} className="sv-quote"><small style={{ color: 'var(--text-soft)' }}>{l}</small><br />{v.trim()}</div>
            ))}
            <div style={{ height: 6 }} />
            {PERMS.map(([v, label]) => <button key={v} type="button" className={`sv-opt${perm === v ? ' on' : ''}`} onClick={() => { setErr(''); setPerm(v) }}>{label}</button>)}
            {perm === 'name' && (
              <input className="sv-ta" style={{ marginTop: 8 }} maxLength={60} placeholder="Name to use" value={dname} onChange={(e) => setDname(e.target.value)} />
            )}
            <p className="sv-hint" style={{ marginTop: 16 }}>Would you be open to sharing a short photo or video later? We would message you first.</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {MEDIA.map(([v, label]) => (
                <button key={v} type="button" className={`sv-opt${media === v ? ' on' : ''}`} style={{ width: 'auto', marginTop: 0, padding: '9px 14px' }} onClick={() => setMedia(media === v ? '' : v)}>{label}</button>
              ))}
            </div>
          </>
        )}

        {err && <div className="sv-err">{err}</div>}
        <div className="sv-row">
          {i > 0 ? <button type="button" className="sv-back" onClick={() => { setErr(''); setI(i - 1) }}>Back</button> : <span />}
          {s.kind === 'permission'
            ? <button type="button" className="sv-next" onClick={submit} disabled={busy}>{busy ? 'Saving…' : (st.done ? 'Update my story' : 'Send my story')}</button>
            : <button type="button" className="sv-next" onClick={goNext}>Next</button>}
        </div>
      </div>
    </Shell>
  )
}

function Shell({ children }) {
  return (
    <div className="shell fade-in home">
      <style>{CSS}</style>
      <style>{SV_CSS}</style>
      <div className="home-hero">
        <div className="home-eyebrow">✦ IMARA Impact</div>
        <h1>your story</h1>
        <p>Your journey so far, in your own words</p>
      </div>
      <div className="home-body">{children}</div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { rpc } from '../lib/supabase'
import { CREED } from '../lib/constants'

// Class quizzes. Questions come from imara_quiz_get (no answers). Correct
// answers only come back from the database once she has passed.

const SYSTEM_LABEL = { circle: 'IMARA Circle', foundation: 'Foundation Arc' }

function closesText(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit',
    hour12: true, timeZone: 'Africa/Lagos',
  }).replace(',', '')
}

export default function Quiz({ womanId, onError, onSwitchApp, onSignOut }) {
  const [list, setList] = useState(null)
  const [view, setView] = useState('list')       // list | take | result | review
  const [quiz, setQuiz] = useState(null)         // questions for the quiz being taken
  const [answers, setAnswers] = useState([])
  const [step, setStep] = useState(0)
  const [result, setResult] = useState(null)
  const [review, setReview] = useState(null)
  const [busy, setBusy] = useState(false)

  const loadList = () =>
    rpc('imara_quiz_list', { p_woman_id: womanId })
      .then(setList)
      .catch((e) => onError(e.message))

  useEffect(() => { loadList() /* eslint-disable-next-line */ }, [womanId])

  const start = async (item) => {
    setBusy(true)
    try {
      const q = await rpc('imara_quiz_get', { p_woman_id: womanId, p_quiz_id: item.quiz_id })
      setQuiz({ ...q, subtitle: item.subtitle })
      setAnswers(new Array(q.questions.length).fill(null))
      setStep(0)
      setView('take')
    } catch (e) { onError(e.message); loadList() } finally { setBusy(false) }
  }

  const submit = async () => {
    setBusy(true)
    try {
      const r = await rpc('imara_quiz_submit', { p_woman_id: womanId, p_quiz_id: quiz.quiz_id, p_answers: answers })
      setResult(r)
      setView('result')
      loadList()
    } catch (e) { onError(e.message); setView('list'); loadList() } finally { setBusy(false) }
  }

  const openReview = async (item) => {
    setBusy(true)
    try {
      const r = await rpc('imara_quiz_review', { p_woman_id: womanId, p_quiz_id: item.quiz_id })
      setReview({ title: item.title, items: r })
      setView('review')
    } catch (e) { onError(e.message) } finally { setBusy(false) }
  }

  const footer = (
    <div className="footer-note">
      <p className="creed">{CREED}</p>
      <p style={{ marginBottom: 12 }}>© IMARA Wealth Trybe · Leading Ladies Foundation</p>
      <div className="row" style={{ justifyContent: 'center', gap: 18 }}>
        {onSwitchApp && <button className="btn-link" onClick={onSwitchApp}>Back to home</button>}
        <button className="btn-link" onClick={onSignOut}>Sign out of this device</button>
      </div>
    </div>
  )

  if (!list) {
    return (
      <div className="loading-wrap"><div className="spinner" /><p className="small muted">Opening class quizzes…</p></div>
    )
  }

  // ------------------------------------------------------------------ take
  if (view === 'take' && quiz) {
    const qs = quiz.questions
    const q = qs[step]
    const last = step === qs.length - 1
    const chosen = answers[step]
    return (
      <div className="shell fade-in">
        <Style />
        <div className="topbar">
          <div className="eyebrow" style={{ color: 'var(--peach)' }}>{SYSTEM_LABEL[quiz.system]} · {quiz.title}</div>
          <h1 className="display d-lg" style={{ marginTop: 5 }}>question {step + 1} of {qs.length}</h1>
        </div>
        <div className="pad" style={{ paddingTop: 20 }}>
          <div className="qz-bar"><i style={{ width: `${((step + 1) / qs.length) * 100}%` }} /></div>
          <div className="card stack" style={{ gap: 14 }}>
            <p className="qz-q">{q.question}</p>
            <div className="stack-s" style={{ gap: 8 }}>
              {q.options.map((o, i) => (
                <button
                  key={i} type="button"
                  className={`qz-opt${chosen === i ? ' on' : ''}`}
                  onClick={() => setAnswers(answers.map((a, k) => (k === step ? i : a)))}
                >
                  <span className="qz-l">{'ABCD'[i]}</span><span>{o}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="row-between" style={{ marginTop: 16 }}>
            <button className="btn btn-soft btn-sm" disabled={step === 0} onClick={() => setStep(step - 1)}>Back</button>
            {last ? (
              <button className="btn btn-primary" disabled={busy || answers.some((a) => a === null)} onClick={submit}>
                {busy ? 'Marking…' : 'Submit answers'}
              </button>
            ) : (
              <button className="btn btn-primary" disabled={chosen === null} onClick={() => setStep(step + 1)}>Next</button>
            )}
          </div>
          {last && answers.some((a) => a === null) && (
            <p className="tiny muted" style={{ marginTop: 10, textAlign: 'center' }}>
              Answer every question to submit. Use Back to find the ones you skipped.
            </p>
          )}
        </div>
        {footer}
      </div>
    )
  }

  // ---------------------------------------------------------------- result
  if (view === 'result' && result) {
    const r = result
    return (
      <div className="shell fade-in">
        <Style />
        <div className="topbar">
          <div className="eyebrow" style={{ color: 'var(--peach)' }}>{quiz?.title}</div>
          <h1 className="display d-lg" style={{ marginTop: 5 }}>{r.passed ? 'you passed' : 'almost there'}</h1>
        </div>
        <div className="pad" style={{ paddingTop: 20 }}>
          <div className="stack">
            <div className="card qz-score">
              <b>{r.score}<span> / {r.total}</span></b>
              <p className="small muted">{r.passed ? `Pass mark is ${r.pass_mark}. Well done.` : `You need ${r.pass_mark} to pass.${r.attempts_left > 0 ? ' You have one retake left.' : ''}`}</p>
            </div>

            {!r.passed && (
              <div className="card stack-s">
                <p className="small"><b>Go back to the recording</b></p>
                <p className="small muted">
                  {r.attempts_left > 0
                    ? 'You have one retake left. Watch the recording first, and pay attention to these parts of the class:'
                    : 'You have used both attempts. Watch the recording to catch these parts of the class:'}
                </p>
                <ul className="qz-topics">{r.missed_topics.map((t) => <li key={t}>{t}</li>)}</ul>
                {r.recording_url && (
                  <a className="btn btn-clay" href={r.recording_url} target="_blank" rel="noreferrer">Watch the recording</a>
                )}
              </div>
            )}

            {r.passed && r.review && <ReviewList items={r.review} />}

            <div className="row" style={{ gap: 10 }}>
              <button className="btn btn-soft" onClick={() => setView('list')}>All quizzes</button>
              {!r.passed && r.attempts_left > 0 && <button className="btn btn-primary" onClick={() => setView('list')}>Back to retake</button>}
            </div>
          </div>
        </div>
        {footer}
      </div>
    )
  }

  // ---------------------------------------------------------------- review
  if (view === 'review' && review) {
    return (
      <div className="shell fade-in">
        <Style />
        <div className="topbar">
          <div className="eyebrow" style={{ color: 'var(--peach)' }}>{review.title}</div>
          <h1 className="display d-lg" style={{ marginTop: 5 }}>your answers</h1>
        </div>
        <div className="pad" style={{ paddingTop: 20 }}>
          <div className="stack">
            <ReviewList items={review.items} />
            <button className="btn btn-soft" onClick={() => setView('list')}>All quizzes</button>
          </div>
        </div>
        {footer}
      </div>
    )
  }

  // ------------------------------------------------------------------ list
  return (
    <div className="shell fade-in">
      <Style />
      <div className="topbar">
        <div className="eyebrow" style={{ color: 'var(--peach)' }}>Class quizzes</div>
        <h1 className="display d-lg" style={{ marginTop: 5 }}>did you catch it all?</h1>
      </div>
      <div className="pad" style={{ paddingTop: 20 }}>
        <div className="stack">
          <p className="small muted">
            Missed Tuesday, or want to be sure it sank in? Take the quiz. You get two attempts, so watch the recording before your retake.
          </p>
          {list.length === 0 && <div className="empty-state"><p className="small muted">No quizzes yet.</p></div>}
          {list.map((q) => (
            <div key={q.quiz_id} className="card stack-s">
              <div className="row-between">
                <span className="eyebrow">{SYSTEM_LABEL[q.system]}</span>
                {q.passed ? <span className="tag tag-good">Passed {q.best}/{q.total}</span>
                  : q.attempts > 0 ? <span className="tag tag-unassigned">Best {q.best}/{q.total}</span>
                  : q.closed ? <span className="tag tag-unassigned">Closed</span> : null}
              </div>
              <h3 className="qz-title">{q.title}</h3>
              <p className="small muted">{q.subtitle}</p>
              <p className="tiny faint">
                {q.questions} questions · pass with {q.pass_mark} · {q.passed ? 'passed' : q.attempts_left === 0 ? 'no attempts left' : `${q.attempts_left} attempt${q.attempts_left === 1 ? '' : 's'} left`}
                {q.closed ? ' · Closed' : ` · Closes ${closesText(q.closes_at)}`}
              </p>
              <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                {!q.closed && !q.passed && q.attempts_left > 0 && (
                  <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => start(q)}>
                    {q.attempts > 0 ? 'Retake (last chance)' : 'Start quiz'}
                  </button>
                )}
                {q.passed && <button className="btn btn-soft btn-sm" disabled={busy} onClick={() => openReview(q)}>See answers</button>}
                {q.recording_url && (
                  <a className="btn btn-soft btn-sm" href={q.recording_url} target="_blank" rel="noreferrer">Watch recording</a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      {footer}
    </div>
  )
}

function ReviewList({ items }) {
  return (
    <div className="stack-s">
      {items.map((it) => {
        const right = it.chosen === it.correct_index
        return (
          <div key={it.position} className="card stack-s">
            <p className="qz-q" style={{ fontSize: 14.5 }}>{it.position}. {it.question}</p>
            <p className={`small ${right ? 'qz-yes' : 'qz-no'}`}>
              {right ? '✓ ' : `✗ You chose: ${it.chosen != null ? it.options[it.chosen] : 'no answer'}`}
            </p>
            {!right && <p className="small"><b>Answer:</b> {it.options[it.correct_index]}</p>}
            {right && <p className="small"><b>{it.options[it.correct_index]}</b></p>}
            {it.explanation && <p className="tiny muted">{it.explanation}</p>}
          </div>
        )
      })}
    </div>
  )
}

function Style() {
  return (
    <style>{`
.qz-title{font-family:var(--font-display);font-size:22px;text-transform:lowercase;color:var(--maroon-900);margin:0}
.qz-q{font-family:var(--font-display);font-size:18px;line-height:1.35;color:var(--maroon-900);margin:0}
.qz-bar{height:5px;border-radius:5px;background:var(--cream);margin-bottom:14px;overflow:hidden}
.qz-bar i{display:block;height:100%;background:var(--clay);transition:width .25s}
.qz-opt{display:flex;gap:10px;align-items:flex-start;text-align:left;width:100%;padding:12px;border-radius:14px;border:1.5px solid var(--line);background:var(--surface);cursor:pointer;font:inherit;font-size:14px;line-height:1.45;color:var(--text)}
.qz-opt.on{border-color:var(--clay);background:var(--cream)}
.qz-l{flex:none;width:24px;height:24px;border-radius:50%;display:grid;place-items:center;font-size:12px;font-weight:700;background:var(--surface-2);color:var(--maroon-900)}
.qz-opt.on .qz-l{background:var(--clay);color:#fff}
.qz-score{text-align:center}
.qz-score b{font-family:var(--font-display);font-size:54px;color:var(--maroon-900);line-height:1}
.qz-score b span{font-size:22px;color:var(--text-soft)}
.qz-topics{margin:0;padding-left:18px;font-size:13.5px;line-height:1.7}
.qz-yes{color:var(--green);font-weight:600}
.qz-no{color:var(--wine);font-weight:600}
    `}</style>
  )
}

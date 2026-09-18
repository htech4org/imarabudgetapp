import { useState } from 'react'

// Three internal stages:
//   'read'   — chapter content, with a button into the test (skipped
//              straight to 'test' if the chapter has no content field)
//   'test'   — one multiple-choice question at a time is fine for a first
//              cut, but showing them all on one scrollable screen matches
//              how AddEntry/Settings already lay out a full form, so that's
//              what this does — pick one option per question, then submit
//   'result' — score + pass/fail, with Continue or Try again
export default function ChapterView({
  bookTitle, chapterNumber, totalChapters, chapter, busy,
  onSubmitTest, onNext, onBack,
}) {
  const hasContent = Boolean(chapter.content && chapter.content.trim())
  const [stage, setStage] = useState(hasContent ? 'read' : 'test')
  const [answers, setAnswers] = useState({})   // question_id -> selected_index
  const [result, setResult] = useState(null)   // { score, passed }
  const [error, setError] = useState('')

  const questions = chapter.questions || []
  const allAnswered = questions.length > 0 && questions.every((q) => answers[q.question_id] !== undefined)

  const choose = (questionId, index) => {
    setAnswers({ ...answers, [questionId]: index })
    setError('')
  }

  const submit = async () => {
    if (!allAnswered) { setError('Answer every question before submitting.'); return }
    setError('')
    try {
      const payload = questions.map((q) => ({ question_id: q.question_id, selected_index: answers[q.question_id] }))
      const r = await onSubmitTest(payload)
      setResult(r)
      setStage('result')
    } catch (e) { setError(e.message) }
  }

  const retry = () => { setAnswers({}); setResult(null); setStage('test') }

  const isLastChapter = chapterNumber >= totalChapters

  return (
    <div className="shell fade-in">
      <div className="topbar">
        <button className="back-link" onClick={onBack}>← All books</button>
        <div className="eyebrow" style={{ color: 'var(--peach)', marginTop: 10 }}>
          {bookTitle} · Chapter {chapterNumber} of {totalChapters}
        </div>
        <h1 className="display d-lg" style={{ marginTop: 5 }}>{chapter.title}</h1>
      </div>

      <div className="pad" style={{ paddingTop: 24 }}>
        {stage === 'read' && (
          <>
            <div className="card">
              <p className="small" style={{ lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{chapter.content}</p>
            </div>
            <button className="btn btn-primary" style={{ marginTop: 18 }} onClick={() => setStage('test')}>
              {questions.length > 0 ? 'Take the chapter test' : 'Mark chapter as read'}
            </button>
          </>
        )}

        {stage === 'test' && (
          <div className="stack" style={{ gap: 20 }}>
            {questions.map((q, i) => (
              <div className="card" key={q.question_id}>
                <p className="small" style={{ fontWeight: 600, marginBottom: 12 }}>
                  {i + 1}. {q.question_text}
                </p>
                <div className="stack-s">
                  {q.options.map((opt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={`cat-chip ${answers[q.question_id] === idx ? 'on' : ''}`}
                      style={{ width: '100%' }}
                      onClick={() => choose(q.question_id, idx)}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {error && <div className="error-note">{error}</div>}

            <button className="btn btn-primary" onClick={submit} disabled={busy || !allAnswered}>
              {busy ? 'Checking…' : 'Submit test'}
            </button>
          </div>
        )}

        {stage === 'result' && result && (
          <div className="stack" style={{ gap: 16 }}>
            <div className={`total-badge ${result.passed ? 'ok' : 'off'}`}>
              <span>{result.passed ? 'You passed this chapter' : 'Not quite yet'}</span>
              <span className="total-figure">{Math.round(result.score)}%</span>
            </div>

            {result.passed ? (
              <>
                <p className="small muted" style={{ lineHeight: 1.65 }}>
                  {isLastChapter
                    ? "That was the last chapter — you've finished this book."
                    : 'The next chapter is now open.'}
                </p>
                <button className="btn btn-primary" onClick={onNext} disabled={busy}>
                  {isLastChapter ? 'Finish this book' : 'Continue to the next chapter'}
                </button>
              </>
            ) : (
              <>
                <p className="small muted" style={{ lineHeight: 1.65 }}>
                  Have another look at the chapter and try again — there's no limit on attempts.
                </p>
                <button className="btn btn-clay" onClick={() => { retry() }} disabled={busy}>
                  Try again
                </button>
                {hasContent && (
                  <button className="btn-link" onClick={() => setStage('read')}>Re-read the chapter</button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

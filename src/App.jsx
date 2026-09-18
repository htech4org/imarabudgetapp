import { useCallback, useEffect, useMemo, useState } from 'react'
import { rpc, configured } from './lib/supabase'
import Login from './screens/Login'
import AppPicker from './screens/AppPicker'
import ArchetypePick from './screens/ArchetypePick'
import Dashboard from './screens/Dashboard'
import Summary from './screens/Summary'
import Settings from './screens/Settings'
import History from './screens/History'
import Admin from './screens/Admin'
import ReadingHome from './screens/reading/ReadingHome'
import ChapterView from './screens/reading/ChapterView'
import AddEntry from './components/AddEntry'

const STORE = 'imara_woman_id'
const APP_STORE = 'imara_app_choice'   // 'budget' | 'reading' — which side she landed on last

export default function App() {
  // The admin console lives on its own route. vercel.json rewrites every path
  // to index.html, so a plain pathname check is all the routing this needs.
  const isAdmin = typeof window !== 'undefined' && window.location.pathname.replace(/\/+$/, '') === '/admin'

  const [state, setState] = useState(null)      // { woman, periods, entries }
  const [booting, setBooting] = useState(true)
  const [busy, setBusy] = useState(false)
  const [appChoice, setAppChoiceState] = useState(null)  // null | 'budget' | 'reading'
  const [view, setView] = useState('dashboard') // 'dashboard' | 'summary' | 'settings' | 'history'
  const [sheet, setSheet] = useState(null)      // { mode, line }
  const [toast, setToast] = useState('')
  const [boards, setBoards] = useState(null)    // the budget-side leaderboards

  // ---- reading module state ------------------------------------------------
  const [readingBooks, setReadingBooks] = useState([])
  const [readingProgress, setReadingProgress] = useState([])
  const [readingBoard, setReadingBoard] = useState([])
  const [readingView, setReadingView] = useState('list')  // 'list' | 'chapter'
  const [readingChapter, setReadingChapter] = useState(null) // { bookId, bookTitle, totalChapters, chapterNumber, data }

  // Resume her session from this device.
  useEffect(() => {
    if (isAdmin) { setBooting(false); return }
    const id = localStorage.getItem(STORE)
    if (!id) { setBooting(false); return }
    rpc('imara_state', { p_woman_id: id })
      .then((payload) => {
        setState(payload)
        const savedApp = localStorage.getItem(APP_STORE)
        if (savedApp === 'budget' || savedApp === 'reading') setAppChoiceState(savedApp)
      })
      .catch(() => localStorage.removeItem(STORE))
      .finally(() => setBooting(false))
  }, [isAdmin])

  const adopt = useCallback((payload) => {
    setState(payload)
    if (payload?.woman?.id) localStorage.setItem(STORE, payload.woman.id)
    return payload
  }, [])

  const setAppChoice = useCallback((choice) => {
    setAppChoiceState(choice)
    if (choice) localStorage.setItem(APP_STORE, choice)
    else localStorage.removeItem(APP_STORE)
  }, [])

  // The budget leaderboards read across every woman, so they come from their
  // own function rather than her state. Refreshed whenever her own numbers
  // change, since her position may have moved.
  const womanId = state?.woman?.id
  const entryCount = state?.entries?.length ?? 0
  const savingPct = state?.woman?.pct_saving
  const investingPct = state?.woman?.pct_investing
  useEffect(() => {
    if (!womanId) { setBoards(null); return }
    let cancelled = false
    rpc('imara_leaderboard', { p_woman_id: womanId })
      .then((b) => { if (!cancelled) setBoards(b) })
      .catch(() => { if (!cancelled) setBoards(null) })
    return () => { cancelled = true }
  }, [womanId, entryCount, savingPct, investingPct])

  const run = useCallback(async (fn, args) => {
    setBusy(true)
    try { return adopt(await rpc(fn, args)) }
    finally { setBusy(false) }
  }, [adopt])

  // Reading-side calls don't touch her budget state, so they skip adopt().
  const runReading = useCallback(async (fn, args) => {
    setBusy(true)
    try { return await rpc(fn, args) }
    finally { setBusy(false) }
  }, [])

  // ---- derived (budget side) ----------------------------------------------
  const periods = state?.periods || []
  const allEntries = state?.entries || []
  const activePeriod = useMemo(() => periods.find((p) => p.status === 'active') || null, [periods])
  const shownPeriod = activePeriod || periods[0] || null
  const periodEntries = useMemo(
    () => (shownPeriod ? allEntries.filter((e) => e.period_id === shownPeriod.id) : []),
    [allEntries, shownPeriod]
  )
  const pastPeriods = useMemo(
    () => periods.filter((p) => p.id !== shownPeriod?.id),
    [periods, shownPeriod]
  )
  const archives = useMemo(
    () => (state?.archives || []).filter((a) => a.period_id !== shownPeriod?.id),
    [state, shownPeriod]
  )

  // ---- actions: login / signup --------------------------------------------
  const signup = (form) => run('imara_signup', {
    p_first_name: form.first_name, p_phone: form.phone,
    p_email: form.email, p_password: form.password, p_currency: form.currency,
  })

  const login = ({ identifier, password }) =>
    run('imara_login', { p_identifier: identifier, p_password: password })

  const claim = ({ identifier, password }) =>
    run('imara_claim_account', { p_identifier: identifier, p_password: password })

  const pickArchetype = (key) =>
    run('imara_set_archetype', { p_woman_id: state.woman.id, p_archetype: key })

  const saveSplit = (split) => run('imara_set_split', {
    p_woman_id:  state.woman.id,
    p_giving:    split.giving,
    p_saving:    split.saving,
    p_investing: split.investing,
    p_growth:    split.growth,
    p_living:    split.living,
  })

  const addEntry = async (payload) => {
    try {
      await run('imara_add_entry', {
        p_woman_id: state.woman.id,
        p_date: payload.date,
        p_type: payload.type,
        p_category: payload.category,
        p_amount: payload.amount,
        p_note: payload.note,
      })
      setSheet(null)
      flash(payload.type === 'MOVE' ? 'Logged. That money is now working for you.' : 'Added to your map.')
    } catch (e) { flash(e.message, true) }
  }

  const deleteEntry = async (id) => {
    if (!window.confirm('Remove this entry from your map?')) return
    try { await run('imara_delete_entry', { p_woman_id: state.woman.id, p_entry_id: id }) }
    catch (e) { flash(e.message, true) }
  }

  const closePeriod = async (realisation) => {
    await run('imara_close_period', { p_woman_id: state.woman.id, p_realisation: realisation })
    flash('Your month is closed. Well done.')
  }

  const newPeriod = async () => {
    try {
      await run('imara_new_period', { p_woman_id: state.woman.id })
      setView('dashboard')
      flash('A new thirty days is open.')
    } catch (e) { flash(e.message, true) }
  }

  const signOut = () => {
    if (!window.confirm('Sign out on this device? Your map stays safe — log back in with your phone or email.')) return
    localStorage.removeItem(STORE)
    localStorage.removeItem(APP_STORE)
    setState(null); setView('dashboard'); setAppChoiceState(null)
    setReadingBooks([]); setReadingProgress([]); setReadingBoard([]); setReadingView('list'); setReadingChapter(null)
  }

  const switchApp = () => {
    setAppChoice(null)
    setView('dashboard')
    setReadingView('list'); setReadingChapter(null)
  }

  const flash = (msg, isError) => {
    setToast({ msg, isError: Boolean(isError) })
    setTimeout(() => setToast(''), isError ? 4200 : 2600)
  }

  // ---- actions: reading module ---------------------------------------------
  const loadReadingHome = useCallback(async () => {
    if (!womanId) return
    try {
      const [books, progress, board] = await Promise.all([
        rpc('imara_reading_books_list', {}),
        rpc('imara_reading_progress', { p_woman_id: womanId }),
        rpc('imara_reading_leaderboard', { p_woman_id: womanId }),
      ])
      setReadingBooks(books || [])
      setReadingProgress(progress || [])
      setReadingBoard(board || [])
    } catch (e) { flash(e.message, true) }
  }, [womanId])

  const openChapter = async (bookId, bookTitle, totalChapters, chapterNumber) => {
    try {
      const rows = await runReading('imara_reading_chapter', {
        p_woman_id: womanId, p_book_id: bookId, p_chapter_number: chapterNumber,
      })
      const data = rows?.[0]
      if (!data) { flash('That chapter could not be opened.', true); return }
      setReadingChapter({ bookId, bookTitle, totalChapters, chapterNumber, data })
      setReadingView('chapter')
    } catch (e) { flash(e.message, true) }
  }

  const startBook = async (bookId, bookTitle, totalChapters) => {
    try {
      await runReading('imara_reading_start', { p_woman_id: womanId, p_book_id: bookId })
      await openChapter(bookId, bookTitle, totalChapters, 1)
    } catch (e) { flash(e.message, true) }
  }

  const submitTest = async (chapterId, answers) => {
    const result = await runReading('imara_reading_submit_test', {
      p_woman_id: womanId, p_chapter_id: chapterId, p_answers: answers,
    })
    return result?.[0] || { score: 0, passed: false }
  }

  const nextChapter = async () => {
    const { bookId, bookTitle, totalChapters, chapterNumber } = readingChapter
    await loadReadingHome()
    if (chapterNumber >= totalChapters) {
      flash('Book complete. Well done — pick your next one.')
      setReadingView('list'); setReadingChapter(null)
    } else {
      await openChapter(bookId, bookTitle, totalChapters, chapterNumber + 1)
    }
  }

  const backToReadingList = async () => {
    setReadingView('list'); setReadingChapter(null)
    await loadReadingHome()
  }

  useEffect(() => {
    if (appChoice === 'reading' && womanId) loadReadingHome()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appChoice, womanId])

  // ---- render ---------------------------------------------------------------
  if (isAdmin) return <Admin />

  if (!configured) return <Misconfigured />

  if (booting) {
    return (
      <div className="loading-wrap">
        <div className="spinner" />
        <p className="small muted">Opening your map…</p>
      </div>
    )
  }

  if (!state?.woman) {
    return <Login onSignup={signup} onLogin={login} onClaim={claim} busy={busy} />
  }

  if (!appChoice) {
    return (
      <AppPicker
        firstName={state.woman.first_name?.toLowerCase()}
        onSelectBudget={() => setAppChoice('budget')}
        onSelectReading={() => setAppChoice('reading')}
      />
    )
  }

  // ---------------------------------------------------------------- Reading
  if (appChoice === 'reading') {
    if (readingView === 'chapter' && readingChapter) {
      return (
        <ChapterView
          bookTitle={readingChapter.bookTitle}
          chapterNumber={readingChapter.chapterNumber}
          totalChapters={readingChapter.totalChapters}
          chapter={readingChapter.data}
          busy={busy}
          onSubmitTest={(answers) => submitTest(readingChapter.data.chapter_id, answers)}
          onNext={nextChapter}
          onBack={backToReadingList}
        />
      )
    }
    return (
      <ReadingHome
        firstName={state.woman.first_name?.toLowerCase()}
        books={readingBooks}
        progress={readingProgress}
        board={readingBoard}
        busy={busy}
        onStart={startBook}
        onOpenChapter={openChapter}
        onSwitchApp={switchApp}
        onSignOut={signOut}
      />
    )
  }

  // ---------------------------------------------------------------- Budget
  if (!state.woman.archetype) {
    return <ArchetypePick name={state.woman.first_name} onPick={pickArchetype} busy={busy} />
  }

  if (!shownPeriod) {
    return (
      <div className="loading-wrap">
        <h1 className="display d-lg">no month is open</h1>
        <p className="small muted">Start a fresh thirty days whenever you are ready.</p>
        <button className="btn btn-primary" style={{ maxWidth: 300 }} onClick={newPeriod} disabled={busy}>
          Start a new month
        </button>
      </div>
    )
  }

  // With no month open there is nothing to log into, so the closed workbook is
  // the only sensible place to be — but History and Settings still open, since
  // neither needs a live month.
  const standalone = view === 'history' || view === 'settings'
  const effectiveView = standalone ? view : activePeriod ? view : 'summary'

  return (
    <>
      {effectiveView === 'settings' ? (
        <Settings
          woman={state.woman}
          entries={periodEntries}
          busy={busy}
          onSave={saveSplit}
          onBack={() => setView('dashboard')}
        />
      ) : effectiveView === 'history' ? (
        <History
          woman={state.woman}
          archives={archives}
          onBack={() => setView('dashboard')}
        />
      ) : effectiveView === 'summary' ? (
        <Summary
          woman={state.woman}
          period={shownPeriod}
          entries={periodEntries}
          busy={busy}
          onSave={closePeriod}
          onNewPeriod={newPeriod}
          onBack={activePeriod ? () => setView('dashboard') : null}
        />
      ) : (
        <Dashboard
          woman={state.woman}
          period={shownPeriod}
          entries={periodEntries}
          pastPeriods={pastPeriods}
          allEntries={allEntries}
          archives={archives}
          boards={boards}
          onAdd={(mode, line) => setSheet({ mode, line })}
          onDelete={deleteEntry}
          onOpenSummary={() => setView('summary')}
          onOpenSettings={() => setView('settings')}
          onOpenHistory={() => setView('history')}
          onSignOut={signOut}
          onSwitchApp={switchApp}
        />
      )}

      <AddEntry
        open={Boolean(sheet)}
        onClose={() => setSheet(null)}
        onSave={addEntry}
        period={shownPeriod}
        currency={state.woman.currency}
        mode={sheet?.mode}
        moveLine={sheet?.line}
        saving={busy}
      />

      {toast && <Toast message={toast.msg} isError={toast.isError} />}
    </>
  )
}

function Toast({ message, isError }) {
  return (
    <div style={{
      position: 'fixed', left: '50%', bottom: 26, transform: 'translateX(-50%)',
      background: isError ? 'var(--wine)' : 'var(--maroon-900)', color: '#fff',
      padding: '13px 20px', borderRadius: 14, fontSize: 13.5, fontWeight: 500, zIndex: 90,
      boxShadow: '0 8px 30px rgba(76,5,11,0.3)', maxWidth: 'calc(100% - 44px)',
      textAlign: 'center', animation: 'fadeUp 0.24s ease both',
    }}>
      {message}
    </div>
  )
}

function Misconfigured() {
  return (
    <div className="loading-wrap">
      <h1 className="display d-lg">almost there</h1>
      <p className="small muted" style={{ maxWidth: 400, lineHeight: 1.7 }}>
        The tracker is not connected to its database yet. Set <code>VITE_SUPABASE_URL</code> and{' '}
        <code>VITE_SUPABASE_ANON_KEY</code> in your environment variables, then redeploy.
        Step-by-step instructions are in <code>SETUP.md</code>.
      </p>
    </div>
  )
}

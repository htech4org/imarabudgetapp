import { useCallback, useEffect, useMemo, useState } from 'react'
import { rpc, configured } from './lib/supabase'
import { today, totals, byBuildLine } from './lib/calc'
import { splitOf } from './lib/constants'
import Login from './screens/Login'
import Home from './screens/Home'
import ArchetypePick from './screens/ArchetypePick'
import Dashboard from './screens/Dashboard'
import Summary from './screens/Summary'
import Settings from './screens/Settings'
import History from './screens/History'
import Admin from './screens/Admin'
import ReadingHome from './screens/reading/ReadingHome'
import ChapterView from './screens/reading/ChapterView'
import MyTeam from './screens/MyTeam'
import Locked from './screens/Locked'
import Toolkit from './screens/Toolkit'
import TuesdayClass from './screens/TuesdayClass'
import Quiz from './screens/Quiz'
import AddEntry from './components/AddEntry'
import RealisationPrompt from './components/RealisationPrompt'
import ReviseMonth from './screens/ReviseMonth'

const STORE = 'imara_woman_id'
const RENEWAL_REMINDER_DAY = 22   // the renewal reminder starts on this day of the month
const APP_STORE = 'imara_app_choice'   // 'budget' | 'reading' | 'team' | 'toolkit' — which side she landed on last

export default function App() {
  // The admin console lives on its own route. vercel.json rewrites every path
  // to index.html, so a plain pathname check is all the routing this needs.
  const isAdmin = typeof window !== 'undefined' && window.location.pathname.replace(/\/+$/, '') === '/admin'

  const [state, setState] = useState(null)      // { woman, periods, entries }
  const [booting, setBooting] = useState(true)
  const [busy, setBusy] = useState(false)
  const [appChoice, setAppChoiceState] = useState(null)  // null | 'budget' | 'reading' | 'team'
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

  // ---- mentor-team state ----------------------------------------------------
  const [teamData, setTeamData] = useState(null) // { month, mentor_name, team: [...] }

  // ---- toolkit + subscription state ------------------------------------------
  const [toolkitData, setToolkitData] = useState(null)   // { imara, mentors|null }
  const [skippedRealisation, setSkippedRealisation] = useState([]) // period ids she tapped 'Later' on
  const [tuesdayData, setTuesdayData] = useState(null)  // { is_tuesday, circle, foundation }
  const [renewalInfo, setRenewalInfo] = useState(null)  // { status, paid_until, is_mentor, mentor_name, link }
  const [homeReading, setHomeReading] = useState(null)  // imara_home_reading result
  const [homeRenewal, setHomeRenewal] = useState(null)  // renewal reminder on Home

  // Resume her session from this device.
  useEffect(() => {
    if (isAdmin) { setBooting(false); return }
    const id = localStorage.getItem(STORE)
    if (!id) { setBooting(false); return }
    rpc('imara_state', { p_woman_id: id })
      .then((payload) => {
        setState(payload)
        // She always lands on the Home page when she opens the app.
        localStorage.removeItem(APP_STORE)
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
  const isMentor = Boolean(state?.woman?.is_mentor)
  const entryCount = state?.entries?.length ?? 0
  const accessStatus = state?.woman?.access_status || 'active'
  const locked = Boolean(state?.woman) && accessStatus !== 'active'
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
  // A month that closed itself at midnight and still needs her one-line realisation.
  const pendingRealisation = useMemo(
    () => periods.find((p) => p.status === 'closed' && p.auto_closed && !p.realisation && !skippedRealisation.includes(p.id)) || null,
    [periods, skippedRealisation]
  )
  const saveRealisation = async (periodId, text) => {
    await run('imara_set_realisation', { p_woman_id: state.woman.id, p_period_id: periodId, p_realisation: text })
    flash('Saved. Well done.')
  }

  // A month that closed itself can still be fixed for 3 days (grace_until).
  const gracePeriod = useMemo(
    () => periods.find((p) => p.status === 'closed' && p.auto_closed && p.grace_until && p.grace_until >= today()) || null,
    [periods]
  )
  const graceEntries = useMemo(
    () => (gracePeriod ? allEntries.filter((e) => e.period_id === gracePeriod.id) : []),
    [allEntries, gracePeriod]
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
    setTeamData(null); setToolkitData(null); setTuesdayData(null); setRenewalInfo(null); setHomeReading(null); setHomeRenewal(null)
  }

  const switchApp = () => {
    setHomeReading(null)
    setAppChoice(null)
    setView('dashboard')
    setReadingView('list'); setReadingChapter(null)
    setTeamData(null); setToolkitData(null); setTuesdayData(null)
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

  // ---- actions: mentor team --------------------------------------------------
  const loadTeam = useCallback(async () => {
    if (!womanId) return
    try {
      const data = await rpc('imara_mentor_sessions', { p_mentor_id: womanId })
      setTeamData(data)
    } catch (e) { flash(e.message, true) }
  }, [womanId])

  const setSistersConnectDay = async (weekday) => {
    try {
      const data = await rpc('imara_mentor_set_sisters_connect_day', { p_mentor_id: womanId, p_weekday: weekday })
      setTeamData(data)
    } catch (e) { flash(e.message, true); throw e }
  }

  const markAttendance = async (teamWomanId, sessionType, sessionId, attended) => {
    try {
      const data = await rpc('imara_mentor_mark_attendance', {
        p_mentor_id: womanId,
        p_woman_id: teamWomanId,
        p_session_type: sessionType,
        p_session_id: sessionId,
        p_attended: attended,
      })
      setTeamData(data)
    } catch (e) { flash(e.message, true) }
  }

  useEffect(() => {
    if (appChoice === 'team' && womanId && !locked) loadTeam()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appChoice, womanId, locked])

  // A mentor pastes ONE Selar payment link for her whole team.
  const setTeamLink = async (link) => {
    try {
      const data = await rpc('imara_mentor_set_team_link', { p_mentor_id: womanId, p_link: link })
      setTeamData(data)
      flash(link ? 'Saved. Your team will see this link.' : 'Link removed.')
    } catch (e) { flash(e.message, true); throw e }
  }

  // A mentor pastes the Selar payment link for one of her mentees.
  const setMenteeLink = async (teamWomanId, link) => {
    try {
      const data = await rpc('imara_mentor_set_mentee_link', {
        p_mentor_id: womanId, p_woman_id: teamWomanId, p_link: link,
      })
      setTeamData(data)
      flash('Payment link saved.')
    } catch (e) { flash(e.message, true); throw e }
  }

  // ---- actions: subscription + toolkit ---------------------------------------
  const loadRenewalInfo = useCallback(async () => {
    if (!womanId) return
    try { setRenewalInfo(await rpc('imara_renewal_info', { p_woman_id: womanId })) }
    catch (e) { flash(e.message, true) }
  }, [womanId])

  useEffect(() => {
    if (locked) loadRenewalInfo()
    else setRenewalInfo(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked, womanId])

  const checkAccessAgain = async () => {
    try {
      const next = await run('imara_state', { p_woman_id: womanId })
      if (next?.woman?.access_status && next.woman.access_status !== 'active') {
        flash("Not confirmed yet — IMARA admin will confirm your payment shortly.", true)
        loadRenewalInfo()
      } else {
        flash('Welcome back — your access is open.')
      }
    } catch (e) { flash(e.message, true) }
  }

  // Home dashboard: her current book and today's reading, refreshed on every return home.
  useEffect(() => {
    if (appChoice || !womanId || locked) return
    let cancelled = false
    rpc('imara_home_reading', { p_woman_id: womanId })
      .then((d) => { if (!cancelled) setHomeReading(d || { has_book: false }) })
      .catch(() => { if (!cancelled) setHomeReading({ has_book: false }) })
    return () => { cancelled = true }
  }, [appChoice, womanId, locked])

  // Renewal reminder: shown on Home from the 22nd of every month until her
  // access ends, provided her end date is in the coming days (so someone paid
  // up to December doesn't see it in October).
  const paidUntil = state?.woman?.paid_until || null
  const exempt = Boolean(state?.woman?.access_exempt)
  const renewalDaysLeft = useMemo(() => {
    if (!paidUntil || exempt) return null
    const t = today()
    const now = new Date(`${t}T00:00:00`)
    const end = new Date(`${String(paidUntil).slice(0, 10)}T00:00:00`)
    const y = Number(t.slice(0, 4)), m = Number(t.slice(5, 7)) - 1, d = Number(t.slice(8, 10))
    const windowStart = d >= RENEWAL_REMINDER_DAY ? new Date(y, m, RENEWAL_REMINDER_DAY) : new Date(y, m - 1, RENEWAL_REMINDER_DAY)   // most recent reminder day
    const daysLeft = Math.round((end - now) / 86400000)
    const reached = Math.round((end - windowStart) / 86400000)
    return daysLeft >= 1 && reached <= 16 ? daysLeft : null
  }, [paidUntil, exempt])
  useEffect(() => {
    if (appChoice || !womanId || locked || renewalDaysLeft == null) { setHomeRenewal(null); return }
    let cancelled = false
    rpc('imara_renewal_info', { p_woman_id: womanId })
      .then((d) => { if (!cancelled) setHomeRenewal({ ...d, daysLeft: renewalDaysLeft }) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [appChoice, womanId, locked, renewalDaysLeft])

  const continueReading = async (r) => {
    setAppChoice('reading')
    await openChapter(r.book_id, r.title, r.total_chapters, r.current_chapter)
  }

  // Home dashboard money summary (this month + all months together).
  const homeMoney = useMemo(() => {
    if (!state?.woman) return null
    const w = state.woman
    const mine = activePeriod ? periodEntries : []
    const t = totals(mine)
    const b = byBuildLine(mine)
    const sp = splitOf(w)
    const all = byBuildLine(allEntries)
    return {
      currency: w.currency,
      saved: b.saving, invested: b.investing,
      savingTarget: (t.moneyIn * (sp.saving || 0)) / 100,
      investingTarget: (t.moneyIn * (sp.investing || 0)) / 100,
      hasIncome: t.moneyIn > 0,
      allSaved: all.saving, allInvested: all.investing,
    }
  }, [state, activePeriod, periodEntries, allEntries])

  useEffect(() => {
    if (appChoice !== 'toolkit' || !womanId || locked) return
    let cancelled = false
    rpc('imara_toolkit_links', { p_woman_id: womanId })
      .then((d) => { if (!cancelled) setToolkitData(d) })
      .catch((e) => { if (!cancelled) flash(e.message, true) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appChoice, womanId, locked])

  useEffect(() => {
    if (appChoice !== 'tuesday' || !womanId || locked) return
    let cancelled = false
    rpc('imara_tuesday_class', { p_woman_id: womanId })
      .then((d) => { if (!cancelled) setTuesdayData(d) })
      .catch((e) => { if (!cancelled) flash(e.message, true) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appChoice, womanId, locked])

  // Fire-and-forget: record that she tapped a class link. Never blocks the join.
  const logClassTap = (classKey) => {
    if (!womanId) return
    rpc('imara_tuesday_log_click', { p_woman_id: womanId, p_class: classKey }).catch(() => {})
  }

  const homeBar = <HomeBar onHome={switchApp} />

  const toastEl = toast ? <Toast message={toast.msg} isError={toast.isError} /> : null

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

  // ---------------------------------------------------------------- Locked
  // No active subscription: nothing of hers is shown until IMARA confirms payment.
  if (locked) {
    return (
      <>
        <Locked
          firstName={state.woman.first_name?.toLowerCase()}
          info={renewalInfo}
          busy={busy}
          onCheckAgain={checkAccessAgain}
          onSignOut={signOut}
        />
        {toastEl}
      </>
    )
  }

  // ------------------------------------------------------------ Archetype
  // Everyone picks her archetype once, on first login, whichever side of the
  // app she plans to use (it used to be asked only inside the budget tracker).
  if (!state.woman.archetype) {
    return <ArchetypePick name={state.woman.first_name} onPick={pickArchetype} busy={busy} />
  }

  if (!appChoice) {
    return (
      <>
        <Home
          firstName={state.woman.first_name}
          isMentor={isMentor}
          dayOfMonth={Number(today().slice(8, 10))}
          daysInMonth={new Date(Number(today().slice(0, 4)), Number(today().slice(5, 7)), 0).getDate()}
          monthName={new Date().toLocaleDateString('en-US', { month: 'long', timeZone: 'Africa/Lagos' })}
          money={homeMoney}
          reading={homeReading}
          renewal={homeRenewal}
          onContinueReading={continueReading}
          onSelectBudget={() => setAppChoice('budget')}
          onSelectReading={() => setAppChoice('reading')}
          onSelectTeam={() => setAppChoice('team')}
          onSelectToolkit={() => setAppChoice('toolkit')}
          onSelectTuesday={() => setAppChoice('tuesday')}
          onSelectQuiz={() => setAppChoice('quiz')}
        />
        {toastEl}
      </>
    )
  }

  // ---------------------------------------------------------------- Toolkit
  if (appChoice === 'toolkit') {
    return (
      <>
        {homeBar}
        <Toolkit data={toolkitData} onSwitchApp={switchApp} onSignOut={signOut} />
        {toastEl}
      </>
    )
  }

  // ------------------------------------------------------------ Class quiz
  if (appChoice === 'quiz') {
    return (
      <>
        {homeBar}
        <Quiz womanId={womanId} onError={(m) => flash(m, true)} onSwitchApp={switchApp} onSignOut={signOut} />
        {toastEl}
      </>
    )
  }

  // ---------------------------------------------------------- Tuesday Class
  if (appChoice === 'tuesday') {
    return (
      <>
        {homeBar}
        <TuesdayClass data={tuesdayData} onJoin={logClassTap} onSwitchApp={switchApp} onSignOut={signOut} />
        {toastEl}
      </>
    )
  }

  // ---------------------------------------------------------------- My Team
  if (appChoice === 'team') {
    return (
      <>
        {homeBar}
        <MyTeam
          mentorName={state.woman.first_name}
          data={teamData}
          busy={busy}
          onSetWeekday={setSistersConnectDay}
          onMarkAttendance={markAttendance}
          onSetTeamLink={setTeamLink}
          onSwitchApp={switchApp}
          onSignOut={signOut}
        />
        {toastEl}
      </>
    )
  }

  // ---------------------------------------------------------------- Reading
  if (appChoice === 'reading') {
    if (readingView === 'chapter' && readingChapter) {
      return (
        <>
          {homeBar}
          <ChapterView
            key={readingChapter.data.chapter_id}
            bookTitle={readingChapter.bookTitle}
            chapterNumber={readingChapter.chapterNumber}
            totalChapters={readingChapter.totalChapters}
            chapter={readingChapter.data}
            busy={busy}
            onSubmitTest={(answers) => submitTest(readingChapter.data.chapter_id, answers)}
            onNext={nextChapter}
            onBack={backToReadingList}
          />
          {toastEl}
        </>
      )
    }
    return (
      <>
        {homeBar}
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
        {toastEl}
      </>
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
  const standalone = view === 'history' || view === 'settings' || (view === 'revise' && Boolean(gracePeriod))
  const effectiveView = standalone ? view : activePeriod ? view : 'summary'

  return (
    <>
      {homeBar}
      {gracePeriod && effectiveView === 'dashboard' && (
        <div style={{ background: 'var(--peach)', color: 'var(--maroon-900)', padding: '10px 16px', textAlign: 'center' }}>
          <span className="small">
            You can still add or fix entries for the month that just closed.{' '}
            <button type="button" className="btn-link" style={{ fontWeight: 700 }} onClick={() => setView('revise')}>
              Fix it
            </button>
          </span>
        </div>
      )}
      {effectiveView === 'revise' && gracePeriod ? (
        <ReviseMonth
          period={gracePeriod}
          entries={graceEntries}
          currency={state.woman.currency}
          onAdd={(mode) => setSheet({ mode })}
          onDelete={deleteEntry}
          onBack={() => setView('dashboard')}
        />
      ) : effectiveView === 'settings' ? (
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
        period={view === 'revise' && gracePeriod ? gracePeriod : shownPeriod}
        currency={state.woman.currency}
        mode={sheet?.mode}
        moveLine={sheet?.line}
        saving={busy}
      />

      {pendingRealisation && (
        <RealisationPrompt
          period={pendingRealisation}
          busy={busy}
          onSave={saveRealisation}
          onLater={() => setSkippedRealisation((ids) => [...ids, pendingRealisation.id])}
        />
      )}

      {toastEl}
    </>
  )
}

// A slim bar pinned to the top of every screen after the app picker, so she can
// get back to the picker in one tap instead of scrolling to the footer.
function HomeBar({ onHome }) {
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 60,
      background: 'var(--maroon-900)', borderBottom: '1px solid rgba(255,226,204,0.14)',
    }}>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '8px 16px' }}>
        <button
          type="button" onClick={onHome}
          style={{
            background: 'none', border: 'none', padding: '4px 0', cursor: 'pointer',
            color: 'var(--peach)', font: 'inherit', fontSize: 13.5, fontWeight: 600,
          }}
        >
          ← Home
        </button>
      </div>
    </div>
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

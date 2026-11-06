import { useEffect, useState } from 'react'
import { rpc } from '../lib/supabase'

// A mentor (or the Trybe Leader) picks one woman from her team to help tick
// attendance. She can swap or remove her at any time.
export default function AssistantCard({ womanId, onError, onNotice }) {
  const [st, setSt] = useState(null)
  const [pick, setPick] = useState('')
  const [changing, setChanging] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    rpc('imara_assistant_state', { p_mentor_id: womanId }).then(setSt).catch((e) => onError?.(e.message))
    // eslint-disable-next-line
  }, [womanId])

  const set = async (id, note) => {
    setBusy(true)
    try {
      setSt(await rpc('imara_assistant_set', { p_mentor_id: womanId, p_assistant_id: id }))
      setPick(''); setChanging(false)
      onNotice?.(note)
    } catch (e) { onError?.(e.message) } finally { setBusy(false) }
  }

  if (!st) return null
  const a = st.assistant
  const options = (st.candidates || []).filter((c) => !a || c.woman_id !== a.woman_id)

  return (
    <div className="card" style={{ padding: 16 }}>
      <div className="small" style={{ fontWeight: 700 }}>Your assistant</div>

      {a && !changing ? (
        <>
          <div className="small" style={{ fontWeight: 600, marginTop: 8 }}>{a.first_name}</div>
          <p className="tiny muted" style={{ marginTop: 4, lineHeight: 1.6 }}>
            She can tick attendance at the meeting and the Circle. She sees names and dates only.
            {a.ticks_this_month > 0 && ` She has recorded ${a.ticks_this_month} tick${a.ticks_this_month === 1 ? '' : 's'} this month.`}
          </p>
          <div className="row" style={{ gap: 8, marginTop: 10 }}>
            <button className="btn btn-sm btn-soft" disabled={busy} onClick={() => setChanging(true)}>Change assistant</button>
            <button className="btn btn-sm btn-soft" disabled={busy} onClick={() => set(null, 'Assistant removed.')}>Remove</button>
          </div>
        </>
      ) : (
        <>
          <p className="tiny muted" style={{ margin: '6px 0 10px', lineHeight: 1.6 }}>
            Pick one woman from your team to help you tick who came. She can tick herself only at the Circle, and only when the class log picked her up.
          </p>
          {options.length === 0 ? (
            <p className="tiny muted">No one on your team can be picked yet.</p>
          ) : (
            <>
              <select className="input" value={pick} onChange={(e) => setPick(e.target.value)} style={{ width: '100%' }}>
                <option value="">Choose from your team</option>
                {options.map((c) => <option key={c.woman_id} value={c.woman_id}>{c.first_name}</option>)}
              </select>
              <div className="row" style={{ gap: 8, marginTop: 10 }}>
                <button className="btn btn-sm btn-primary" disabled={busy || !pick} onClick={() => set(pick, 'Assistant set.')}>Make assistant</button>
                {changing && <button className="btn btn-sm btn-soft" disabled={busy} onClick={() => setChanging(false)}>Cancel</button>}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { rpc } from '../lib/supabase'

/**
 * Home card: "What has IMARA changed for you?" Shows for every paid woman until she
 * has shared her story. There is no "Not now": the card simply stays until she does it.
 * After she has finished, it is gone (she can still update her story from the Survey screen).
 */
export default function SurveyCard({ womanId, onOpen }) {
  const [st, setSt] = useState(null)
  useEffect(() => {
    if (!womanId) return undefined
    let off = false
    rpc('imara_survey_state', { p_woman_id: womanId }).then((v) => { if (!off) setSt(v) }).catch(() => {})
    return () => { off = true }
  }, [womanId])
  if (!st || !st.eligible || st.done || !onOpen) return null
  return (
    <div className="home-card" style={{ background: 'var(--maroon-900, #4C050B)', color: '#FBEFE6' }}>
      <div style={{ fontSize: 10.5, letterSpacing: '.14em', fontWeight: 700, color: '#DD8E0D' }}>YOUR STORY</div>
      <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.25, margin: '6px 0 4px' }}>What has IMARA changed for you?</div>
      <p style={{ fontSize: 13, lineHeight: 1.5, color: '#E9C9CC', margin: '0 0 12px' }}>
        A few taps and a few lines in your own words. About 4 minutes. Finish it and your Journey week gets a 20 point bonus.
      </p>
      <button type="button" onClick={onOpen}
        style={{ border: 0, cursor: 'pointer', background: '#DD8E0D', color: '#4C050B', fontWeight: 700, fontSize: 14, padding: '11px 20px', borderRadius: 99 }}>
        Share your story
      </button>
    </div>
  )
}

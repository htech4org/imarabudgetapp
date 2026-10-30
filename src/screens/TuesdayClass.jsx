import { useState } from 'react'
import { CREED } from '../lib/constants'

// Foundation Arc classes have ended. Set to true to show its Tuesday link again.
const FOUNDATION_ARC_ACTIVE = false

// Tuesday's two live classes. The links come from the database
// (imara_tuesday_class), which only returns them to a woman with active access
// and only on a Tuesday (Lagos time). On any other day `data.is_tuesday` is
// false and there is nothing to open.
export default function TuesdayClass({ data, onJoin, onSwitchApp, onSignOut }) {
  // The Zoom ID and passcode appear only after she taps Join, as a backup in
  // case the link opens with an error.
  const [joined, setJoined] = useState(false)

  if (!data) {
    return (
      <div className="loading-wrap">
        <div className="spinner" />
        <p className="small muted">Opening Tuesday class…</p>
      </div>
    )
  }

  return (
    <div className="shell fade-in">
      <div className="topbar">
        <div className="eyebrow" style={{ color: 'var(--peach)' }}>Tuesday Class</div>
        <h1 className="display d-lg" style={{ marginTop: 5 }}>{data.restream && !data.is_tuesday ? "watch tuesday's class" : 'choose your class'}</h1>
      </div>

      <div className="pad" style={{ paddingTop: 24 }}>
        {data.restream && !data.is_tuesday ? (
          <div className="stack" style={{ gap: 14 }}>
            <RestreamCard link={data.restream.link} />
          </div>
        ) : !data.is_tuesday ? (
          <div className="empty-state">
            <p className="small muted">Tuesday classes open on Tuesdays. Come back then.</p>
          </div>
        ) : (
          <div className="stack" style={{ gap: 14 }}>
            {data.restream && <RestreamCard link={data.restream.link} />}
            <div className="card">
              <span className="small" style={{ fontWeight: 700, fontSize: 15 }}>IMARA CIRCLE</span>
              <p className="tiny muted" style={{ margin: '6px 0 12px', lineHeight: 1.7 }}>Live on Zoom.</p>
              <JoinButton href={data.circle?.link} label="Join on Zoom" onClick={() => { setJoined(true); onJoin?.('circle') }} />
              {joined && (data.circle?.meeting_id || data.circle?.passcode) && (
                <div style={{ marginTop: 14 }}>
                  <p className="tiny muted" style={{ marginBottom: 6, lineHeight: 1.7 }}>
                    If Zoom asks for them, or the link gives an error:
                  </p>
                  <p className="tiny" style={{ lineHeight: 1.8 }}>
                    {data.circle.meeting_id && <>Meeting ID: <strong>{data.circle.meeting_id}</strong><br /></>}
                    {data.circle.passcode && <>Passcode: <strong>{data.circle.passcode}</strong></>}
                  </p>
                </div>
              )}
            </div>

            {FOUNDATION_ARC_ACTIVE && (
              <div className="card">
                <span className="small" style={{ fontWeight: 700, fontSize: 15 }}>FOUNDATION ARC</span>
                <p className="tiny muted" style={{ margin: '6px 0 14px', lineHeight: 1.7 }}>Live on YouTube.</p>
                <JoinButton href={data.foundation?.link} label="Watch Live on YouTube" onClick={() => onJoin?.('foundation')} />
              </div>
            )}

            <p className="tiny muted" style={{ lineHeight: 1.7 }}>
              Joining a class from here is logged with the time, so your mentor can see you came.
            </p>
          </div>
        )}
      </div>

      <div className="footer-note">
        <p className="creed">{CREED}</p>
        <p style={{ marginBottom: 12 }}>© IMARA Wealth Trybe · Leading Ladies Foundation</p>
        <div className="row" style={{ justifyContent: 'center', gap: 18 }}>
          {onSwitchApp && <button className="btn-link" onClick={onSwitchApp}>Back to home</button>}
          <button className="btn-link" onClick={onSignOut}>Sign out of this device</button>
        </div>
      </div>
    </div>
  )
}

function RestreamCard({ link }) {
  return (
    <div className="card">
      <span className="tag">Restream</span>
      <p className="small" style={{ fontWeight: 700, fontSize: 15, marginTop: 10 }}>INVESTMENT + NEW IMARA UNVEILING</p>
      <p className="tiny muted" style={{ margin: '6px 0 14px', lineHeight: 1.7 }}>Tuesday's class, live again tonight at 8pm on YouTube.</p>
      <JoinButton href={link} label="Watch Tuesday stream live" />
    </div>
  )
}

function JoinButton({ href, label, onClick }) {
  if (typeof href !== 'string' || !href.startsWith('https://')) {
    return <p className="tiny muted">Link not set up yet — please check with IMARA admin.</p>
  }
  return (
    <a
      className="btn btn-primary"
      href={href}
      onClick={onClick}
      target="_blank"
      rel="noopener noreferrer"
      style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}
    >
      {label}
    </a>
  )
}

import { CREED } from '../lib/constants'

// The resource folders. The links come from the database (imara_toolkit_links),
// which only returns them for a woman with active access — and returns the
// Mentors Toolkit only if she is flagged as a mentor. Nothing here is a
// secret she could read out of the app code.
export default function Toolkit({ data, onSwitchApp, onSignOut }) {
  if (!data) {
    return (
      <div className="loading-wrap">
        <div className="spinner" />
        <p className="small muted">Opening your toolkit…</p>
      </div>
    )
  }

  return (
    <div className="shell fade-in">
      <div className="topbar">
        <div className="eyebrow" style={{ color: 'var(--peach)' }}>Toolkit</div>
        <h1 className="display d-lg" style={{ marginTop: 5 }}>your resources</h1>
      </div>

      <div className="pad" style={{ paddingTop: 24 }}>
        <div className="stack" style={{ gap: 14 }}>
          {data.imara && (
            <ToolkitCard
              title="IMARA Toolkit"
              note="Guides and resources for every mentor and mentee in the Trybe."
              href={data.imara}
            />
          )}
          {data.mentors && (
            <ToolkitCard
              title="Mentors Toolkit"
              note="Resources for mentors only."
              href={data.mentors}
            />
          )}
          {data.circle_playlist && (
            <ToolkitCard
              title="Imara Circle"
              note="Watch the Imara Circle meetings on YouTube."
              href={data.circle_playlist}
              cta="Watch playlist"
            />
          )}
          {data.investment_playlist && (
            <ToolkitCard
              title="Imara Investment 101 Classes"
              note="The investment classes, in order, on YouTube."
              href={data.investment_playlist}
              cta="Watch playlist"
            />
          )}
          {!data.imara && !data.mentors && !data.circle_playlist && !data.investment_playlist && (
            <div className="empty-state">
              <p className="small muted">No toolkit has been set up yet. Check back soon.</p>
            </div>
          )}
        </div>
        <p className="tiny muted" style={{ marginTop: 18, lineHeight: 1.7 }}>
          Folders open in Google Drive and playlists in YouTube, each in a new tab.
        </p>
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

function ToolkitCard({ title, note, href, cta = 'Open folder' }) {
  const safe = typeof href === 'string' && href.startsWith('https://')
  return (
    <div className="card">
      <span className="small" style={{ fontWeight: 700, fontSize: 15 }}>{title}</span>
      <p className="tiny muted" style={{ margin: '6px 0 14px', lineHeight: 1.7 }}>{note}</p>
      {safe && (
        <a
          className="btn btn-primary"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}
        >
          {cta}
        </a>
      )}
    </div>
  )
}

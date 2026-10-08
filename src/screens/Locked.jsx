const MONTHS = ['January','February','March','April','May','June','July','August',
  'September','October','November','December']

function longDate(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`
}

// Shown instead of the whole app when her subscription isn't active:
//   pending — she has signed up but payment hasn't been confirmed yet
//   expired — her paid month has run out
// Nothing of hers is deleted; the moment IMARA marks her paid she is back
// exactly where she left off. `info` comes from imara_renewal_info and holds
// her payment link — the shared mentor link for a mentor, or the link her own
// mentor pasted in for a mentee (null until her mentor adds it).
export default function Locked({ firstName, info, busy, onCheckAgain, onSignOut }) {
  const expired = info?.status === 'expired'
  const isMentor = Boolean(info?.is_mentor)
  const link = typeof info?.link === 'string' && info.link.startsWith('https://') ? info.link : null

  let noLinkNote = null
  if (info && !link) {
    if (isMentor) {
      noLinkNote = "The payment link isn't set up yet. Please contact IMARA admin."
    } else if (info.mentor_name) {
      noLinkNote = `Your mentor ${info.mentor_name} sends you your payment link. As soon as she adds it, it will show up right here.`
    } else {
      noLinkNote = "You haven't been placed with a mentor yet. Your payment link will appear here once IMARA admin assigns you."
    }
  }

  return (
    <div className="shell fade-in">
      <div className="welcome">
        <span className="chip-brand">✦ IMARA Wealth Trybe</span>
        <h1 className="display d-xl" style={{ margin: '22px 0 12px' }}>
          {expired ? 'time to renew' : 'one more step'}
          {firstName ? `, ${firstName}` : ''}
        </h1>
        <p style={{ fontSize: 14.5, lineHeight: 1.7, color: 'rgba(255,226,204,0.86)', maxWidth: 340 }}>
          {expired
            ? `Your access ended on ${longDate(info?.paid_until)}. Renew and you pick up exactly where you left off — your map and your progress are safe.`
            : 'Your account is created. It opens as soon as your payment is confirmed.'}
        </p>
      </div>

      <div className="pad" style={{ paddingTop: 26 }}>
        <div className="stack" style={{ gap: 14 }}>
          {!info ? (
            <p className="small muted">One moment…</p>
          ) : link ? (
            <a
              className="btn btn-primary"
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}
            >
              Pay on Selar
            </a>
          ) : (
            <div className="card">
              <p className="small" style={{ lineHeight: 1.7 }}>{noLinkNote}</p>
            </div>
          )}

          <p className="tiny muted" style={{ lineHeight: 1.7 }}>
            After you pay, IMARA confirms it and your access opens. That can take a little
            while — tap below to check.
          </p>

          <button className="btn btn-soft" onClick={onCheckAgain} disabled={busy}>
            {busy ? 'Checking…' : "I've paid — check again"}
          </button>
        </div>
      </div>

      <div className="footer-note">
        <p style={{ marginBottom: 12 }}>© IMARA Wealth Trybe · Leading Ladies Foundation</p>
        <button className="btn-link" onClick={onSignOut}>Sign out of this device</button>
      </div>
    </div>
  )
}

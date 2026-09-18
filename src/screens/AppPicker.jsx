// Shown once right after login (new signup, returning login, or a fresh
// claim). Whichever tile she taps is where onSelect sends her; the app
// should remember the choice for this session so re-opening the link later
// can skip straight back to whichever side she was last in, if you want that
// — that's a one-line addition wherever the woman's session state already
// lives, not something this screen needs to know about.
export default function AppPicker({ firstName, onSelectBudget, onSelectReading }) {
  return (
    <div className="shell fade-in">
      <div className="welcome">
        <span className="chip-brand">✦ IMARA Wealth Trybe</span>
        <h1 className="display d-xl" style={{ margin: '22px 0 12px' }}>
          {firstName ? `hi ${firstName}` : 'welcome back'}
        </h1>
        <p style={{ fontSize: 14.5, lineHeight: 1.7, color: 'rgba(255,226,204,0.86)', maxWidth: 330 }}>
          What are you here for today?
        </p>
      </div>

      <div className="pad" style={{ paddingTop: 26 }}>
        <div className="stack" style={{ gap: 16 }}>
          <button className="picker-tile" onClick={onSelectBudget}>
            <span className="picker-tile-title">Budget Tracker</span>
            <span className="picker-tile-sub">Your Gap, your Split, your thirty days</span>
          </button>

          <button className="picker-tile" onClick={onSelectReading}>
            <span className="picker-tile-title">Book Reading</span>
            <span className="picker-tile-sub">Your current book and chapter tests</span>
          </button>
        </div>
      </div>

      <div className="footer-note">
        <p>© IMARA Wealth Trybe · Leading Ladies Foundation</p>
      </div>
    </div>
  )
}

/*
  Minimal CSS to add to src/styles.css (matches the existing .btn / .field
  visual language — adjust colors to whatever variables styles.css already
  defines rather than the hex fallbacks below):

  .picker-tile {
    display: flex; flex-direction: column; gap: 4px;
    text-align: left; width: 100%; padding: 18px 20px;
    border-radius: 14px; border: 1px solid rgba(255,226,204,0.18);
    background: rgba(255,226,204,0.04); cursor: pointer;
  }
  .picker-tile:hover { background: rgba(255,226,204,0.08); }
  .picker-tile-title { font-family: var(--font-display); font-size: 18px; }
  .picker-tile-sub { font-size: 13px; color: rgba(255,226,204,0.7); }

  .link-inline {
    background: none; border: none; padding: 0; color: inherit;
    text-decoration: underline; cursor: pointer; font: inherit;
  }
*/

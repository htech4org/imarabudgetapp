import { useState } from 'react'

// A password field with an eye button to show or hide what she typed.
export default function PasswordInput({ className = 'input', style, ...props }) {
  const [shown, setShown] = useState(false)
  return (
    <div className="pw-wrap">
      <style>{`
.pw-wrap{position:relative}
.pw-wrap .input{padding-right:46px}
.pw-eye{position:absolute;right:6px;top:50%;transform:translateY(-50%);width:36px;height:36px;border:0;background:none;cursor:pointer;display:grid;place-items:center;color:var(--text-soft);border-radius:10px}
.pw-eye:hover{color:var(--maroon-900)}
      `}</style>
      <input {...props} className={className} style={style} type={shown ? 'text' : 'password'} />
      <button
        type="button" className="pw-eye" tabIndex={-1}
        aria-label={shown ? 'Hide password' : 'Show password'} aria-pressed={shown}
        onClick={() => setShown((s) => !s)}
      >
        {shown ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  )
}

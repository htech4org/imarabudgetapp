export const scoreColor = (s) => (s == null ? 'var(--surface-2)' : s >= 70 ? '#59BA8E' : s >= 40 ? 'var(--clay)' : 'var(--wine)')


// Six small bars, one per week. Tap a bar (when onPick is given) to open that week.
export function WeekBars({ weeks, selected, onPick }) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 86, marginTop: 12 }}>
      {weeks.map((w) => {
        const h = w.score == null ? 6 : Math.max(8, Math.round(w.score * 0.64))
        const on = selected === w.week
        const El = onPick && w.score != null ? 'button' : 'div'
        return (
          <El key={w.week} type={El === 'button' ? 'button' : undefined} onClick={El === 'button' ? () => onPick(w.week) : undefined}
            style={{ flex: 1, textAlign: 'center', background: 'none', border: 0, padding: 0, cursor: El === 'button' ? 'pointer' : 'default' }}>
            <div style={{ fontSize: 10, color: 'var(--text-soft)', marginBottom: 3, minHeight: 12 }}>{w.score != null ? `${w.score}` : ''}</div>
            <div style={{ height: h, borderRadius: '7px 7px 3px 3px', background: scoreColor(w.score), outline: on ? '2px solid var(--maroon-900)' : 'none', outlineOffset: 1 }} />
            <div style={{ fontSize: 10, color: 'var(--text-soft)', marginTop: 4, fontWeight: on ? 700 : 400 }}>W{w.week}</div>
          </El>
        )
      })}
    </div>
  )
}


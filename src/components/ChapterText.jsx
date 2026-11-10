// Lays out a chapter's plain text so it reads like a book: bigger headings,
// itemised lists, scripture and epigraph quotes set apart, comfortable size.
// It only changes how the text is shown. The text itself is not changed.

const REF = /[—–-]\s*(?:[1-3]\s)?[A-Z][A-Za-z]+\s\d+:\d+(?:[-–]\d+)?(?:\s?\(?[A-Z]{3,6}\)?)?\.?$/
const LEAD_REF = /^(?:[1-3]\s)?[A-Z][A-Za-z]+\s\d+:\d+(?:[-–]\d+)?:?\s*[“"]/

function kind(line) {
  const l = line.trim()
  if (/^•\s/.test(l)) return 'bullet'
  if (/^\d\s=\s/.test(l)) return 'scale'
  if (/^(Subtotal|Total Score)\b/.test(l)) return 'score'
  if (/^[a-g]\)\s/.test(l)) return 'item'
  if (/^[☐□]\s?/.test(l)) return 'check'
  if (/^(\d{1,2}\.|[A-H]\.)\s/.test(l)) {
    const body = l.replace(/^(\d{1,2}\.|[A-H]\.)\s+/, '')
    return /[.?!”"’:;)…]$/.test(body) || /^_+/.test(body) || body.length > 90 ? 'item' : 'h3'
  }
  if (/^Step \d+:/.test(l) && !/[.?!]$/.test(l) && l.length <= 90) return 'h3'
  if (/^(\d{2,3}\s[–-]\s\d{2,3}|Below \d+)\s?:/.test(l) && l.length <= 80) return 'result'
  if (/^[“"].*[”"]\s*[—–-]/.test(l) && REF.test(l)) return 'scripture'
  if (LEAD_REF.test(l)) return 'scripture'
  if (/^—/.test(l) && l.length < 70) return 'sign'
  if (/[_@]|\.(org|com)\b|^(Website|Email|Instagram|Facebook)\b/.test(l)) return 'p'
  const letters = l.replace(/[^A-Za-z]/g, '')
  if (letters.length >= 4 && letters === letters.toUpperCase() && l.length <= 100) return 'h2'
  const words = l.split(/\s+/)
  const title = words.filter((w) => w.length > 3).every((w) => /^[A-Z“(]/.test(w))
  if (l.length <= 90 && !/[.,;:!”"’)…]$/.test(l) && /^[A-Z“]/.test(l)) {
    if (l.endsWith('?')) return 'p'
    return 'h3'
  }
  if (l.length <= 70 && l.endsWith('?') && title && words.length >= 3) return 'h3'
  return 'p'
}

// "Title: rest" at the start of a list item gets a bold title.
function ItemText({ text }) {
  const m = text.match(/^([^:]{2,42}):\s+(.+)$/)
  if (m && !/[.?!]/.test(m[1])) return <><b>{m[1]}:</b> {m[2]}</>
  return text
}

export default function ChapterText({ text }) {
  const lines = String(text || '').split('\n').map((s) => s.trim()).filter(Boolean)
  const blocks = []
  lines.forEach((line, i) => {
    let k = kind(line)
    if (i === 0 && /^[“"].*[”"]$/.test(line) && line.length < 220) k = 'epigraph'
    const last = blocks[blocks.length - 1]
    if (k === 'bullet' || k === 'item' || k === 'scale' || k === 'check') {
      const t = k === 'bullet' ? line.replace(/^•\s*/, '') : line
      if (last && last.k === k) last.items.push(t)
      else blocks.push({ k, items: [t] })
    } else blocks.push({ k, t: line })
  })

  return (
    <div className="ct">
      <style>{CSS}</style>
      {blocks.map((b, i) => {
        switch (b.k) {
          case 'epigraph': return <blockquote key={i} className="ct-epi">{b.t}</blockquote>
          case 'scripture': return <blockquote key={i} className="ct-scr">{b.t}</blockquote>
          case 'h2': return <h2 key={i} className="ct-h2">{b.t}</h2>
          case 'h3': return <h3 key={i} className="ct-h3">{b.t}</h3>
          case 'result': return <h3 key={i} className="ct-h3 ct-res">{b.t}</h3>
          case 'score': return <p key={i} className="ct-score">{b.t}</p>
          case 'sign': return <p key={i} className="ct-sign">{b.t}</p>
          case 'bullet': return <ul key={i} className="ct-ul">{b.items.map((t, j) => <li key={j}><ItemText text={t} /></li>)}</ul>
          case 'check': return <div key={i} className="ct-checks">{b.items.map((t, j) => <div key={j} className="ct-check"><span className="ct-box">☐</span><span>{t.replace(/^[☐□]\s*/, '')}</span></div>)}</div>
          case 'scale': return <div key={i} className="ct-scale">{b.items.map((t, j) => <div key={j}>{t}</div>)}</div>
          case 'item': return (
            <div key={i} className="ct-list">
              {b.items.map((t, j) => {
                const m = t.match(/^(\d{1,2}\.|[A-H]\.|[a-g]\))\s+(.*)$/)
                const isQ = /^\d/.test(t) && /^[a-g]\)\s/.test(b.items[j + 1] || '')
                const isOpt = /^[a-g]\)\s/.test(t)
                return (
                  <div key={j} className={`ct-item${isQ ? ' ct-q' : ''}${isOpt ? ' ct-opt' : ''}`}>
                    <span className="ct-num">{m ? m[1] : ''}</span>
                    <span><ItemText text={m ? m[2] : t} /></span>
                  </div>
                )
              })}
            </div>
          )
          default: return <p key={i} className={`ct-p${b.t.endsWith(':') ? ' ct-lead' : ''}`}>{b.t}</p>
        }
      })}
    </div>
  )
}

const CSS = `
.ct{font-size:16.5px;line-height:1.78;color:var(--text,#1c0800)}
.ct p{margin:0 0 16px}
.ct .ct-lead{margin-bottom:8px}
.ct-h2{font-family:var(--font-display);font-size:21px;font-weight:700;line-height:1.25;letter-spacing:.02em;color:var(--maroon-900);margin:34px 0 14px;padding-top:18px;border-top:1px solid rgba(76,5,11,.14)}
.ct>.ct-h2:first-child{margin-top:4px;border-top:0;padding-top:0}
.ct-h3{font-family:var(--font-display);font-size:19px;font-weight:700;line-height:1.3;color:var(--maroon-900);margin:28px 0 10px}
.ct-res{font-size:16px;color:var(--clay,#BE512A);margin:22px 0 6px;letter-spacing:.02em}
.ct-epi{margin:2px 0 22px;padding:0 0 0 14px;border-left:3px solid var(--gold,#DD8E0D);font-family:var(--font-display);font-size:19px;line-height:1.45;font-style:italic;color:var(--maroon-900)}
.ct-scr{margin:6px 0 18px;padding:12px 14px;border-left:3px solid var(--gold,#DD8E0D);background:rgba(221,142,13,.09);border-radius:0 10px 10px 0;font-size:15.5px;font-style:italic;line-height:1.6}
.ct-ul{margin:0 0 16px;padding:0 0 0 22px}
.ct-ul li{margin:0 0 7px;padding-left:2px}
.ct-ul li::marker{color:var(--clay,#BE512A)}
.ct-list{margin:0 0 16px}
.ct-item{display:flex;gap:10px;margin:0 0 10px}
.ct-q{margin-top:18px;font-weight:600;color:var(--maroon-900)}
.ct-opt{margin-left:6px;margin-bottom:7px}
.ct-num{flex:0 0 28px;font-weight:700;color:var(--maroon-900)}
.ct-checks{margin:0 0 16px}
.ct-check{display:flex;gap:10px;margin:0 0 8px}
.ct-box{flex:0 0 22px;color:var(--maroon-900);font-size:18px;line-height:1.5}
.ct-scale{margin:0 0 16px;padding:10px 14px;border-radius:10px;background:rgba(76,5,11,.05);font-size:14.5px;line-height:1.7}
.ct-score{text-align:right;font-weight:700;color:var(--maroon-900);margin:-4px 0 18px!important}
.ct-sign{font-style:italic;margin:-6px 0 16px!important}
`

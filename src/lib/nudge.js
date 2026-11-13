// WhatsApp nudge: opens a chat with her and a short, kind message already typed.
// Nothing is sent until the person taps send in WhatsApp.

// "0803 123 4567" -> "2348031234567". Numbers already starting with a country
// code (234, or typed with +) are kept. Returns '' when it can't be a number.
export function waNumber(phone) {
  const raw = String(phone || '').trim()
  let d = raw.replace(/\D/g, '')
  if (!d) return ''
  if (raw.startsWith('+')) return d.length >= 8 ? d : ''
  if (d.startsWith('00')) d = d.slice(2)
  else if (d.startsWith('0') && d.length === 11) d = `234${d.slice(1)}`
  else if (d.length === 10 && !d.startsWith('234')) d = `234${d}`
  return d.length >= 10 && d.length <= 15 ? d : ''
}

const WORD = {
  'daily reading': 'your reading',
  'tuesday class': 'the Tuesday class',
  'mastermind meeting': 'the Mastermind meeting',
  'investment this month': 'your investing for the month',
}
const say = (label) => {
  const l = String(label || '').toLowerCase()
  if (WORD[l]) return WORD[l]
  if (/quiz/.test(l)) return 'the weekly quiz'
  return l
}
const joinList = (a) => (a.length <= 1 ? a.join('') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`)

export function nudgeText(firstName, flags) {
  const name = String(firstName || '').trim()
  const open = (flags || []).map(say)
  const hi = name ? `Hi ${name}, ` : 'Hi, '
  if (!open.length) return `${hi}it's IMARA. Just checking in on you this week. How are you doing, and how can we help?`
  return `${hi}it's IMARA. This week is a bit quiet so far: ${joinList(open)} ${open.length > 1 ? 'are' : 'is'} still open. No pressure, just checking in. How can we help you catch up?`
}

// Returns a wa.me link, or '' when she has no usable number.
export function nudgeLink(phone, firstName, flags) {
  const n = waNumber(phone)
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(nudgeText(firstName, flags))}` : ''
}

// For a mentor whose weekly report to the Trybe Leader is overdue.
export function reportNudgeLink(phone, firstName, missed) {
  const n = waNumber(phone)
  if (!n) return ''
  const name = String(firstName || '').trim()
  const what = Number(missed) > 1 ? `your last ${missed} weekly reports` : 'your weekly report'
  const text = `${name ? `Hi ${name}, ` : 'Hi, '}it's IMARA. We haven't received ${what} yet. Whenever you can, please send ${Number(missed) > 1 ? 'them' : 'it'} in. And tell us if anything is in your way, we're here to help.`
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`
}

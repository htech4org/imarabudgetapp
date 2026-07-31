// ---------------------------------------------------------------------------
//  The Map — Session 2 of the IMARA Money Journey
// ---------------------------------------------------------------------------

export const PRIVACY_NOTICE =
  "Your map stays with us. This tracker is private within the IMARA Admin team. " +
  "We see it because we walk this with you, not to grade you. If your numbers show " +
  "you're stuck, that's when we reach out. Not shame. Support."

export const CREED = "the map is not the judgment, it's the way out."

// The five money archetypes, from the Financial Mirror quiz she has already taken.
export const ARCHETYPES = {
  kemi: {
    key: 'kemi',
    name: 'Kemi',
    title: 'The Survivor',
    blurb: 'I handle everything for everyone. There is never anything left at month end.',
    focusLine: 'Focus first on your Saving line. Build the emergency fund before anything else.',
    mantra: 'I pay myself before I rescue anyone.',
    focusOn: 'saving',
  },
  annie: {
    key: 'annie',
    name: 'Annie',
    title: 'The Giver',
    blurb: 'When anyone needs help, my name comes up. I give before I plan.',
    focusLine: 'Focus first on giving from your 10% Giving line — not from your survival.',
    mantra: 'I give from overflow, not from my own future.',
    focusOn: 'giving',
  },
  ama: {
    key: 'ama',
    name: 'Ama',
    title: 'The Drifter',
    blurb: 'I know what I should be doing. I keep meaning to start next month.',
    focusLine: 'Focus first on simply starting. Do not optimise. Log one thing today.',
    mantra: "I start before I'm ready. Done is better.",
    focusOn: 'start',
  },
  thandi: {
    key: 'thandi',
    name: 'Thandi',
    title: 'The Settler',
    blurb: 'I am not in crisis. I am fine. But nothing has grown in a long time.',
    focusLine: 'Focus first on activating your Investing line. Stability is not growth.',
    mantra: "I don't manage money. I multiply it.",
    focusOn: 'investing',
  },
  zara: {
    key: 'zara',
    name: 'Zara',
    title: 'The Spender',
    blurb: 'I earn well. What comes in and what stays are two different numbers.',
    focusLine: 'Focus first on naming and capping your proof spending inside Living — then redirect it into Saving and Investing.',
    mantra: "I build wealth. I don't just perform it.",
    focusOn: 'living',
  },
}

export const ARCHETYPE_ORDER = ['kemi', 'annie', 'ama', 'thandi', 'zara']

// The 8 spending categories.
export const CATEGORIES = [
  { key: 'Housing',            label: 'Housing',            icon: '⌂' },
  { key: 'Food & Groceries',   label: 'Food & Groceries',   icon: '◗' },
  { key: 'Transport & Fuel',   label: 'Transport & Fuel',   icon: '◇' },
  { key: 'Utilities & Bills',  label: 'Utilities & Bills',  icon: '◈' },
  { key: 'Giving',             label: 'Giving',             icon: '♡' },
  { key: 'Debt Repayments',    label: 'Debt Repayments',    icon: '◐' },
  { key: 'Personal & Beauty',  label: 'Personal & Beauty',  icon: '✦' },
  { key: 'Everything Else',    label: 'Everything Else',    icon: '◦' },
]

export const CATEGORY_KEYS = CATEGORIES.map((c) => c.key)

// The Rich Woman Split. Every month's income gets assigned.
//   kind 'spend' — lines you can see in her OUT entries
//   kind 'build' — lines she has to deliberately MOVE money into
export const SPLIT_LINES = [
  { key: 'giving',    label: 'Giving',           pct: 0.10, kind: 'spend', note: 'From your Giving category' },
  { key: 'saving',    label: 'Saving',           pct: 0.10, kind: 'build', note: 'Your emergency fund' },
  { key: 'investing', label: 'Investing',        pct: 0.10, kind: 'build', note: 'Money that multiplies' },
  { key: 'growth',    label: 'Personal Growth',  pct: 0.10, kind: 'build', note: 'Skills, learning, you' },
  { key: 'living',    label: 'Living',           pct: 0.60, kind: 'spend', note: 'Everything else you spend' },
]

export const BUILD_LINES = SPLIT_LINES.filter((l) => l.kind === 'build')
export const BUILD_LINE_KEYS = BUILD_LINES.map((l) => l.key)

// MOVE entries carry one of these as their category.
export const MOVE_CATEGORY = { saving: 'Saving', investing: 'Investing', growth: 'Personal Growth' }
export const MOVE_KEY_BY_CATEGORY = { Saving: 'saving', Investing: 'investing', 'Personal Growth': 'growth' }

// Living = every OUT category except Giving.
export const LIVING_CATEGORIES = CATEGORY_KEYS.filter((c) => c !== 'Giving')

export const CURRENCIES = [
  { symbol: '₦',   label: '₦ Naira' },
  { symbol: 'R',   label: 'R Rand' },
  { symbol: 'KSh', label: 'KSh Shilling' },
  { symbol: 'GH₵', label: 'GH₵ Cedi' },
  { symbol: '$',   label: '$ Dollar' },
  { symbol: '£',   label: '£ Pound' },
]

export const PERIOD_DAYS = 30

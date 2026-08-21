# IMARA Daily Budget Tracker

A thirty-day cashflow tracker for the women of the **IMARA Wealth Trybe**
(Leading Ladies Foundation). It operationalises **The Map** — Session 2 of the
IMARA Money Journey.

> the map is not the judgment, it's the way out.

**→ Setting it up: [SETUP.md](SETUP.md)**

---

## What it does

**For her**

- Signs up with first name, phone, email — no password, no app to install
- Picks her archetype once (Kemi, Annie, Ama, Thandi or Zara, from the Financial
  Mirror quiz she has already taken) and never has to pick it again
- Logs money IN and money OUT across a rolling 30-day period, two taps deep
- Sees the **Gap** (IN − OUT) framed as a finding, never a verdict
- Sees her **Rich Woman Split** — 10% Giving, 10% Saving, 10% Investing,
  10% Personal Growth, 60% Living — as live targets against what she has done
- Has her archetype's *focus first* line and mantra on screen at all times
- Sees a calendar of the days she has shown up for
- Closes out on day 30 with her Gap, her biggest leak, and her own one sentence
- Starts a new month whenever she's ready, keeping everything before it
- **Sets her own split percentages** instead of being locked to 10/10/10/10/60.
  They must still total 100%. Her current month recalculates as she moves them
- **Opens any past month** from her history — the figures, every category, her
  realisation, and the percentages that were live *at the time*
- **Sees Saver and Investor of the Month** — every woman ranked on how close she
  is to her own target, names and percentages only

**For the team** (at `/admin`, one shared password)

- Women tracking, cohort logging consistency, average Gap, % hitting the split
- Average Gap month over month, so you can see the cohort closing its gap
- Which of the five split lines are landing and which are not
- A breakdown by archetype — how many of each, and how each is trending
- A searchable list of every woman by name, phone or email
- Drill into any woman: her day-by-day log, her Gap history, her split
- A quiet "worth a message this week" list of who has gone quiet or is running
  a shortfall

---

## How the Rich Woman Split is modelled

Three of the five lines have no spending category, because they aren't spending —
they're money she moves to herself. So the split is shown as two different things:

| | Lines | How it's measured |
|---|---|---|
| **Money you spend** | Giving 10%, Living 60% | Read straight from her OUT entries. `Giving` maps to the Giving category; `Living` is every other category summed. |
| **Money you build** | Saving 10%, Investing 10%, Personal Growth 10% | She logs a **move** — a third entry type (`MOVE`) that records money assigned to that line. |

A `MOVE` is deliberately **not** counted as money OUT. Cashflow is
`IN − OUT`; the Gap is the room she has, and the moves are what she did with
it. The dashboard says this in plain language when she has moved anything.

A line counts as landed when she reaches 80% of its target — except Living,
which lands when she stays at or under hers. Three of five landed is
"on track", and that's the figure the admin console reports.

Percentages are per-woman, whole numbers, constrained in the database to total
100. A live month follows her current settings; a closed month keeps the
percentages frozen onto it when it closed, so changing her split never rewrites
her history.

## The leaderboards

`imara_leaderboard()` is the only function that reads across women, and it is
built so that is all it can do: it returns a first name, a percentage, and a
server-computed "is this you" flag. No amounts, no income, no contact details,
and **no woman ids** — an id is the key to her entire map, so the board never
emits one. Ranking on percentage-of-her-own-target rather than amount is what
makes it safe to show everyone: a woman on a small income can top it, and
nobody's income can be read off it.

Left out of a board: anyone with no income logged this period (no target to
measure against) and anyone who has set that line to 0%.

---

## Stack

- **React 18 + Vite**, deployed on Vercel — no router or UI library
- **Supabase** (free tier) for Postgres

Every table has Row Level Security on with **zero policies**, so the public anon
key can read and write nothing directly. All access goes through the
`SECURITY DEFINER` functions in `supabase/schema.sql`, each of which returns
only one woman's own data. The admin side is gated by a bcrypt-hashed shared
password with a small delay on failed attempts.

## Layout

```
supabase/schema.sql       tables, functions, permissions — run once
src/lib/constants.js      archetypes, categories, split lines, copy
src/lib/calc.js           every calculation, shared by both sides of the app
src/lib/supabase.js       the RPC wrapper and human-readable errors
src/screens/              Signup · ArchetypePick · Dashboard · Summary · Admin
src/components/           AddEntry · SplitPanel · MonthGrid · EntryList · Sheet
src/styles.css            the whole design system
```

`calc.js` is deliberately the only place money maths happens, so what the admin
team sees can never drift from what she sees.

## Design

Brand palette throughout: `#4C050B` `#6E1D17` `#BE512A` `#DD8E0D` `#EFA46B`
`#FFE2CC` `#D4854A` `#A11D44` `#FF95AC` `#59BA8E` `#133737` `#E45564` `#FF9E97`
`#FFD7E2` `#FD3E71`. Surplus reads green; a shortfall reads warm amber-clay,
never alarm red.

**Typefaces are an approximation.** Vilgorda and Otterco aren't available as
webfonts, so headlines use **Fraunces** (set lowercase, as Vilgorda is) and body
text uses **Plus Jakarta Sans**. Swap them at `--font-display` / `--font-body`
in `src/styles.css`.

---

© IMARA Wealth Trybe · Leading Ladies Foundation

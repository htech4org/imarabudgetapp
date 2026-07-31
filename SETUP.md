# Setting up the IMARA Daily Budget Tracker

Everything below can be done from a browser. Total time: about 25 minutes.
You need a free Supabase account and a free Vercel account. Nothing here costs money.

You'll do it in four parts:

1. **Supabase** — create the database (10 min)
2. **GitHub** — put the code somewhere Vercel can see it (5 min)
3. **Vercel** — deploy it (5 min)
4. **Check it works** (5 min)

---

## Part 1 — Supabase

### 1.1 Create the project

1. Go to **https://supabase.com** and sign up (GitHub login is quickest).
2. Click **New project**.
3. Fill in:
   - **Name:** `imara-budget-tracker`
   - **Database Password:** click **Generate a password**, then **copy it somewhere safe**.
     You won't need it for this app, but you'll want it if you ever come back.
   - **Region:** pick the one closest to most of the women (e.g. `West EU (London)`
     or `East US`). This only affects speed, nothing else.
   - **Plan:** Free.
4. Click **Create new project** and wait ~2 minutes while it sets up.

### 1.2 Create the tables

1. In the left sidebar, click **SQL Editor**.
2. Click **New query**.
3. Open the file `supabase/schema.sql` from this project, copy **the whole file**,
   and paste it into the editor.
4. Click **Run** (or press ⌘/Ctrl + Enter).
5. You should see **Success. No rows returned.** That's correct — it just built
   the tables and functions.

If you get an error, don't run it piece by piece. Copy the error message and
check you pasted the entire file.

### 1.3 Set the admin password

This is the single shared password the IMARA Admin team will use to open the
team console. Anyone with it can see every woman's data, so treat it like a key.

1. Still in the **SQL Editor**, click **New query**.
2. Paste this in, replacing `ChooseAStrongPasswordHere` with your real password:

```sql
insert into public.app_config (key, value)
values ('admin_password_hash', extensions.crypt('ChooseAStrongPasswordHere', extensions.gen_salt('bf')))
on conflict (key) do update set value = excluded.value;
```

3. Click **Run**.

> **If that errors** with something about `schema "extensions" does not exist`,
> run the same thing without the `extensions.` prefixes:
> ```sql
> insert into public.app_config (key, value)
> values ('admin_password_hash', crypt('ChooseAStrongPasswordHere', gen_salt('bf')))
> on conflict (key) do update set value = excluded.value;
> ```

The password is stored hashed — even you can't read it back out of the database.
To change it later, just run the same statement again with a new password.

### 1.4 Copy your two keys

1. In the left sidebar click the **gear icon** (Project Settings) → **API**.
2. Copy and keep these two values — you'll paste them into Vercel in Part 3:
   - **Project URL** — looks like `https://abcdefgh.supabase.co`
   - **anon public** key — a long string starting with `eyJ...`

The anon key is *meant* to be public. The database is protected by Row Level
Security plus the locked-down functions, not by hiding this key.

---

## Part 2 — GitHub

Vercel deploys from a Git repository, so the code needs to live in one.

### If you have `git` installed

From inside the `imara-budget-tracker` folder:

```bash
git init && git add -A && git commit -m "IMARA Daily Budget Tracker"
```

Then create an empty repository at **https://github.com/new** (name it
`imara-budget-tracker`, keep it **Private**, and do *not* add a README), and run
the two commands GitHub shows you under *"…or push an existing repository"*.

### If you don't have `git`

1. Go to **https://github.com/new**, name it `imara-budget-tracker`, set it to
   **Private**, tick **Add a README file**, and click **Create repository**.
2. On the repository page click **Add file → Upload files**.
3. Drag in everything from the `imara-budget-tracker` folder **except** the
   `node_modules` folder (there won't be one unless you ran the app locally).
   Make sure the `src` and `supabase` folders come across with their contents.
4. Click **Commit changes**.

---

## Part 3 — Vercel

1. Go to **https://vercel.com** and sign up with the same GitHub account.
2. Click **Add New… → Project**.
3. Find `imara-budget-tracker` in the list and click **Import**.
4. Vercel will detect Vite automatically. Leave Framework Preset, Build Command
   and Output Directory exactly as they are.
5. Expand **Environment Variables** and add these two (from step 1.4):

   | Name | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | your Project URL, e.g. `https://abcdefgh.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | your long `eyJ...` anon key |

   Add each one, then click **Add**. Make sure there are no spaces or line
   breaks at the ends of the values.
6. Click **Deploy** and wait ~1 minute.

You'll get a live link like `https://imara-budget-tracker.vercel.app`.

**That link is what you send to the women.** No account, no app store, nothing
to install. On a phone they can tap Share → *Add to Home Screen* and it behaves
like an app.

### The admin page

Add `/admin` to the end of the same link:

```
https://imara-budget-tracker.vercel.app/admin
```

It asks for the password you set in step 1.3. Share that link and password only
with the IMARA Admin team — there is nothing on the woman-facing side that
points to it.

### A nicer web address (optional)

In Vercel: **Settings → Domains → Add**. If you own something like
`leadingladies.org`, you can point `tracker.leadingladies.org` at it. Vercel
gives you the exact DNS records to add.

---

## Part 4 — Check it works

Do this yourself before sending the link to anyone.

1. Open the live link. You should see **the daily budget tracker** on a deep
   maroon screen. If instead it says *"almost there"*, the environment
   variables didn't take — go back to Part 3 step 5, fix them, then in Vercel go
   to **Deployments → ⋯ → Redeploy** (environment variables only apply to
   *new* builds).
2. Sign up as a test woman. Use a real-looking phone and email you'll recognise,
   e.g. name `Test`, phone `0000000001`.
3. Pick any archetype.
4. Add one **money in** and one **money out**. Check the Gap changes.
5. Tap **I moved money into Saving** on the split panel and log an amount.
6. Open `/admin`, enter your password, and confirm `Test` shows up with the
   numbers you just entered.
7. Delete the test woman when you're done — Supabase → **Table Editor** →
   `women` → click the row → delete. Her entries and periods go with her.

---

## Trying it before you build anything (demo mode)

If you just want to see and click the app — to show it in a session, or to
decide on wording — you don't need Supabase at all. Install
[Node.js](https://nodejs.org) (the big green LTS button), then from inside the
`imara-budget-tracker` folder:

```bash
npm install
```

```bash
npm run demo
```

Open **http://localhost:5199**. It runs against a fake in-memory database
seeded with six women across two months, so every screen has something in it.

- **Sign up as anyone** — or tap *I've been here before* and enter `0800000000`
  through `0800000005` to open a seeded woman's map (`0800000004` is Zara, who
  has the fullest data).
- **Admin console:** http://localhost:5199/admin, password `imara`
- Everything resets when you reload the page. Nothing is saved anywhere.

Demo mode is completely separate from the real app: `npm run build` never
touches `src/lib/supabase.demo.js`, so the fake database cannot reach the
deployed site. Stop the server with `Ctrl+C`.

---

## Running it on your own computer (optional)

Only needed if you want to change the design or wording. Requires
[Node.js](https://nodejs.org) 18 or newer.

```bash
npm install
cp .env.example .env.local
```

Put your two Supabase values into `.env.local`, then:

```bash
npm run dev
```

Open the link it prints (usually `http://localhost:5173`). The admin page is at
`http://localhost:5173/admin`.

Any change you push to GitHub redeploys on Vercel automatically.

---

## Things worth knowing

**How a woman gets back in.** Her identity is stored on her phone, so returning
to the link just works. If she clears her browser or switches phone, she taps
**I've been here before** and enters her phone number or email. There is no
password on the woman-facing side — that's deliberate, so nothing stands between
her and logging today's number. The practical consequence is that anyone who
knows her phone number *and* has the link could open her map. For a closed
community tracker this is the right trade; if that ever stops being true, the
place to add a one-time code by SMS is the `imara_lookup` function.

**Nobody can read the database directly.** Row Level Security is on for every
table with no policies at all, so the public key grants access to nothing. Every
read and write goes through the specific functions in `schema.sql`, each of which
only ever returns one woman's own data.

**The admin password.** It's stored as a bcrypt hash and failed attempts are
slowed down by a fraction of a second, which makes guessing impractical. Change
it whenever someone leaves the team, using the SQL in step 1.3.

**Free tier limits.** Supabase free gives 500 MB of database — this app uses a
few kilobytes per woman per month, so that's effectively thousands of women for
years. The one thing to watch: **a free Supabase project pauses after 7 days
with no activity.** A live tracker is used daily so this won't happen, but if
you set it up and then don't launch for a few weeks, go into the Supabase
dashboard and click **Restore** before sending the link out.

**Backups.** Supabase → **Table Editor** → pick a table → **Export → CSV**.
Worth doing at the end of each cohort.

**Changing the money categories or the split percentages.** They're all in one
file: `src/lib/constants.js`. If you change the eight categories there, also
update `LIVING_CATEGORIES` if the new one isn't part of Living.

**The typefaces are an approximation.** Vilgorda and Otterco aren't available as
webfonts, so the app uses Fraunces (headlines, set lowercase as Vilgorda is) and
Plus Jakarta Sans (body). To swap in the real files later, host them and change
`--font-display` and `--font-body` at the top of `src/styles.css`. Nothing else
needs to change.

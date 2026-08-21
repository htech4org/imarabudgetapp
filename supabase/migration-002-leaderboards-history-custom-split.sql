-- ============================================================================
--  MIGRATION 002 — Leaderboards · Month history · Custom split percentages
--  IMARA Daily Budget Tracker
--
--  Run this ONCE on an existing database, in Supabase → SQL Editor → New query.
--  Safe to run twice: every statement is guarded.
--  Nothing is deleted and no existing figures change — every woman already on
--  the tracker is given the standard 10/10/10/10/60 until she edits it.
--
--  (A brand-new project does not need this file. supabase/schema.sql already
--   contains everything below.)
-- ============================================================================


-- ────────────────────────────────────────────────────────────────────────────
--  1. HER OWN SPLIT PERCENTAGES
--     Stored as whole numbers (10 means 10%) and constrained to total 100, so
--     a split that does not add up cannot physically be written.
-- ────────────────────────────────────────────────────────────────────────────

alter table public.women
  add column if not exists pct_giving    int not null default 10,
  add column if not exists pct_saving    int not null default 10,
  add column if not exists pct_investing int not null default 10,
  add column if not exists pct_growth    int not null default 10,
  add column if not exists pct_living    int not null default 60;

alter table public.women drop constraint if exists women_split_totals_100;
alter table public.women add constraint women_split_totals_100 check (
  pct_giving + pct_saving + pct_investing + pct_growth + pct_living = 100
  and least(pct_giving, pct_saving, pct_investing, pct_growth, pct_living) >= 0
);


-- ────────────────────────────────────────────────────────────────────────────
--  2. THE PERCENTAGES A PERIOD WAS ACTUALLY RUN UNDER
--     Null while the month is live (it follows her current settings, so the
--     dashboard recalculates the moment she changes them). Frozen on close.
-- ────────────────────────────────────────────────────────────────────────────

alter table public.periods
  add column if not exists pct_giving    int,
  add column if not exists pct_saving    int,
  add column if not exists pct_investing int,
  add column if not exists pct_growth    int,
  add column if not exists pct_living    int;


-- ────────────────────────────────────────────────────────────────────────────
--  3. THE HISTORY RECORD
--     Written once, when a month closes. Holds that month's final figures and
--     the percentages that were live at the time, so a later settings change
--     can never rewrite what her targets used to be.
-- ────────────────────────────────────────────────────────────────────────────

create table if not exists public.period_archives (
  id             uuid primary key default gen_random_uuid(),
  woman_id       uuid not null references public.women(id)   on delete cascade,
  period_id      uuid not null unique references public.periods(id) on delete cascade,
  period_number  int  not null,
  start_date     date not null,
  end_date       date not null,

  total_in       numeric(14,2) not null default 0,
  total_out      numeric(14,2) not null default 0,
  total_moved    numeric(14,2) not null default 0,
  gap            numeric(14,2) not null default 0,

  categories     jsonb not null default '{}'::jsonb,  -- {"Housing": 42000, …}
  moves          jsonb not null default '{}'::jsonb,  -- {"saving": 9000, …}

  pct_giving     int not null,
  pct_saving     int not null,
  pct_investing  int not null,
  pct_growth     int not null,
  pct_living     int not null,

  leak_category  text,
  leak_amount    numeric(14,2),
  leak_share     numeric(6,4),
  realisation    text,

  days_logged    int not null default 0,
  days_in_period int not null default 30,
  archived_at    timestamptz not null default now()
);

create index if not exists period_archives_woman_idx on public.period_archives (woman_id);

alter table public.period_archives enable row level security;
revoke all on public.period_archives from anon, authenticated;


-- ────────────────────────────────────────────────────────────────────────────
--  4. BUILDING THE ARCHIVE
--
--  These category rules must stay identical to src/lib/calc.js:
--    · an OUT entry whose category is not one of the eight falls into
--      "Everything Else"
--    · Living is every OUT category except Giving
--  They are the only maths duplicated between the app and the database.
-- ────────────────────────────────────────────────────────────────────────────

create or replace function public.imara_archive_period(p_period_id uuid)
returns void
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_period   public.periods%rowtype;
  v_woman    public.women%rowtype;
  v_in       numeric := 0;
  v_out      numeric := 0;
  v_moved    numeric := 0;
  v_days     int     := 0;
  v_cats     jsonb   := '{}'::jsonb;
  v_moves    jsonb   := '{}'::jsonb;
  v_leak_cat text;
  v_leak_amt numeric;
begin
  select * into v_period from public.periods where id = p_period_id;
  if not found then return; end if;
  select * into v_woman from public.women where id = v_period.woman_id;

  select coalesce(sum(amount) filter (where type = 'IN'),   0),
         coalesce(sum(amount) filter (where type = 'OUT'),  0),
         coalesce(sum(amount) filter (where type = 'MOVE'), 0),
         count(distinct entry_date)
    into v_in, v_out, v_moved, v_days
    from public.entries where period_id = p_period_id;

  select coalesce(jsonb_object_agg(cat, amt), '{}'::jsonb) into v_cats from (
    select case when category in ('Housing','Food & Groceries','Transport & Fuel',
                                  'Utilities & Bills','Giving','Debt Repayments',
                                  'Personal & Beauty','Everything Else')
                then category else 'Everything Else' end as cat,
           sum(amount) as amt
      from public.entries
     where period_id = p_period_id and type = 'OUT'
     group by 1
  ) c;

  select coalesce(jsonb_object_agg(k, amt), '{}'::jsonb) into v_moves from (
    select case category when 'Saving'          then 'saving'
                         when 'Investing'       then 'investing'
                         when 'Personal Growth' then 'growth' end as k,
           sum(amount) as amt
      from public.entries
     where period_id = p_period_id and type = 'MOVE'
       and category in ('Saving','Investing','Personal Growth')
     group by 1
  ) m;

  select cat, amt into v_leak_cat, v_leak_amt from (
    select case when category in ('Housing','Food & Groceries','Transport & Fuel',
                                  'Utilities & Bills','Giving','Debt Repayments',
                                  'Personal & Beauty','Everything Else')
                then category else 'Everything Else' end as cat,
           sum(amount) as amt
      from public.entries
     where period_id = p_period_id and type = 'OUT'
     group by 1
     order by 2 desc
     limit 1
  ) l;

  insert into public.period_archives (
    woman_id, period_id, period_number, start_date, end_date,
    total_in, total_out, total_moved, gap, categories, moves,
    pct_giving, pct_saving, pct_investing, pct_growth, pct_living,
    leak_category, leak_amount, leak_share, realisation,
    days_logged, days_in_period
  ) values (
    v_period.woman_id, v_period.id, v_period.period_number,
    v_period.start_date, v_period.end_date,
    v_in, v_out, v_moved, v_in - v_out, v_cats, v_moves,
    coalesce(v_period.pct_giving,    v_woman.pct_giving),
    coalesce(v_period.pct_saving,    v_woman.pct_saving),
    coalesce(v_period.pct_investing, v_woman.pct_investing),
    coalesce(v_period.pct_growth,    v_woman.pct_growth),
    coalesce(v_period.pct_living,    v_woman.pct_living),
    v_leak_cat, v_leak_amt,
    case when v_out > 0 and v_leak_amt is not null then round(v_leak_amt / v_out, 4) else null end,
    v_period.realisation,
    coalesce(v_days, 0),
    (v_period.end_date - v_period.start_date) + 1
  )
  on conflict (period_id) do update set
    total_in = excluded.total_in, total_out = excluded.total_out,
    total_moved = excluded.total_moved, gap = excluded.gap,
    categories = excluded.categories, moves = excluded.moves,
    leak_category = excluded.leak_category, leak_amount = excluded.leak_amount,
    leak_share = excluded.leak_share, realisation = excluded.realisation,
    days_logged = excluded.days_logged, archived_at = now();
    -- percentages are deliberately NOT updated on conflict: once a month has
    -- been archived, the targets it ran under are settled history.
end $$;


-- ────────────────────────────────────────────────────────────────────────────
--  5. SETTING HER SPLIT
-- ────────────────────────────────────────────────────────────────────────────

create or replace function public.imara_set_split(
  p_woman_id  uuid,
  p_giving    int,
  p_saving    int,
  p_investing int,
  p_growth    int,
  p_living    int
) returns json
language plpgsql security definer set search_path = public, extensions as $$
begin
  if p_giving is null or p_saving is null or p_investing is null
     or p_growth is null or p_living is null then
    raise exception 'split_incomplete';
  end if;
  if least(p_giving, p_saving, p_investing, p_growth, p_living) < 0 then
    raise exception 'split_negative';
  end if;
  if p_giving + p_saving + p_investing + p_growth + p_living <> 100 then
    raise exception 'split_not_100';
  end if;

  update public.women
     set pct_giving = p_giving, pct_saving = p_saving, pct_investing = p_investing,
         pct_growth = p_growth, pct_living = p_living
   where id = p_woman_id;
  if not found then raise exception 'no_such_woman'; end if;

  return public.imara_state(p_woman_id);
end $$;


-- ────────────────────────────────────────────────────────────────────────────
--  6. THE LEADERBOARDS
--
--  Deliberately the only function in this app that reads across women. It is
--  built so that is all it can ever do: it returns first names and a
--  percentage, and nothing else. No amounts, no income, no contact details,
--  and — importantly — no woman ids, because a woman's id is the key to her
--  whole map. "Which row is mine" is answered server-side by comparing against
--  the id the caller already holds, so nobody learns anyone else's.
--
--  Ranking is on her own target: her Saving ÷ (her IN × HER saving %) × 100.
--  Uncapped, so going past 100% shows. A woman is left out of a board when she
--  has logged no income yet (there is no target to measure against), or when
--  she has set that line to 0% (dividing by a zero target is meaningless).
-- ────────────────────────────────────────────────────────────────────────────

create or replace function public.imara_leaderboard(p_woman_id uuid default null)
returns json
language sql stable security definer set search_path = public, extensions as $$
  with live as (
    select w.id, w.first_name, w.pct_saving, w.pct_investing,
           coalesce(sum(e.amount) filter (where e.type = 'IN'), 0) as money_in,
           coalesce(sum(e.amount) filter (where e.type = 'MOVE' and e.category = 'Saving'), 0)    as saved,
           coalesce(sum(e.amount) filter (where e.type = 'MOVE' and e.category = 'Investing'), 0) as invested
      from public.women w
      join public.periods p on p.woman_id = w.id and p.status = 'active'
      left join public.entries e on e.period_id = p.id
     group by w.id, w.first_name, w.pct_saving, w.pct_investing
  ),
  savers as (
    select first_name, (id = p_woman_id) as is_you,
           round((saved / (money_in * pct_saving / 100.0)) * 100, 1) as pct
      from live where money_in > 0 and pct_saving > 0
  ),
  investors as (
    select first_name, (id = p_woman_id) as is_you,
           round((invested / (money_in * pct_investing / 100.0)) * 100, 1) as pct
      from live where money_in > 0 and pct_investing > 0
  )
  select json_build_object(
    'saving', coalesce((
      select json_agg(json_build_object('name', first_name, 'pct', pct,
                                        'is_you', is_you, 'rank', rnk)
                      order by rnk, first_name)
        from (select first_name, is_you, pct,
                     rank() over (order by pct desc) as rnk from savers) s
    ), '[]'::json),
    'investing', coalesce((
      select json_agg(json_build_object('name', first_name, 'pct', pct,
                                        'is_you', is_you, 'rank', rnk)
                      order by rnk, first_name)
        from (select first_name, is_you, pct,
                     rank() over (order by pct desc) as rnk from investors) i
    ), '[]'::json)
  );
$$;


-- ────────────────────────────────────────────────────────────────────────────
--  7. EXISTING FUNCTIONS, UPDATED
-- ────────────────────────────────────────────────────────────────────────────

-- imara_state now also carries her percentages and her archived months.
create or replace function public.imara_state(p_woman_id uuid)
returns json
language plpgsql security definer set search_path = public, extensions as $$
declare result json;
begin
  select json_build_object(
    'woman', (
      select to_json(w) from (
        select id, first_name, phone, email, archetype, currency, created_at,
               pct_giving, pct_saving, pct_investing, pct_growth, pct_living
        from public.women where id = p_woman_id
      ) w
    ),
    'periods', coalesce((
      select json_agg(p order by p.period_number desc) from (
        select id, period_number, start_date, end_date, status, realisation, closed_at,
               pct_giving, pct_saving, pct_investing, pct_growth, pct_living
        from public.periods where woman_id = p_woman_id
      ) p
    ), '[]'::json),
    'entries', coalesce((
      select json_agg(e order by e.entry_date desc, e.created_at desc) from (
        select id, period_id, entry_date, type, category, amount, note, created_at
        from public.entries where woman_id = p_woman_id
      ) e
    ), '[]'::json),
    'archives', coalesce((
      select json_agg(a order by a.period_number desc) from (
        select id, period_id, period_number, start_date, end_date,
               total_in, total_out, total_moved, gap, categories, moves,
               pct_giving, pct_saving, pct_investing, pct_growth, pct_living,
               leak_category, leak_amount, leak_share, realisation,
               days_logged, days_in_period, archived_at
        from public.period_archives where woman_id = p_woman_id
      ) a
    ), '[]'::json)
  ) into result;

  if result is null or (result->>'woman') is null then
    raise exception 'no_such_woman';
  end if;
  return result;
end $$;


-- Closing a month now freezes its percentages and writes the history record.
create or replace function public.imara_close_period(p_woman_id uuid, p_realisation text)
returns json
language plpgsql security definer set search_path = public, extensions as $$
declare v_period_id uuid;
begin
  update public.periods p
     set status        = 'closed',
         realisation   = nullif(trim(coalesce(p_realisation,'')),''),
         closed_at     = now(),
         pct_giving    = coalesce(p.pct_giving,    w.pct_giving),
         pct_saving    = coalesce(p.pct_saving,    w.pct_saving),
         pct_investing = coalesce(p.pct_investing, w.pct_investing),
         pct_growth    = coalesce(p.pct_growth,    w.pct_growth),
         pct_living    = coalesce(p.pct_living,    w.pct_living)
    from public.women w
   where p.woman_id = p_woman_id and p.status = 'active' and w.id = p_woman_id
  returning p.id into v_period_id;

  if v_period_id is null then raise exception 'no_active_period'; end if;
  perform public.imara_archive_period(v_period_id);
  return public.imara_state(p_woman_id);
end $$;


-- Starting a new month archives the one it closes, so a month is never lost
-- just because she skipped the close-out screen.
create or replace function public.imara_new_period(p_woman_id uuid)
returns json
language plpgsql security definer set search_path = public, extensions as $$
declare v_period_id uuid;
begin
  update public.periods p
     set status        = 'closed',
         closed_at     = coalesce(p.closed_at, now()),
         pct_giving    = coalesce(p.pct_giving,    w.pct_giving),
         pct_saving    = coalesce(p.pct_saving,    w.pct_saving),
         pct_investing = coalesce(p.pct_investing, w.pct_investing),
         pct_growth    = coalesce(p.pct_growth,    w.pct_growth),
         pct_living    = coalesce(p.pct_living,    w.pct_living)
    from public.women w
   where p.woman_id = p_woman_id and p.status = 'active' and w.id = p_woman_id
  returning p.id into v_period_id;

  if v_period_id is not null then
    perform public.imara_archive_period(v_period_id);
  end if;

  insert into public.periods (woman_id, period_number, start_date, end_date)
  values (
    p_woman_id,
    coalesce((select max(period_number) from public.periods where woman_id = p_woman_id), 0) + 1,
    current_date,
    current_date + 29
  );
  return public.imara_state(p_woman_id);
end $$;


-- A closed month is settled. Entries inside one can no longer be removed,
-- which is what keeps an archived summary honest.
create or replace function public.imara_delete_entry(p_woman_id uuid, p_entry_id uuid)
returns json
language plpgsql security definer set search_path = public, extensions as $$
begin
  delete from public.entries e
   using public.periods p
   where e.id = p_entry_id
     and e.woman_id = p_woman_id
     and p.id = e.period_id
     and p.status = 'active';
  return public.imara_state(p_woman_id);
end $$;


-- The admin payload gains each woman's percentages and every archived month.
create or replace function public.imara_admin_dashboard(p_password text)
returns json
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.imara_admin_check(p_password) then
    raise exception 'bad_password';
  end if;

  return json_build_object(
    'women', coalesce((
      select json_agg(w order by w.created_at desc) from (
        select id, first_name, phone, email, archetype, currency, created_at,
               pct_giving, pct_saving, pct_investing, pct_growth, pct_living
        from public.women
      ) w
    ), '[]'::json),
    'periods', coalesce((
      select json_agg(p order by p.start_date desc) from (
        select id, woman_id, period_number, start_date, end_date,
               status, realisation, closed_at,
               pct_giving, pct_saving, pct_investing, pct_growth, pct_living
        from public.periods
      ) p
    ), '[]'::json),
    'entries', coalesce((
      select json_agg(e order by e.entry_date desc) from (
        select id, woman_id, period_id, entry_date, type, category, amount, note
        from public.entries
      ) e
    ), '[]'::json),
    'archives', coalesce((
      select json_agg(a order by a.start_date desc) from (
        select id, woman_id, period_id, period_number, start_date, end_date,
               total_in, total_out, total_moved, gap, categories, moves,
               pct_giving, pct_saving, pct_investing, pct_growth, pct_living,
               leak_category, leak_amount, leak_share, realisation,
               days_logged, days_in_period
        from public.period_archives
      ) a
    ), '[]'::json),
    'generated_at', now()
  );
end $$;


-- ────────────────────────────────────────────────────────────────────────────
--  8. PERMISSIONS
-- ────────────────────────────────────────────────────────────────────────────

-- Internal only — never callable directly.
revoke all on function public.imara_archive_period(uuid) from public, anon, authenticated;

grant execute on function public.imara_set_split(uuid,int,int,int,int,int) to anon, authenticated;
grant execute on function public.imara_leaderboard(uuid)                   to anon, authenticated;


-- ────────────────────────────────────────────────────────────────────────────
--  9. BACKFILL
--     Any month that was already closed before this migration gets a history
--     record built from its entries, using today's percentages for that woman
--     (there is no record of what they were, because they did not exist yet).
-- ────────────────────────────────────────────────────────────────────────────

do $$
declare r record;
begin
  for r in select id from public.periods where status = 'closed' loop
    perform public.imara_archive_period(r.id);
  end loop;
end $$;

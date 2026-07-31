-- ============================================================================
--  IMARA DAILY BUDGET TRACKER — SUPABASE SCHEMA
--  Leading Ladies Foundation · IMARA Wealth Trybe
--
--  HOW TO USE
--  1. Open your Supabase project → SQL Editor → New query
--  2. Paste this ENTIRE file and click Run
--  3. Then run the ONE extra line at the very bottom of this file to set
--     your admin password (instructions are there)
--
--  SECURITY MODEL
--  The app has no login/passwords for the women (that is deliberate — the
--  link must just work). So the database is locked down instead:
--    · Row Level Security is ON for every table with NO policies, which
--      means the public anon key can read/write NOTHING directly.
--    · All access goes through the SECURITY DEFINER functions below.
--    · A woman's own uuid acts as her private key. Knowing it (or her
--      phone/email) is what grants access to her data — nothing else.
--    · The admin side is gated by a bcrypt-hashed shared password.
-- ============================================================================

-- Supabase already has both of these; the guards just make the file safe to
-- run on a plain Postgres too. Every function below sets its search_path to
-- include `extensions`, so crypt() resolves wherever pgcrypto happens to live.
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;


-- ============================================================================
--  TABLES
-- ============================================================================

-- Her profile. Created once, kept forever, survives every new month.
create table if not exists public.women (
  id          uuid primary key default gen_random_uuid(),
  first_name  text not null,
  phone       text not null,
  email       text not null,
  archetype   text check (archetype in ('kemi','annie','ama','thandi','zara')),
  currency    text not null default '₦',
  created_at  timestamptz not null default now()
);

-- Phone/email are how she gets back in on a new device, so they must be unique.
create unique index if not exists women_phone_key on public.women (phone);
create unique index if not exists women_email_key on public.women (lower(email));


-- A rolling one-month tracking period. She can run these back to back.
create table if not exists public.periods (
  id             uuid primary key default gen_random_uuid(),
  woman_id       uuid not null references public.women(id) on delete cascade,
  period_number  int  not null default 1,
  start_date     date not null default current_date,
  end_date       date not null,
  status         text not null default 'active' check (status in ('active','closed')),
  realisation    text,                      -- her one-sentence close-out line
  closed_at      timestamptz,
  created_at     timestamptz not null default now()
);

-- Only one period can be open at a time.
create unique index if not exists periods_one_active
  on public.periods (woman_id) where status = 'active';
create index if not exists periods_woman_idx on public.periods (woman_id);


-- Every logged movement of money.
--   IN   = income, any source
--   OUT  = spending, tagged to one of the 8 categories
--   MOVE = money assigned to a Rich Woman Split line she is BUILDING
--          (Saving / Investing / Personal Growth). Deliberately not counted
--          as OUT — moving money to yourself is not spending it.
create table if not exists public.entries (
  id          uuid primary key default gen_random_uuid(),
  woman_id    uuid not null references public.women(id) on delete cascade,
  period_id   uuid not null references public.periods(id) on delete cascade,
  entry_date  date not null,
  type        text not null check (type in ('IN','OUT','MOVE')),
  category    text,
  amount      numeric(14,2) not null check (amount > 0),
  note        text,
  created_at  timestamptz not null default now()
);

create index if not exists entries_woman_idx  on public.entries (woman_id);
create index if not exists entries_period_idx on public.entries (period_id);
create index if not exists entries_date_idx   on public.entries (entry_date);


-- Key/value config. Holds the hashed admin password.
create table if not exists public.app_config (
  key   text primary key,
  value text not null
);


-- ============================================================================
--  LOCK EVERYTHING DOWN
-- ============================================================================

alter table public.women      enable row level security;
alter table public.periods    enable row level security;
alter table public.entries    enable row level security;
alter table public.app_config enable row level security;

-- No policies are created on purpose: with RLS on and zero policies, the
-- anon and authenticated roles can touch nothing directly.
revoke all on public.women      from anon, authenticated;
revoke all on public.periods    from anon, authenticated;
revoke all on public.entries    from anon, authenticated;
revoke all on public.app_config from anon, authenticated;


-- ============================================================================
--  INTERNAL HELPERS
-- ============================================================================

-- Digits-only phone so "0803 123 4567" and "08031234567" are the same woman.
create or replace function public.imara_norm_phone(p text)
returns text language sql immutable as $$
  select regexp_replace(coalesce(p,''), '[^0-9+]', '', 'g');
$$;


-- Everything the app needs about one woman, in a single round trip.
create or replace function public.imara_state(p_woman_id uuid)
returns json
language plpgsql security definer set search_path = public, extensions as $$
declare result json;
begin
  select json_build_object(
    'woman', (
      select to_json(w) from (
        select id, first_name, phone, email, archetype, currency, created_at
        from public.women where id = p_woman_id
      ) w
    ),
    'periods', coalesce((
      select json_agg(p order by p.period_number desc) from (
        select id, period_number, start_date, end_date, status, realisation, closed_at
        from public.periods where woman_id = p_woman_id
      ) p
    ), '[]'::json),
    'entries', coalesce((
      select json_agg(e order by e.entry_date desc, e.created_at desc) from (
        select id, period_id, entry_date, type, category, amount, note, created_at
        from public.entries where woman_id = p_woman_id
      ) e
    ), '[]'::json)
  ) into result;

  if result is null or (result->>'woman') is null then
    raise exception 'no_such_woman';
  end if;
  return result;
end $$;


-- ============================================================================
--  WOMAN-FACING FUNCTIONS
-- ============================================================================

-- Sign up. If this phone or email is already known, she is simply let back in
-- (this doubles as "continue on a new phone") and her name is refreshed.
create or replace function public.imara_signup(
  p_first_name text,
  p_phone      text,
  p_email      text,
  p_currency   text default '₦'
) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_phone text := public.imara_norm_phone(p_phone);
  v_email text := lower(trim(coalesce(p_email, '')));
  v_name  text := trim(coalesce(p_first_name, ''));
  v_id    uuid;
begin
  if v_name = ''  then raise exception 'name_required';  end if;
  if length(v_phone) < 7 then raise exception 'phone_required'; end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'email_required'; end if;

  select id into v_id from public.women
   where phone = v_phone or lower(email) = v_email
   limit 1;

  if v_id is null then
    insert into public.women (first_name, phone, email, currency)
    values (v_name, v_phone, v_email, coalesce(nullif(p_currency,''), '₦'))
    returning id into v_id;
  else
    update public.women
       set first_name = v_name,
           currency   = coalesce(nullif(p_currency,''), currency)
     where id = v_id;
  end if;

  -- Make sure she always has an open month to log into.
  if not exists (select 1 from public.periods where woman_id = v_id and status = 'active') then
    insert into public.periods (woman_id, period_number, start_date, end_date)
    values (
      v_id,
      coalesce((select max(period_number) from public.periods where woman_id = v_id), 0) + 1,
      current_date,
      current_date + 29
    );
  end if;

  return public.imara_state(v_id);
end $$;


-- Get back in from a phone number or an email address.
create or replace function public.imara_lookup(p_identifier text)
returns json
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_raw   text := trim(coalesce(p_identifier, ''));
  v_phone text := public.imara_norm_phone(v_raw);
  v_id    uuid;
begin
  select id into v_id from public.women
   where lower(email) = lower(v_raw)
      or (length(v_phone) >= 7 and phone = v_phone)
   limit 1;

  if v_id is null then raise exception 'no_such_woman'; end if;
  return public.imara_state(v_id);
end $$;


create or replace function public.imara_set_archetype(p_woman_id uuid, p_archetype text)
returns json
language plpgsql security definer set search_path = public, extensions as $$
begin
  if p_archetype not in ('kemi','annie','ama','thandi','zara') then
    raise exception 'bad_archetype';
  end if;
  update public.women set archetype = p_archetype where id = p_woman_id;
  if not found then raise exception 'no_such_woman'; end if;
  return public.imara_state(p_woman_id);
end $$;


-- Log one movement of money into her open period.
create or replace function public.imara_add_entry(
  p_woman_id uuid,
  p_date     date,
  p_type     text,
  p_category text,
  p_amount   numeric,
  p_note     text default null
) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare v_period public.periods%rowtype;
begin
  select * into v_period from public.periods
   where woman_id = p_woman_id and status = 'active';
  if not found then raise exception 'no_active_period'; end if;

  if p_type not in ('IN','OUT','MOVE') then raise exception 'bad_type'; end if;
  if p_amount is null or p_amount <= 0    then raise exception 'bad_amount'; end if;
  if p_date < v_period.start_date or p_date > v_period.end_date then
    raise exception 'date_outside_period';
  end if;

  insert into public.entries (woman_id, period_id, entry_date, type, category, amount, note)
  values (p_woman_id, v_period.id, p_date, p_type, nullif(trim(coalesce(p_category,'')),''),
          round(p_amount, 2), nullif(trim(coalesce(p_note,'')),''));

  return public.imara_state(p_woman_id);
end $$;


create or replace function public.imara_delete_entry(p_woman_id uuid, p_entry_id uuid)
returns json
language plpgsql security definer set search_path = public, extensions as $$
begin
  delete from public.entries where id = p_entry_id and woman_id = p_woman_id;
  return public.imara_state(p_woman_id);
end $$;


-- Close out the month with her one-sentence realisation.
create or replace function public.imara_close_period(p_woman_id uuid, p_realisation text)
returns json
language plpgsql security definer set search_path = public, extensions as $$
begin
  update public.periods
     set status      = 'closed',
         realisation = nullif(trim(coalesce(p_realisation,'')),''),
         closed_at   = now()
   where woman_id = p_woman_id and status = 'active';
  if not found then raise exception 'no_active_period'; end if;
  return public.imara_state(p_woman_id);
end $$;


-- Start the next month. Profile, archetype and every past month stay intact.
create or replace function public.imara_new_period(p_woman_id uuid)
returns json
language plpgsql security definer set search_path = public, extensions as $$
begin
  update public.periods
     set status = 'closed', closed_at = coalesce(closed_at, now())
   where woman_id = p_woman_id and status = 'active';

  insert into public.periods (woman_id, period_number, start_date, end_date)
  values (
    p_woman_id,
    coalesce((select max(period_number) from public.periods where woman_id = p_woman_id), 0) + 1,
    current_date,
    current_date + 29
  );
  return public.imara_state(p_woman_id);
end $$;


-- ============================================================================
--  ADMIN FUNCTIONS
-- ============================================================================

create or replace function public.imara_admin_check(p_password text)
returns boolean
language plpgsql security definer set search_path = public, extensions as $$
declare h text;
begin
  select value into h from public.app_config where key = 'admin_password_hash';
  if h is null or p_password is null then
    perform pg_sleep(0.4);
    return false;
  end if;
  if h = crypt(p_password, h) then
    return true;
  end if;
  perform pg_sleep(0.4);   -- small brake on password guessing
  return false;
end $$;


-- One payload for the whole admin console. The cohort is community sized, so
-- the aggregate maths is done in the app using the exact same functions the
-- women see — one source of truth, no drift between the two sides.
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
        select id, first_name, phone, email, archetype, currency, created_at
        from public.women
      ) w
    ), '[]'::json),
    'periods', coalesce((
      select json_agg(p order by p.start_date desc) from (
        select id, woman_id, period_number, start_date, end_date,
               status, realisation, closed_at
        from public.periods
      ) p
    ), '[]'::json),
    'entries', coalesce((
      select json_agg(e order by e.entry_date desc) from (
        select id, woman_id, period_id, entry_date, type, category, amount, note
        from public.entries
      ) e
    ), '[]'::json),
    'generated_at', now()
  );
end $$;


-- ============================================================================
--  PERMISSIONS — the anon key may ONLY call these functions
-- ============================================================================

-- The admin password check is internal only — it must never be callable on
-- its own, or it becomes a free password oracle.
revoke all on function public.imara_admin_check(text)                            from public, anon, authenticated;

-- imara_state is safe to expose: it takes her uuid, which is the secret. No
-- uuid, no data — and it can only ever return that one woman's own map.
grant execute on function public.imara_state(uuid)                               to anon, authenticated;
grant execute on function public.imara_signup(text,text,text,text)               to anon, authenticated;
grant execute on function public.imara_lookup(text)                              to anon, authenticated;
grant execute on function public.imara_set_archetype(uuid,text)                  to anon, authenticated;
grant execute on function public.imara_add_entry(uuid,date,text,text,numeric,text) to anon, authenticated;
grant execute on function public.imara_delete_entry(uuid,uuid)                   to anon, authenticated;
grant execute on function public.imara_close_period(uuid,text)                   to anon, authenticated;
grant execute on function public.imara_new_period(uuid)                          to anon, authenticated;
grant execute on function public.imara_admin_dashboard(text)                     to anon, authenticated;


-- ============================================================================
--  LAST STEP — SET YOUR ADMIN PASSWORD
--
--  Uncomment the line below, change ChangeThisPassword to the shared password
--  the IMARA Admin team will use, and run it on its own.
--  To change it later, just run the same line again with a new password.
-- ============================================================================

-- insert into public.app_config (key, value)
-- values ('admin_password_hash', extensions.crypt('ChangeThisPassword', extensions.gen_salt('bf')))
-- on conflict (key) do update set value = excluded.value;

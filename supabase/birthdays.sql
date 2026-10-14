-- ìjèbú soul: automatic birthday shout-out posts
-- Run this whole file once in Supabase: SQL Editor -> New query -> paste -> Run.
-- Part 2 (the daily schedule) needs pg_cron: Database -> Extensions -> enable "pg_cron" first.

-- ─────────────────────────────────────────────────────────────
-- Part 1: columns and functions
-- ─────────────────────────────────────────────────────────────

alter table public.profiles
  add column if not exists birth_date date,
  add column if not exists birthday_shoutout boolean not null default true;

alter table public.posts
  add column if not exists kind text,
  add column if not exists kind_year smallint;

-- One birthday post per person per year. Running the job twice can never double-post.
create unique index if not exists posts_one_birthday_per_year
  on public.posts (user_id, kind_year)
  where kind = 'birthday';

-- Creates the shout-outs for everyone whose birthday is p_today.
-- p_only limits it to one member (used when someone adds their birth date on the day itself).
create or replace function public._insert_birthday_posts(p_today date, p_only uuid default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
  yr integer := extract(year from p_today)::int;
  leap boolean := (yr % 4 = 0 and (yr % 100 <> 0 or yr % 400 = 0));
begin
  with due as (
    select
      id,
      name,
      yr - extract(year from birth_date)::int as turning
    from public.profiles
    where birth_date is not null
      and coalesce(birthday_shoutout, true)
      and (p_only is null or id = p_only)
      and (
        (extract(month from birth_date) = extract(month from p_today)
          and extract(day from birth_date) = extract(day from p_today))
        or
        -- 29 February birthdays are celebrated on 28 February in years with no 29 February
        (not leap
          and extract(month from birth_date) = 2 and extract(day from birth_date) = 29
          and extract(month from p_today) = 2 and extract(day from p_today) = 28)
      )
  ),
  ins as (
    insert into public.posts (user_id, type, kind, kind_year, caption, bg_color, likes_count, comments_count)
    select
      id,
      'text',
      'birthday',
      yr::smallint,
      '🎂🎉 Happy Birthday, ' || split_part(trim(name), ' ', 1) || '! 🥳🎈' || E'\n\n' ||
        'Turning ' || turning || ' today. Send some love and celebrate with ìjèbú soul. ✨',
      '#B8412B',
      0,
      0
    from due
    on conflict (user_id, kind_year) where kind = 'birthday' do nothing
    returning 1
  )
  select count(*) into n from ins;

  return n;
end;
$$;

-- Used by the daily job. "Today" is the date in Nigeria (Africa/Lagos).
create or replace function public.create_birthday_posts()
returns integer
language sql
security definer
set search_path = public
as $$
  select public._insert_birthday_posts((now() at time zone 'Africa/Lagos')::date, null);
$$;

-- Keeps the stored age correct every year for members who gave a birth date.
create or replace function public.refresh_member_ages()
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles
  set age = extract(year from age((now() at time zone 'Africa/Lagos')::date, birth_date))::int
  where birth_date is not null
    and age is distinct from extract(year from age((now() at time zone 'Africa/Lagos')::date, birth_date))::int;
$$;

-- Called by the app when a member adds their birth date on their birthday,
-- so they don't have to wait until tomorrow night. Only ever creates their own post.
create or replace function public.create_my_birthday_post()
returns integer
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return 0;
  end if;
  return public._insert_birthday_posts((now() at time zone 'Africa/Lagos')::date, auth.uid());
end;
$$;

revoke all on function public._insert_birthday_posts(date, uuid) from public, anon, authenticated;
revoke all on function public.create_birthday_posts()            from public, anon, authenticated;
revoke all on function public.refresh_member_ages()              from public, anon, authenticated;
grant execute on function public.create_my_birthday_post() to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Part 2: the daily schedule (needs the pg_cron extension)
-- 23:05 UTC is 00:05 in Nigeria, just after midnight.
-- ─────────────────────────────────────────────────────────────

create extension if not exists pg_cron;

select cron.schedule(
  'ijebusoul-birthdays',
  '5 23 * * *',
  $$ select public.refresh_member_ages(); select public.create_birthday_posts(); $$
);

-- To stop the job later:  select cron.unschedule('ijebusoul-birthdays');
-- To try it right now:    select public.create_birthday_posts();
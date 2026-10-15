-- ìjèbú soul: Stories (run AFTER the tables + RLS policies you already created)
-- Supabase: SQL Editor -> New query -> paste -> Run (choose "Run and enable RLS" if asked)

-- 1. Reshare lineage: a reshared story remembers where it came from
alter table public.stories
  add column if not exists reshared_from uuid references public.stories(id) on delete set null,
  add column if not exists origin_user   uuid references public.profiles(id) on delete set null;

-- 2. Expired stories are invisible to everyone except their owner (who tidies them up)
drop policy if exists "Stories are readable by anyone signed in" on public.stories;
create policy "Live stories are readable, owners see their own"
  on public.stories for select
  to authenticated
  using (expires_at > now() or auth.uid() = user_id);

-- 3. Storage bucket for story photos and videos
insert into storage.buckets (id, name, public)
values ('stories', 'stories', true)
on conflict (id) do nothing;

drop policy if exists "Story media is publicly readable" on storage.objects;
create policy "Story media is publicly readable"
  on storage.objects for select
  using (bucket_id = 'stories');

drop policy if exists "Users upload into their own story folder" on storage.objects;
create policy "Users upload into their own story folder"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'stories' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users remove their own story media" on storage.objects;
create policy "Users remove their own story media"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'stories' and (storage.foldername(name))[1] = auth.uid()::text);

-- 4. Backstop: remove story rows long after expiry (the app also tidies its own media on load)
create or replace function public.purge_expired_stories()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare n integer;
begin
  with d as (delete from public.stories where expires_at < now() - interval '48 hours' returning 1)
  select count(*) into n from d;
  return n;
end;
$$;
revoke all on function public.purge_expired_stories() from public, anon, authenticated;

-- Needs pg_cron (Database -> Extensions). Skip this line if pg_cron isn't available on your plan.
-- select cron.schedule('ijebusoul-story-purge', '30 23 * * *', $$ select public.purge_expired_stories(); $$);
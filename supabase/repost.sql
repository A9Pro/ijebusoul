-- ijebu soul: sharing between the feed and stories. Safe to run more than once.
-- Supabase: SQL Editor -> New query -> paste ALL of this -> Run.

-- A story made from a feed post remembers which post it came from.
alter table public.stories
  add column if not exists source_post uuid references public.posts(id) on delete set null;

-- A feed post made from a story remembers who made the original.
alter table public.posts
  add column if not exists origin_user uuid references public.profiles(id) on delete set null;

create index if not exists posts_origin_user_idx on public.posts (origin_user) where origin_user is not null;
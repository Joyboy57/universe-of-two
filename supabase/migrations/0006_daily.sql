-- 0006: Daily question, photo of the day swap, shared playlist
-- Answers and photos stay hidden from your partner until YOU have shared yours too (enforced here, not in the UI).

-- reminder preference + playlist link
alter table public.notification_prefs add column daily_ritual boolean not null default true;

alter table public.couples
  add column playlist_url text check (playlist_url is null or (char_length(playlist_url) <= 500 and playlist_url ~* '^https?://')),
  add column playlist_title text check (playlist_title is null or char_length(playlist_title) <= 80);
grant update (playlist_url, playlist_title) on public.couples to authenticated;

-- tables
create table public.daily_answers (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null default public.my_couple_id() references public.couples(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  day date not null,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now(),
  unique (couple_id, day, user_id)
);
create index daily_answers_couple_day_idx on public.daily_answers (couple_id, day);

create table public.daily_photos (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null default public.my_couple_id() references public.couples(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  day date not null,
  storage_key text not null,
  thumb_key text,
  caption text check (caption is null or char_length(caption) <= 120),
  created_at timestamptz not null default now(),
  unique (couple_id, day, user_id)
);
create index daily_photos_couple_day_idx on public.daily_photos (couple_id, day);

-- helper functions (security definer, so policies can look at the table without recursing)
create or replace function public.i_answered(p_day date) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from daily_answers where day = p_day and user_id = auth.uid())
$$;
create or replace function public.partner_answered(p_day date) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from daily_answers where day = p_day and couple_id = my_couple_id() and user_id <> auth.uid())
$$;
create or replace function public.i_posted(p_day date) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from daily_photos where day = p_day and user_id = auth.uid())
$$;
create or replace function public.partner_posted(p_day date) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from daily_photos where day = p_day and couple_id = my_couple_id() and user_id <> auth.uid())
$$;

-- "Has Alex answered?" without revealing what they wrote
create or replace function public.ritual_status(p_day date)
returns table (i_answered boolean, partner_answered boolean, i_posted boolean, partner_posted boolean)
language sql stable security definer set search_path = public as $$
  select public.i_answered(p_day), public.partner_answered(p_day), public.i_posted(p_day), public.partner_posted(p_day)
$$;

revoke execute on function
  public.i_answered(date), public.partner_answered(date), public.i_posted(date), public.partner_posted(date), public.ritual_status(date)
from public, anon;
grant execute on function
  public.i_answered(date), public.partner_answered(date), public.i_posted(date), public.partner_posted(date), public.ritual_status(date)
to authenticated;

-- RLS: answers
alter table public.daily_answers enable row level security;
revoke all on public.daily_answers from anon, authenticated;
grant select on public.daily_answers to authenticated;
grant insert (day, body) on public.daily_answers to authenticated;
grant update (body) on public.daily_answers to authenticated;

create policy answers_select on public.daily_answers for select to authenticated
  using (couple_id = public.my_couple_id() and (user_id = auth.uid() or public.i_answered(day)));
create policy answers_insert on public.daily_answers for insert to authenticated
  with check (
    couple_id = public.my_couple_id() and user_id = auth.uid()
    and day between ((now() at time zone 'utc')::date - 2) and ((now() at time zone 'utc')::date + 1)
  );
create policy answers_update on public.daily_answers for update to authenticated
  using (user_id = auth.uid() and not public.partner_answered(day))   -- editable until your partner answers
  with check (user_id = auth.uid());

-- RLS: photos
alter table public.daily_photos enable row level security;
revoke all on public.daily_photos from anon, authenticated;
grant select, delete on public.daily_photos to authenticated;
grant insert (day, storage_key, thumb_key, caption) on public.daily_photos to authenticated;

create policy photos_select on public.daily_photos for select to authenticated
  using (couple_id = public.my_couple_id() and (user_id = auth.uid() or public.i_posted(day)));
create policy photos_insert on public.daily_photos for insert to authenticated
  with check (
    couple_id = public.my_couple_id() and user_id = auth.uid()
    and storage_key like public.my_couple_id()::text || '/%'
    and day between ((now() at time zone 'utc')::date - 2) and ((now() at time zone 'utc')::date + 1)
  );
create policy photos_delete on public.daily_photos for delete to authenticated
  using (user_id = auth.uid() and not public.partner_posted(day));   -- replaceable until your partner posts

-- private bucket "daily": path = <couple_id>/<day>/<user_id>_<random>.jpg
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('daily', 'daily', false, 5242880, array['image/jpeg'])
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types, public = false;

create policy daily_objects_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'daily'
    and (storage.foldername(name))[1] = public.my_couple_id()::text
    and split_part(storage.filename(name), '_', 1) = auth.uid()::text
  );
create policy daily_objects_select on storage.objects for select to authenticated
  using (
    bucket_id = 'daily'
    and (storage.foldername(name))[1] = public.my_couple_id()::text
    and (
      split_part(storage.filename(name), '_', 1) = auth.uid()::text           -- your own files, always
      or case when (storage.foldername(name))[2] ~ '^\d{4}-\d{2}-\d{2}$'
              then public.i_posted(((storage.foldername(name))[2])::date)     -- theirs, once you have posted
              else false end
    )
  );
create policy daily_objects_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'daily'
    and (storage.foldername(name))[1] = public.my_couple_id()::text
    and split_part(storage.filename(name), '_', 1) = auth.uid()::text
  );

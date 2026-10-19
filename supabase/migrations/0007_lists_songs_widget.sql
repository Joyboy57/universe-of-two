-- 0007: shared lists, playlist songs, widget links

-- ===== Lists =====
create table public.lists (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null default public.my_couple_id() references public.couples(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  kind text not null default 'custom' check (kind in ('bucket','watch','food','custom')),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);
create index lists_couple_idx on public.lists (couple_id);

create table public.list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists(id) on delete cascade,
  couple_id uuid not null default public.my_couple_id() references public.couples(id) on delete cascade,
  text text not null check (char_length(text) between 1 and 200),
  note text check (note is null or char_length(note) <= 300),
  done boolean not null default false,
  done_at timestamptz,
  date_id uuid references public.dates(id) on delete set null,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);
create index list_items_list_idx on public.list_items (list_id, created_at);

alter table public.lists enable row level security;
alter table public.list_items enable row level security;
revoke all on public.lists, public.list_items from anon, authenticated;
grant select, delete on public.lists, public.list_items to authenticated;
grant insert (title, kind) on public.lists to authenticated;
grant update (title) on public.lists to authenticated;
grant insert (list_id, text, note) on public.list_items to authenticated;
grant update (text, note, done, done_at, date_id) on public.list_items to authenticated;

create policy lists_select on public.lists for select to authenticated using (couple_id = public.my_couple_id());
create policy lists_insert on public.lists for insert to authenticated
  with check (couple_id = public.my_couple_id() and created_by = auth.uid());
create policy lists_update on public.lists for update to authenticated
  using (couple_id = public.my_couple_id()) with check (couple_id = public.my_couple_id());
create policy lists_delete on public.lists for delete to authenticated using (couple_id = public.my_couple_id());

create policy items_select on public.list_items for select to authenticated using (couple_id = public.my_couple_id());
create policy items_insert on public.list_items for insert to authenticated
  with check (
    couple_id = public.my_couple_id() and created_by = auth.uid()
    and exists (select 1 from public.lists l where l.id = list_id and l.couple_id = public.my_couple_id())
  );
create policy items_update on public.list_items for update to authenticated
  using (couple_id = public.my_couple_id()) with check (couple_id = public.my_couple_id());
create policy items_delete on public.list_items for delete to authenticated using (couple_id = public.my_couple_id());

-- ===== Playlist songs =====
create table public.playlist_songs (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null default public.my_couple_id() references public.couples(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 150),
  artist text check (artist is null or char_length(artist) <= 150),
  url text not null check (char_length(url) <= 500 and url ~* '^https?://'),
  cover_url text check (cover_url is null or (char_length(cover_url) <= 500 and cover_url ~* '^https://')),
  note text check (note is null or char_length(note) <= 200),
  added_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);
create index playlist_songs_couple_idx on public.playlist_songs (couple_id, created_at desc);

alter table public.playlist_songs enable row level security;
revoke all on public.playlist_songs from anon, authenticated;
grant select, delete on public.playlist_songs to authenticated;
grant insert (title, artist, url, cover_url, note) on public.playlist_songs to authenticated;
grant update (title, artist, url, cover_url, note) on public.playlist_songs to authenticated;
create policy songs_select on public.playlist_songs for select to authenticated using (couple_id = public.my_couple_id());
create policy songs_insert on public.playlist_songs for insert to authenticated
  with check (couple_id = public.my_couple_id() and added_by = auth.uid());
create policy songs_update on public.playlist_songs for update to authenticated
  using (couple_id = public.my_couple_id()) with check (couple_id = public.my_couple_id());
create policy songs_delete on public.playlist_songs for delete to authenticated using (couple_id = public.my_couple_id());

-- ===== Widget links (only a hash of the secret is stored) =====
create table public.widget_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now()
);
alter table public.widget_tokens enable row level security;
revoke all on public.widget_tokens from anon, authenticated;
grant select on public.widget_tokens to authenticated;   -- so Settings can show "a link exists"; writes are server-only
create policy widget_select on public.widget_tokens for select to authenticated using (user_id = auth.uid());

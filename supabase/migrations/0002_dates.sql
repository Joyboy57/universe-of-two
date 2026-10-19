-- 0002: dates (meetups, calls, trips, memories and plans)
create table public.dates (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null default public.my_couple_id() references public.couples(id) on delete cascade,
  date date not null,
  title text not null check (char_length(title) between 1 and 120),
  category text not null default 'other'
    check (category in ('movie','food','outing','trip','call','celebration','other')),
  icon text check (icon is null or char_length(icon) <= 8),
  notes text check (notes is null or char_length(notes) <= 4000),
  location text check (location is null or char_length(location) <= 200),
  rating smallint check (rating is null or rating between 1 and 5),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index dates_couple_date_idx on public.dates (couple_id, date);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger dates_touch before update on public.dates
for each row execute function public.touch_updated_at();

alter table public.dates enable row level security;

revoke all on public.dates from anon, authenticated;
grant select, delete on public.dates to authenticated;
grant insert (date, title, category, icon, notes, location, rating) on public.dates to authenticated;
grant update (date, title, category, icon, notes, location, rating) on public.dates to authenticated;
-- couple_id and created_by are filled by column defaults; they can never be set or changed by the client.

create policy dates_select on public.dates for select to authenticated
  using (couple_id = public.my_couple_id());
create policy dates_insert on public.dates for insert to authenticated
  with check (couple_id = public.my_couple_id() and created_by = auth.uid());
create policy dates_update on public.dates for update to authenticated
  using (couple_id = public.my_couple_id()) with check (couple_id = public.my_couple_id());
create policy dates_delete on public.dates for delete to authenticated
  using (couple_id = public.my_couple_id());

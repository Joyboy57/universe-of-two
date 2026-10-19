-- 0005: multi-day visits and "in person" flag (powers countdown, zoomed-out calendar, stats)
alter table public.dates
  add column end_date date,
  add column in_person boolean not null default false;

alter table public.dates
  add constraint dates_end_check
  check (end_date is null or (end_date >= date and end_date <= date + 120));

grant insert (end_date, in_person) on public.dates to authenticated;
grant update (end_date, in_person) on public.dates to authenticated;

-- 0004: push subscriptions, notification preferences, daily de-duplication log

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon, authenticated;
grant select, delete on public.push_subscriptions to authenticated;  -- rows are written by the server only
create policy push_select on public.push_subscriptions for select to authenticated using (user_id = auth.uid());
create policy push_delete on public.push_subscriptions for delete to authenticated using (user_id = auth.uid());

create table public.notification_prefs (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  enabled boolean not null default true,
  on_this_day boolean not null default true,
  plans boolean not null default true,
  random_memory boolean not null default true,
  private_preview boolean not null default false,
  send_hour smallint not null default 9 check (send_hour between 0 and 23)
);

alter table public.notification_prefs enable row level security;
revoke all on public.notification_prefs from anon, authenticated;
grant select, insert, update on public.notification_prefs to authenticated;
create policy prefs_select on public.notification_prefs for select to authenticated using (user_id = auth.uid());
create policy prefs_insert on public.notification_prefs for insert to authenticated with check (user_id = auth.uid());
create policy prefs_update on public.notification_prefs for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- At most one notification per person per local day. Only the server (service role) touches this table.
create table public.notification_log (
  user_id uuid not null references auth.users(id) on delete cascade,
  local_date date not null,
  kind text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, local_date)
);
alter table public.notification_log enable row level security;
revoke all on public.notification_log from anon, authenticated;

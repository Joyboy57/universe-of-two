-- 0001: couples + members, 2-member lock, RLS, pairing functions
create extension if not exists pgcrypto with schema extensions;

create table public.couples (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'A Universe of Two',
  start_date date,
  invite_code text unique,
  invite_expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.members (
  user_id uuid primary key references auth.users(id) on delete cascade,  -- one space per person
  couple_id uuid not null references public.couples(id) on delete cascade,
  display_name text not null default '',
  timezone text not null default 'UTC',
  quiet_start time,
  quiet_end time,
  joined_at timestamptz not null default now()
);
create index members_couple_idx on public.members(couple_id);

-- Hard cap: a space can never hold more than 2 people (enforced here, not in the UI)
create or replace function public.enforce_max_two_members()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform 1 from public.couples where id = new.couple_id for update;  -- serialize concurrent joins
  if (select count(*) from public.members where couple_id = new.couple_id) >= 2 then
    raise exception 'This space already has two members';
  end if;
  return new;
end $$;

create trigger members_max_two
before insert on public.members
for each row execute function public.enforce_max_two_members();

-- Helper used by every RLS policy from now on
create or replace function public.my_couple_id()
returns uuid language sql stable security definer set search_path = public as $$
  select couple_id from public.members where user_id = auth.uid()
$$;

-- RLS + least privilege
alter table public.couples enable row level security;
alter table public.members enable row level security;

revoke all on public.couples from anon, authenticated;
revoke all on public.members from anon, authenticated;
grant select on public.couples, public.members to authenticated;
grant update (name, start_date) on public.couples to authenticated;
grant update (display_name, timezone, quiet_start, quiet_end) on public.members to authenticated;
-- No insert/delete grants: spaces and memberships are created only through the functions below.

create policy couples_select on public.couples for select to authenticated
  using (id = public.my_couple_id());
create policy couples_update on public.couples for update to authenticated
  using (id = public.my_couple_id()) with check (id = public.my_couple_id());
create policy members_select on public.members for select to authenticated
  using (couple_id = public.my_couple_id());
create policy members_update on public.members for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Invite codes: 8 chars, unambiguous alphabet, cryptographically random
create or replace function public.gen_invite_code()
returns text language plpgsql set search_path = public, extensions as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';  -- 32 chars, no I/O/0/1
  bytes bytea := gen_random_bytes(8);
  code text := '';
  i int;
begin
  for i in 0..7 loop
    code := code || substr(alphabet, (get_byte(bytes, i) % 32) + 1, 1);
  end loop;
  return code;
end $$;

create or replace function public.create_couple(
  p_name text, p_display_name text, p_timezone text, p_start_date date
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_me text := trim(coalesce(p_display_name, ''));
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if exists (select 1 from public.members where user_id = auth.uid()) then
    raise exception 'You already belong to a space';
  end if;
  if char_length(v_me) not between 1 and 40 then
    raise exception 'Enter a name between 1 and 40 characters';
  end if;

  insert into public.couples (name, start_date, invite_code, invite_expires_at)
  values (
    left(coalesce(nullif(trim(p_name), ''), 'A Universe of Two'), 60),
    p_start_date, public.gen_invite_code(), now() + interval '48 hours'
  ) returning id into v_id;

  insert into public.members (user_id, couple_id, display_name, timezone)
  values (auth.uid(), v_id, v_me, coalesce(nullif(left(p_timezone, 64), ''), 'UTC'));
  return v_id;
end $$;

create or replace function public.join_couple(
  p_code text, p_display_name text, p_timezone text
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_couple public.couples;
  v_me text := trim(coalesce(p_display_name, ''));
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if exists (select 1 from public.members where user_id = auth.uid()) then
    raise exception 'You already belong to a space';
  end if;
  if char_length(v_me) not between 1 and 40 then
    raise exception 'Enter a name between 1 and 40 characters';
  end if;

  select * into v_couple from public.couples
  where invite_code = upper(trim(coalesce(p_code, ''))) and invite_expires_at > now()
  for update;
  if not found then raise exception 'That code is invalid or has expired'; end if;

  insert into public.members (user_id, couple_id, display_name, timezone)  -- trigger enforces the cap
  values (auth.uid(), v_couple.id, v_me, coalesce(nullif(left(p_timezone, 64), ''), 'UTC'));

  update public.couples set invite_code = null, invite_expires_at = null  -- single use
  where id = v_couple.id;
  return v_couple.id;
end $$;

create or replace function public.regenerate_invite()
returns text language plpgsql security definer set search_path = public as $$
declare
  v_couple uuid := public.my_couple_id();
  v_code text;
begin
  if v_couple is null then raise exception 'No space found'; end if;
  perform 1 from public.couples where id = v_couple for update;
  if (select count(*) from public.members where couple_id = v_couple) >= 2 then
    raise exception 'Your space is already full';
  end if;
  v_code := public.gen_invite_code();
  update public.couples
  set invite_code = v_code, invite_expires_at = now() + interval '48 hours'
  where id = v_couple;
  return v_code;
end $$;

-- Only signed-in users may call the public functions; the code generator is internal
revoke execute on function public.gen_invite_code() from public, anon, authenticated;
revoke execute on function
  public.create_couple(text, text, text, date),
  public.join_couple(text, text, text),
  public.regenerate_invite(),
  public.my_couple_id()
from public, anon;
grant execute on function
  public.create_couple(text, text, text, date),
  public.join_couple(text, text, text),
  public.regenerate_invite(),
  public.my_couple_id()
to authenticated;

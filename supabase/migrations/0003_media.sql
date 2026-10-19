-- 0003: photos & videos on dates (files live in the private Supabase Storage bucket "media")

create table public.media (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null default public.my_couple_id() references public.couples(id) on delete cascade,
  date_id uuid not null references public.dates(id) on delete cascade,
  storage_key text not null unique,
  thumb_key text,
  type text not null check (type in ('image', 'video')),
  mime text,
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  width int,
  height int,
  uploaded_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);
create index media_date_idx on public.media (date_id, created_at);
create index media_couple_idx on public.media (couple_id);

alter table public.media enable row level security;

revoke all on public.media from anon, authenticated;
grant select, delete on public.media to authenticated;
grant insert (date_id, storage_key, thumb_key, type, mime, size_bytes, width, height)
  on public.media to authenticated;

create policy media_select on public.media for select to authenticated
  using (couple_id = public.my_couple_id());
create policy media_insert on public.media for insert to authenticated
  with check (
    couple_id = public.my_couple_id()
    and uploaded_by = auth.uid()
    and storage_key like public.my_couple_id()::text || '/%'
    and exists (select 1 from public.dates d where d.id = date_id and d.couple_id = public.my_couple_id())
  );
create policy media_delete on public.media for delete to authenticated
  using (couple_id = public.my_couple_id());

-- Storage: each couple can only touch files under their own folder  <couple_id>/...
create policy media_objects_select on storage.objects for select to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = public.my_couple_id()::text);
create policy media_objects_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = public.my_couple_id()::text);
create policy media_objects_delete on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = public.my_couple_id()::text);

-- Bucket guard rails: 50 MB per file (the free-plan maximum) and photo/video types only
update storage.buckets
set file_size_limit = 52428800,
    allowed_mime_types = array['image/jpeg','image/gif','video/mp4','video/quicktime','video/webm']
where id = 'media';

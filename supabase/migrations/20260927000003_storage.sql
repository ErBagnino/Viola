-- =====================================================================
-- Viola × Adam — private storage bucket for photos and audio
--   * bucket is PRIVATE: files are served only through short-lived
--     signed URLs created for logged-in members.
--   * size + MIME are enforced by the bucket itself, and again by the app.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  false,
  10485760, -- 10 MB
  array[
    'image/jpeg', 'image/png', 'image/webp',
    'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/ogg', 'audio/wav', 'audio/webm'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Members can read a file only if it belongs to a shared media record.
create policy "media read shared" on storage.objects for select to authenticated
  using (
    bucket_id = 'media'
    and (
      (select public.is_admin())
      or (
        (select public.is_member())
        and exists (
          select 1 from public.media m
          where (m.path = storage.objects.name or m.thumb_path = storage.objects.name)
            and m.visibility = 'shared'
        )
      )
    )
  );

create policy "media admin insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (select public.is_admin()));

create policy "media admin update" on storage.objects for update to authenticated
  using (bucket_id = 'media' and (select public.is_admin()))
  with check (bucket_id = 'media' and (select public.is_admin()));

create policy "media admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (select public.is_admin()));

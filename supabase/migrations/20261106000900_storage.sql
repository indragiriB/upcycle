-- ============================================================================
-- UPCYCLE — 09: Supabase Storage
-- ============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('deposit-photos', 'deposit-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- ----------------------------------------------------------------------------
-- Avatar publik, tulisan hanya untuk folder milik pengguna:
-- {user_id}/avatar.ext
-- ----------------------------------------------------------------------------
drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'avatars');

drop policy if exists "avatars_owner_insert" on storage.objects;
create policy "avatars_owner_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "avatars_owner_update" on storage.objects;
create policy "avatars_owner_update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "avatars_owner_delete" on storage.objects;
create policy "avatars_owner_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- ----------------------------------------------------------------------------
-- Foto produk publik; pemilik folder adalah pengguna yang login.
-- ----------------------------------------------------------------------------
drop policy if exists "product_images_public_read" on storage.objects;
create policy "product_images_public_read"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'product-images');

drop policy if exists "product_images_owner_insert" on storage.objects;
create policy "product_images_owner_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "product_images_owner_update" on storage.objects;
create policy "product_images_owner_update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "product_images_owner_delete" on storage.objects;
create policy "product_images_owner_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- ----------------------------------------------------------------------------
-- Foto setoran privat. Path: {warga_id}/{deposit_id}/{file}
-- Warga pemilik dan BSU tujuan boleh membaca; BSI/pengepul tidak.
-- ----------------------------------------------------------------------------
drop policy if exists "deposit_photos_owner_insert" on storage.objects;
create policy "deposit_photos_owner_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'deposit-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "deposit_photos_owner_update" on storage.objects;
create policy "deposit_photos_owner_update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'deposit-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'deposit-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "deposit_photos_select" on storage.objects;
create policy "deposit_photos_select"
on storage.objects for select
to authenticated
using (
  bucket_id = 'deposit-photos'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (
      select 1
      from public.deposits d
      where d.id::text = (storage.foldername(name))[2]
        and d.bsu_id = public.get_my_org_id()
    )
  )
);

drop policy if exists "deposit_photos_owner_delete" on storage.objects;
create policy "deposit_photos_owner_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'deposit-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

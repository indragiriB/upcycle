-- ============================================================================
-- UPCYCLE — 17: ganti nama internal pengepul -> industri.
--
-- Ini perubahan kosmetik pada database: tidak ada aturan bisnis yang berubah.
-- Tujuannya agar nama kolom, nilai enum, fungsi, dan view konsisten dengan
-- istilah "industri" yang sudah dipakai di seluruh UI.
--
-- Catatan penting:
-- - Nilai enum app_role.pengepul dan org_type.pengepul TIDAK dihapus. PostgreSQL
--   tidak bisa menghapus satu nilai enum tanpa membangun ulang tipe beserta
--   seluruh kolom, policy, function, dan view yang bergantung padanya. Kedua
--   nilai itu sudah tidak dipakai aplikasi (semua baris sudah 'industri').
-- - Migration ini harus dijalankan SEBELUM frontend baru dideploy, karena
--   frontend baru membaca kolom/RPC dengan nama industri.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Nilai enum yang bisa diganti namanya tanpa membangun ulang tipe.
-- ----------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'deposit_status'
      and e.enumlabel = 'dibeli_pengepul'
  ) then
    execute 'alter type public.deposit_status rename value ''dibeli_pengepul'' to ''dibeli_industri''';
  end if;

  if exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'deposit_status'
      and e.enumlabel = 'diambil_pengepul'
  ) then
    execute 'alter type public.deposit_status rename value ''diambil_pengepul'' to ''diambil_industri''';
  end if;

  if exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'pickup_type'
      and e.enumlabel = 'pengepul_ke_bsi'
  ) then
    execute 'alter type public.pickup_type rename value ''pengepul_ke_bsi'' to ''industri_ke_bsi''';
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 2. Nama kolom.
-- Rename kolom hanya mengubah metadata; data, index, constraint, dan policy
-- yang sudah ada otomatis mengikuti.
-- ----------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'orders'
      and column_name = 'pengepul_id'
  ) then
    execute 'alter table public.orders rename column pengepul_id to industri_id';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'pickups'
      and column_name = 'pengepul_id'
  ) then
    execute 'alter table public.pickups rename column pengepul_id to industri_id';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'deposits'
      and column_name = 'diambil_pengepul_at'
  ) then
    execute 'alter table public.deposits rename column diambil_pengepul_at to diambil_industri_at';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'v_bsi_incoming_deposits'
      and column_name = 'diambil_pengepul_at'
  ) then
    execute 'alter view public.v_bsi_incoming_deposits rename column diambil_pengepul_at to diambil_industri_at';
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 3. Nama fungsi & objek pendukung.
-- ----------------------------------------------------------------------------
do $$
declare
  v_con text;
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'schedule_order_pengepul_pickup'
  ) then
    execute 'alter function public.schedule_order_pengepul_pickup(uuid, timestamptz) rename to schedule_order_industri_pickup';
  end if;

  select c.conname into v_con
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  join pg_attribute a on a.attrelid = t.oid and a.attnum = c.conkey[1]
  where n.nspname = 'public'
    and t.relname = 'orders'
    and c.contype = 'f'
    and a.attname = 'industri_id'
  limit 1;

  if v_con is not null and v_con <> 'orders_industri_id_fkey' then
    execute format(
      'alter table public.orders rename constraint %I to orders_industri_id_fkey',
      v_con
    );
  end if;

  v_con := null;

  select c.conname into v_con
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  join pg_attribute a on a.attrelid = t.oid and a.attnum = c.conkey[1]
  where n.nspname = 'public'
    and t.relname = 'pickups'
    and c.contype = 'f'
    and a.attname = 'industri_id'
  limit 1;

  if v_con is not null and v_con <> 'pickups_industri_id_fkey' then
    execute format(
      'alter table public.pickups rename constraint %I to pickups_industri_id_fkey',
      v_con
    );
  end if;
end $$;

alter index if exists public.orders_pengepul_idx
  rename to orders_industri_idx;
alter index if exists public.pickups_pengepul_idx
  rename to pickups_industri_idx;

-- ----------------------------------------------------------------------------
-- 4. Badan fungsi disimpan sebagai teks, jadi harus ditulis ulang.
--    Semua fungsi public yang masih memuat "pengepul" diambil definisinya,
--    teksnya diganti, lalu dijalankan ulang. Ini menjaga perilaku tetap sama
--    persis sambil menghilangkan nama lama dari kontrak RPC.
-- ----------------------------------------------------------------------------
do $$
declare
  v_rec record;
  v_def text;
  v_defs text[] := '{}';
begin
  for v_rec in
    select p.oid
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and p.prosrc ilike '%pengepul%'
    order by p.proname
  loop
    v_def := pg_get_functiondef(v_rec.oid);

    -- Urutan penting: token yang lebih panjang lebih dulu.
    v_def := replace(v_def, 'diambil_pengepul_at', 'diambil_industri_at');
    v_def := replace(v_def, 'dibeli_pengepul', 'dibeli_industri');
    v_def := replace(v_def, 'diambil_pengepul', 'diambil_industri');
    v_def := replace(v_def, 'pengepul_ke_bsi', 'industri_ke_bsi');
    v_def := replace(v_def, 'pengepul_id', 'industri_id');
    v_def := replace(
      v_def,
      'schedule_order_pengepul_pickup',
      'schedule_order_industri_pickup'
    );
    v_def := replace(v_def, 'pengepul', 'industri');

    v_defs := v_defs || v_def;
  end loop;

  foreach v_def in array v_defs loop
    execute v_def;
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- 5. Tautan notifikasi lama (kalau ada yang terlewat pada migrasi sebelumnya).
-- ----------------------------------------------------------------------------
update public.notifications
set link = replace(link, '/pengepul/', '/industri/')
where link like '/pengepul/%';

-- ----------------------------------------------------------------------------
-- 6. Dokumentasi nilai enum yang sengaja dipertahankan.
-- ----------------------------------------------------------------------------
comment on type public.app_role is
  'Peran aplikasi. Nilai lama ''pembeli'' dan ''pengepul'' dipertahankan agar enum tidak perlu dibangun ulang; data dan kode memakai ''warga'' dan ''industri''.';

comment on type public.org_type is
  'Tipe organisasi. Nilai lama ''pengepul'' dipertahankan agar enum tidak perlu dibangun ulang; data dan kode memakai ''industri''.';

-- ----------------------------------------------------------------------------
-- 7. Pengaman: pastikan tidak ada badan fungsi yang masih memakai nama lama.
-- ----------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosrc ilike '%pengepul%'
  ) then
    raise exception
      'Masih ada fungsi public yang memakai nama pengepul. Periksa manual sebelum commit.';
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 8. Minta PostgREST memuat ulang skema agar nama kolom/relasi baru langsung
--    dikenali tanpa menunggu cache expired.
-- ----------------------------------------------------------------------------
notify pgrst, 'reload schema';


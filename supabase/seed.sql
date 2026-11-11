-- ============================================================================
-- UPCYCLE — Seed contoh
-- Password semua akun demo: Upcycle123!
-- ============================================================================
begin;

-- ----------------------------------------------------------------------------
-- Akun auth (trigger handle_new_user membuat profil warga otomatis)
-- ----------------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new, email_change_token_current
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-4000-8000-000000000001',
    'authenticated', 'authenticated', 'admin@upcycle.id',
    extensions.crypt('Upcycle123!', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"nama":"Administrator UPCYCLE"}'::jsonb,
    now(), now(),
    '', '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-4000-8000-000000000002',
    'authenticated', 'authenticated', 'warga1@upcycle.id',
    extensions.crypt('Upcycle123!', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"nama":"Siti Aminah","account_type":"warga"}'::jsonb,
    now(), now(),
    '', '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-4000-8000-000000000003',
    'authenticated', 'authenticated', 'warga2@upcycle.id',
    extensions.crypt('Upcycle123!', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"nama":"Budi Santoso","account_type":"warga"}'::jsonb,
    now(), now(),
    '', '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-4000-8000-000000000004',
    'authenticated', 'authenticated', 'bsu1@upcycle.id',
    extensions.crypt('Upcycle123!', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"nama":"Rina Wulandari"}'::jsonb,
    now(), now(),
    '', '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-4000-8000-000000000005',
    'authenticated', 'authenticated', 'bsu2@upcycle.id',
    extensions.crypt('Upcycle123!', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"nama":"Dodi Pratama"}'::jsonb,
    now(), now(),
    '', '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-4000-8000-000000000006',
    'authenticated', 'authenticated', 'bsi@upcycle.id',
    extensions.crypt('Upcycle123!', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"nama":"Nadia Putri"}'::jsonb,
    now(), now(),
    '', '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-4000-8000-000000000007',
    'authenticated', 'authenticated', 'industri@upcycle.id',
    extensions.crypt('Upcycle123!', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"nama":"Agus Setiawan"}'::jsonb,
    now(), now(),
    '', '', '', '', ''
  );

insert into auth.identities (
  id, user_id, provider_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
)
select
  gen_random_uuid(),
  u.id,
  u.id::text,
  jsonb_build_object(
    'sub', u.id::text,
    'email', u.email,
    'email_verified', true,
    'phone_verified', false
  ),
  'email',
  now(), now(), now()
from auth.users u
where u.email in (
  'admin@upcycle.id', 'warga1@upcycle.id', 'warga2@upcycle.id',
  'bsu1@upcycle.id', 'bsu2@upcycle.id', 'bsi@upcycle.id',
  'industri@upcycle.id'
);

-- ----------------------------------------------------------------------------
-- Organisasi (semua sudah terverifikasi agar bisa langsung diuji)
-- ----------------------------------------------------------------------------
insert into public.organizations (
  id, tipe, nama, slug, alamat, kota, provinsi, telepon, email,
  lat, lng, status, verified_at, verified_by
)
values
  (
    '20000000-0000-4000-8000-000000000001', 'bsu', 'BSU Melati',
    'bsu-melati', 'Jl. Melati Raya No. 12, Kel. Cipete Utara', 'Jakarta Selatan',
    'DKI Jakarta', '081234567801', 'bsu1@upcycle.id',
    -6.244100, 106.800200, 'verified', now(),
    '10000000-0000-4000-8000-000000000001'
  ),
  (
    '20000000-0000-4000-8000-000000000002', 'bsu', 'BSU Kenanga',
    'bsu-kenanga', 'Jl. Kenanga No. 8, Kel. Pondok Labu', 'Jakarta Selatan',
    'DKI Jakarta', '081234567802', 'bsu2@upcycle.id',
    -6.258300, 106.794800, 'verified', now(),
    '10000000-0000-4000-8000-000000000001'
  ),
  (
    '20000000-0000-4000-8000-000000000003', 'bsi', 'BSI Nusantara Hijau',
    'bsi-nusantara-hijau', 'Jl. Lingkar Selatan No. 45', 'Jakarta Selatan',
    'DKI Jakarta', '081234567803', 'bsi@upcycle.id',
    -6.233500, 106.807500, 'verified', now(),
    '10000000-0000-4000-8000-000000000001'
  ),
  (
    '20000000-0000-4000-8000-000000000004', 'industri', 'CV Jaya Daur Ulang',
    'cv-jaya-daur-ulang', 'Jl. Industri Raya No. 27', 'Jakarta Timur',
    'DKI Jakarta', '081234567804', 'industri@upcycle.id',
    -6.224600, 106.841200, 'verified', now(),
    '10000000-0000-4000-8000-000000000001'
  );

-- ----------------------------------------------------------------------------
-- Penetapan peran oleh admin (di produksi hanya admin yang boleh melakukannya)
-- ----------------------------------------------------------------------------
update public.profiles
set role = 'admin', org_id = null
where id = '10000000-0000-4000-8000-000000000001';

update public.profiles
set role = 'bsu', org_id = '20000000-0000-4000-8000-000000000001'
where id = '10000000-0000-4000-8000-000000000004';

update public.profiles
set role = 'bsu', org_id = '20000000-0000-4000-8000-000000000002'
where id = '10000000-0000-4000-8000-000000000005';

update public.profiles
set role = 'bsi', org_id = '20000000-0000-4000-8000-000000000003'
where id = '10000000-0000-4000-8000-000000000006';

update public.profiles
set role = 'industri', org_id = '20000000-0000-4000-8000-000000000004'
where id = '10000000-0000-4000-8000-000000000007';

-- ----------------------------------------------------------------------------
-- Master jenis sampah
-- ----------------------------------------------------------------------------
insert into public.waste_types (id, nama, kode, kategori, deskripsi, ikon, warna, aktif)
values
  ('30000000-0000-4000-8000-000000000001', 'Botol PET', 'PET', 'Plastik',
   'Botol minuman plastik bening', 'Bottle', '#22C55E', true),
  ('30000000-0000-4000-8000-000000000002', 'Kardus', 'KRD', 'Kertas',
   'Kardus gelombang bersih dan kering', 'Package', '#D97706', true),
  ('30000000-0000-4000-8000-000000000003', 'Kaleng Aluminium', 'ALM', 'Logam',
   'Kaleng minuman aluminium', 'CircleDot', '#64748B', true),
  ('30000000-0000-4000-8000-000000000004', 'Kertas HVS', 'HVS', 'Kertas',
   'Kertas putih bekas cetak', 'FileText', '#3B82F6', true),
  ('30000000-0000-4000-8000-000000000005', 'Botol Kaca', 'KCA', 'Kaca',
   'Botol kaca utuh', 'Wine', '#0EA5E9', true),
  ('30000000-0000-4000-8000-000000000006', 'Plastik HDPE', 'HDPE', 'Plastik',
   'Botol dan wadah HDPE', 'Recycle', '#14B8A6', true);

-- ----------------------------------------------------------------------------
-- Harga beli BSU (append-only). Riwayat PET BSU Melati menunjukkan update harga.
-- ----------------------------------------------------------------------------
insert into public.waste_prices (
  waste_type_id, org_id, tipe, harga_per_kg, berlaku_mulai, dibuat_oleh
)
values
  -- Riwayat lama: harga PET BSU Melati
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
   'beli', 3800, now() - interval '30 days', '10000000-0000-4000-8000-000000000004'),

  -- BSU Melati
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
   'beli', 4000, now() - interval '2 days', '10000000-0000-4000-8000-000000000004'),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001',
   'beli', 2500, now() - interval '30 days', '10000000-0000-4000-8000-000000000004'),
  ('30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001',
   'beli', 12000, now() - interval '30 days', '10000000-0000-4000-8000-000000000004'),
  ('30000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000001',
   'beli', 2000, now() - interval '30 days', '10000000-0000-4000-8000-000000000004'),
  ('30000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000001',
   'beli', 500, now() - interval '30 days', '10000000-0000-4000-8000-000000000004'),
  ('30000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000001',
   'beli', 3500, now() - interval '30 days', '10000000-0000-4000-8000-000000000004'),

  -- BSU Kenanga
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002',
   'beli', 4200, now() - interval '30 days', '10000000-0000-4000-8000-000000000005'),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002',
   'beli', 2300, now() - interval '30 days', '10000000-0000-4000-8000-000000000005'),
  ('30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000002',
   'beli', 11500, now() - interval '30 days', '10000000-0000-4000-8000-000000000005'),
  ('30000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000002',
   'beli', 1900, now() - interval '30 days', '10000000-0000-4000-8000-000000000005'),
  ('30000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000002',
   'beli', 600, now() - interval '30 days', '10000000-0000-4000-8000-000000000005'),
  ('30000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000002',
   'beli', 3300, now() - interval '30 days', '10000000-0000-4000-8000-000000000005'),

  -- Harga jual BSI
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000003',
   'jual', 6500, now() - interval '30 days', '10000000-0000-4000-8000-000000000006'),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000003',
   'jual', 4000, now() - interval '30 days', '10000000-0000-4000-8000-000000000006'),
  ('30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000003',
   'jual', 16000, now() - interval '30 days', '10000000-0000-4000-8000-000000000006'),
  ('30000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000003',
   'jual', 3500, now() - interval '30 days', '10000000-0000-4000-8000-000000000006'),
  ('30000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000003',
   'jual', 1200, now() - interval '30 days', '10000000-0000-4000-8000-000000000006'),
  ('30000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000003',
   'jual', 5500, now() - interval '30 days', '10000000-0000-4000-8000-000000000006');

-- ----------------------------------------------------------------------------
-- Produk marketplace contoh (dijual warga & industri)
-- ----------------------------------------------------------------------------
insert into public.products (
  id, penjual_id, penjual_org_id, nama, deskripsi, kategori, kondisi,
  harga, stok, satuan, foto_urls, status
)
values
  (
    '40000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000002', null,
    'Tas Jinjing Anyaman Plastik',
    'Tas jinjing unik hasil anyaman kemasan plastik daur ulang. Dikerjakan manual oleh warga BSU Melati.',
    'Fashion', 'upcycle', 85000, 6, 'pcs',
    array['https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=900&q=80'],
    'aktif'
  ),
  (
    '40000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000003', null,
    'Pot Tanaman dari Kaleng Bekas',
    'Pot tanaman dekoratif dari kaleng bekas yang dicat ulang. Cocok untuk tanaman hias kecil.',
    'Dekorasi', 'upcycle', 45000, 12, 'pcs',
    array['https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=900&q=80'],
    'aktif'
  ),
  (
    '40000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000007', '20000000-0000-4000-8000-000000000004',
    'Buku Catatan Kertas Daur Ulang',
    'Buku catatan 80 lembar dengan sampul kertas daur ulang.',
    'Alat Tulis', 'upcycle', 32000, 25, 'pcs',
    array['https://images.unsplash.com/photo-1531346878377-a5be20888e57?auto=format&fit=crop&w=900&q=80'],
    'aktif'
  ),
  (
    '40000000-0000-4000-8000-000000000004',
    '10000000-0000-4000-8000-000000000007', '20000000-0000-4000-8000-000000000004',
    'Pouch Serat Kertas',
    'Pouch kecil serbaguna dari serat kertas daur ulang, dilengkapi resleting.',
    'Aksesoris', 'bekas', 58000, 10, 'pcs',
    array['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=80'],
    'aktif'
  );

commit;

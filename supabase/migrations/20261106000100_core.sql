-- ============================================================================
-- UPCYCLE — 01: fondasi, peran, organisasi, profil, master sampah, harga
-- ============================================================================
create extension if not exists pgcrypto with schema extensions;

create type public.app_role as enum (
  'warga', 'bsu', 'bsi', 'pengepul', 'pembeli', 'admin'
);
create type public.org_type as enum ('bsu', 'bsi', 'pengepul');
create type public.verification_status as enum ('pending', 'verified', 'rejected');
create type public.price_kind as enum ('beli', 'jual');
create type public.deposit_method as enum ('jemput', 'antar');
create type public.payment_method as enum ('tunai', 'transfer');
create type public.deposit_status as enum (
  'diajukan', 'dijadwalkan', 'dicek_dibayar', 'dikonfirmasi',
  'dikirim_ke_bsi', 'dipublikasikan', 'dibeli_pengepul',
  'diambil_bsi', 'diambil_pengepul'
);
create type public.stock_status as enum ('tersedia', 'habis');
create type public.order_status as enum (
  'menunggu_pembayaran', 'dibayar', 'diproses', 'selesai', 'dibatalkan'
);
create type public.pickup_type as enum ('bsi_ke_bsu', 'pengepul_ke_bsi');
create type public.pickup_status as enum ('dijadwalkan', 'dalam_perjalanan', 'selesai', 'dibatalkan');
create type public.product_status as enum ('aktif', 'nonaktif');
create type public.product_order_status as enum (
  'menunggu_pembayaran', 'dibayar', 'dikirim', 'selesai', 'dibatalkan'
);
create type public.ledger_direction as enum ('masuk', 'keluar');

-- ----------------------------------------------------------------------------
-- Utility
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- Organisasi
-- ----------------------------------------------------------------------------
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  tipe public.org_type not null,
  nama text not null check (length(btrim(nama)) > 0),
  slug text unique,
  alamat text,
  kota text,
  provinsi text,
  telepon text,
  email text,
  lat double precision check (lat between -90 and 90),
  lng double precision check (lng between -180 and 180),
  logo_url text,
  status public.verification_status not null default 'pending',
  verified_at timestamptz,
  verified_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_coordinates_together
    check ((lat is null and lng is null) or (lat is not null and lng is not null))
);

create trigger organizations_set_updated_at
before update on public.organizations
for each row execute function public.set_updated_at();

create or replace function public.forbid_organization_type_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.tipe is distinct from old.tipe then
    raise exception 'Tipe organisasi tidak dapat diubah setelah dibuat.';
  end if;
  return new;
end;
$$;

create trigger organizations_type_immutable
before update of tipe on public.organizations
for each row execute function public.forbid_organization_type_change();

-- ----------------------------------------------------------------------------
-- Profil (satu pengguna = satu peran; org hanya untuk peran usaha)
-- ----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nama text not null check (length(btrim(nama)) > 0),
  role public.app_role not null default 'warga',
  org_id uuid references public.organizations(id) on delete restrict,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_org_id_idx on public.profiles(org_id);
create index profiles_role_idx on public.profiles(role);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- Helper RLS. SECURITY DEFINER agar pemeriksaan peran tidak rekursif.
create or replace function public.get_my_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role from public.profiles p where p.id = auth.uid()
$$;

create or replace function public.get_my_org_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.org_id from public.profiles p where p.id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.role = 'admin'::public.app_role from public.profiles p where p.id = auth.uid()),
    false
  )
$$;

-- Akun baru hanya boleh lahir sebagai warga/pembeli. Metadata klien tidak bisa
-- menetapkan bsu/bsi/pengepul/admin.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nama text;
  v_role public.app_role;
begin
  v_nama := nullif(btrim(new.raw_user_meta_data ->> 'nama'), '');
  if v_nama is null then
    v_nama := split_part(coalesce(new.email, 'Pengguna'), '@', 1);
  end if;

  if new.raw_user_meta_data ->> 'account_type' = 'pembeli' then
    v_role := 'pembeli'::public.app_role;
  else
    v_role := 'warga'::public.app_role;
  end if;

  insert into public.profiles (id, nama, role)
  values (new.id, v_nama, v_role)
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.validate_profile_role_org()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org_type public.org_type;
begin
  if new.role in ('bsu', 'bsi', 'pengepul') then
    if new.org_id is null then
      raise exception 'Peran % wajib terhubung ke organisasi.', new.role;
    end if;

    select o.tipe into v_org_type
    from public.organizations o
    where o.id = new.org_id;

    if v_org_type is null then
      raise exception 'Organisasi tidak ditemukan.';
    end if;

    if (new.role = 'bsu' and v_org_type <> 'bsu')
       or (new.role = 'bsi' and v_org_type <> 'bsi')
       or (new.role = 'pengepul' and v_org_type <> 'pengepul') then
      raise exception 'Peran % tidak cocok dengan tipe organisasi %.', new.role, v_org_type;
    end if;
  elsif new.org_id is not null then
    raise exception 'Peran warga, pembeli, dan admin tidak boleh terhubung ke organisasi usaha.';
  end if;

  return new;
end;
$$;

create trigger profiles_validate_role_org
before insert or update on public.profiles
for each row execute function public.validate_profile_role_org();

create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.id is distinct from old.id then
    raise exception 'ID profil tidak dapat diubah.';
  end if;

  -- auth.uid() null = migrasi/service SQL; jalur aplikasi selalu punya uid.
  if auth.uid() is not null and not public.is_admin() then
    if new.role is distinct from old.role then
      raise exception 'Peran hanya dapat diubah oleh admin.';
    end if;
    if new.org_id is distinct from old.org_id then
      raise exception 'Keanggotaan organisasi hanya dapat diubah oleh admin.';
    end if;
  end if;

  return new;
end;
$$;

create trigger profiles_protect_privileges
before update on public.profiles
for each row execute function public.protect_profile_privileges();

-- ----------------------------------------------------------------------------
-- Master jenis sampah
-- ----------------------------------------------------------------------------
create table public.waste_types (
  id uuid primary key default gen_random_uuid(),
  nama text not null unique check (length(btrim(nama)) > 0),
  kode text unique,
  kategori text,
  deskripsi text,
  ikon text not null default 'Recycle',
  warna text not null default '#22C55E',
  satuan text not null default 'kg',
  aktif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger waste_types_set_updated_at
before update on public.waste_types
for each row execute function public.set_updated_at();

create index waste_types_aktif_idx on public.waste_types(aktif);

-- ----------------------------------------------------------------------------
-- Harga append-only. Baris lama tidak diedit; perubahan = baris baru.
-- ----------------------------------------------------------------------------
create table public.waste_prices (
  id uuid primary key default gen_random_uuid(),
  waste_type_id uuid not null references public.waste_types(id) on delete restrict,
  org_id uuid not null references public.organizations(id) on delete restrict,
  tipe public.price_kind not null,
  harga_per_kg integer not null check (harga_per_kg > 0),
  berlaku_mulai timestamptz not null default now(),
  dibuat_oleh uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create index waste_prices_lookup_idx
  on public.waste_prices(waste_type_id, org_id, tipe, berlaku_mulai desc, created_at desc);
create index waste_prices_org_idx on public.waste_prices(org_id);

create or replace function public.validate_waste_price()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org_type public.org_type;
  v_active boolean;
begin
  select o.tipe into v_org_type
  from public.organizations o
  where o.id = new.org_id;

  if v_org_type is null then
    raise exception 'Organisasi harga tidak ditemukan.';
  end if;

  if new.tipe = 'beli' and v_org_type <> 'bsu' then
    raise exception 'Harga beli hanya boleh ditetapkan oleh BSU.';
  end if;

  if new.tipe = 'jual' and v_org_type <> 'bsi' then
    raise exception 'Harga jual hanya boleh ditetapkan oleh BSI.';
  end if;

  select wt.aktif into v_active
  from public.waste_types wt
  where wt.id = new.waste_type_id;

  if v_active is not true then
    raise exception 'Jenis sampah tidak ditemukan atau tidak aktif.';
  end if;

  return new;
end;
$$;

create trigger waste_prices_validate
before insert on public.waste_prices
for each row execute function public.validate_waste_price();

create or replace function public.forbid_immutable_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Data ini bersifat append-only. Buat baris baru, jangan ubah/hapus.';
end;
$$;

create trigger waste_prices_append_only
before update or delete on public.waste_prices
for each row execute function public.forbid_immutable_change();

-- Harga aktif = baris terbaru dengan berlaku_mulai <= sekarang.
create or replace function public.get_active_price(
  p_waste_type_id uuid,
  p_org_id uuid,
  p_tipe public.price_kind
)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select wp.harga_per_kg
  from public.waste_prices wp
  where wp.waste_type_id = p_waste_type_id
    and wp.org_id = p_org_id
    and wp.tipe = p_tipe
    and wp.berlaku_mulai <= now()
  order by wp.berlaku_mulai desc, wp.created_at desc, wp.id desc
  limit 1
$$;

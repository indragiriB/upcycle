-- ============================================================================
-- UPCYCLE — 02: setoran, item timbang, stok BSI, pesanan, pengambilan
-- ============================================================================
create table public.deposits (
  id uuid primary key default gen_random_uuid(),
  warga_id uuid not null references public.profiles(id) on delete restrict,
  bsu_id uuid not null references public.organizations(id) on delete restrict,
  bsi_id uuid references public.organizations(id) on delete restrict,
  metode public.deposit_method not null,
  metode_bayar public.payment_method,
  nomor_wa text not null
    check (nomor_wa ~ '^(\+62|62|0)8[1-9][0-9]{6,10}$'),
  lokasi_url text,
  lat double precision check (lat between -90 and 90),
  lng double precision check (lng between -180 and 180),
  alamat text,
  estimasi_jenis text not null check (length(btrim(estimasi_jenis)) > 0),
  estimasi_berat_kg numeric(12,2) not null check (estimasi_berat_kg > 0),
  foto_url text,
  status public.deposit_status not null default 'diajukan',
  jadwal timestamptz,
  catatan text,
  total integer not null default 0 check (total >= 0 and total % 100 = 0),
  potongan integer not null default 0 check (potongan >= 0),
  alasan_potongan text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  dijadwalkan_at timestamptz,
  dicek_at timestamptz,
  dibayar_at timestamptz,
  dikonfirmasi_at timestamptz,
  dikirim_ke_bsi_at timestamptz,
  dipublikasikan_at timestamptz,
  diambil_bsi_at timestamptz,
  diambil_pengepul_at timestamptz,
  constraint deposits_pickup_location
    check (
      metode = 'antar'
      or (
        (nullif(btrim(lokasi_url), '') is not null or (lat is not null and lng is not null))
        and nullif(btrim(alamat), '') is not null
      )
    ),
  constraint deposits_coordinates_together
    check ((lat is null and lng is null) or (lat is not null and lng is not null)),
  constraint deposits_scheduled_is_pickup
    check (status <> 'dijadwalkan' or metode = 'jemput'),
  constraint deposits_discount_reason
    check (potongan = 0 or nullif(btrim(alasan_potongan), '') is not null)
);

create index deposits_warga_idx on public.deposits(warga_id, created_at desc);
create index deposits_bsu_status_idx on public.deposits(bsu_id, status, created_at desc);
create index deposits_bsi_status_idx on public.deposits(bsi_id, status, created_at desc);

create trigger deposits_set_updated_at
before update on public.deposits
for each row execute function public.set_updated_at();

create or replace function public.validate_deposit_organizations()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_bsu_type public.org_type;
  v_bsi_type public.org_type;
begin
  select o.tipe into v_bsu_type
  from public.organizations o
  where o.id = new.bsu_id;

  if v_bsu_type is distinct from 'bsu' then
    raise exception 'Setoran harus ditujukan ke organisasi BSU.';
  end if;

  if new.bsi_id is not null then
    select o.tipe into v_bsi_type
    from public.organizations o
    where o.id = new.bsi_id;

    if v_bsi_type is distinct from 'bsi' then
      raise exception 'Penerima data harus organisasi BSI.';
    end if;
  end if;

  return new;
end;
$$;

create trigger deposits_validate_organizations
before insert or update on public.deposits
for each row execute function public.validate_deposit_organizations();

create table public.deposit_items (
  id uuid primary key default gen_random_uuid(),
  deposit_id uuid not null references public.deposits(id) on delete restrict,
  waste_type_id uuid not null references public.waste_types(id) on delete restrict,
  berat_final_kg numeric(12,2) not null check (berat_final_kg > 0),
  harga_per_kg integer not null check (harga_per_kg > 0),
  harga_acuan_per_kg integer not null check (harga_acuan_per_kg > 0),
  alasan_penyesuaian text,
  subtotal integer not null check (subtotal > 0),
  created_at timestamptz not null default now(),
  unique (deposit_id, waste_type_id),
  constraint deposit_items_subtotal_formula
    check (subtotal = round(berat_final_kg * harga_per_kg)::integer),
  constraint deposit_items_adjustment_reason
    check (
      harga_per_kg = harga_acuan_per_kg
      or nullif(btrim(alasan_penyesuaian), '') is not null
    ),
  constraint deposit_items_reason_not_blank
    check (alasan_penyesuaian is null or length(btrim(alasan_penyesuaian)) > 0)
);

create index deposit_items_deposit_idx on public.deposit_items(deposit_id);
create index deposit_items_waste_idx on public.deposit_items(waste_type_id);

-- Stok disimpan per lot/deposit item agar asal bahan dan status setoran tetap
-- dapat dilacak. Tampilan stok gabungan dibuat lewat view v_bsi_stock_summary.
create table public.bsi_stock (
  id uuid primary key default gen_random_uuid(),
  bsi_id uuid not null references public.organizations(id) on delete restrict,
  bsu_id uuid not null references public.organizations(id) on delete restrict,
  deposit_id uuid not null references public.deposits(id) on delete restrict,
  deposit_item_id uuid not null unique references public.deposit_items(id) on delete restrict,
  waste_type_id uuid not null references public.waste_types(id) on delete restrict,
  berat_awal_kg numeric(12,2) not null check (berat_awal_kg > 0),
  berat_tersedia_kg numeric(12,2) not null check (berat_tersedia_kg >= 0),
  status public.stock_status not null default 'tersedia',
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bsi_stock_weight_limit check (berat_tersedia_kg <= berat_awal_kg)
);

create index bsi_stock_bsi_waste_idx
  on public.bsi_stock(bsi_id, waste_type_id, status);
create index bsi_stock_deposit_idx on public.bsi_stock(deposit_id);

create trigger bsi_stock_set_updated_at
before update on public.bsi_stock
for each row execute function public.set_updated_at();

create or replace function public.sync_stock_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.status := case when new.berat_tersedia_kg = 0 then 'habis'::public.stock_status
                     else 'tersedia'::public.stock_status end;
  return new;
end;
$$;

create trigger bsi_stock_sync_status
before insert or update on public.bsi_stock
for each row execute function public.sync_stock_status();

-- ----------------------------------------------------------------------------
-- Pesanan pengepul -> BSI
-- ----------------------------------------------------------------------------
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  nomor text not null unique,
  bsi_id uuid not null references public.organizations(id) on delete restrict,
  pengepul_id uuid not null references public.organizations(id) on delete restrict,
  dibuat_oleh uuid not null references public.profiles(id) on delete restrict default auth.uid(),
  status public.order_status not null default 'menunggu_pembayaran',
  subtotal integer not null default 0 check (subtotal >= 0),
  total integer not null default 0 check (total >= 0 and total % 100 = 0),
  metode_bayar public.payment_method,
  catatan text,
  dibayar_at timestamptz,
  selesai_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_different_orgs check (bsi_id <> pengepul_id)
);

create index orders_bsi_idx on public.orders(bsi_id, status, created_at desc);
create index orders_pengepul_idx on public.orders(pengepul_id, status, created_at desc);

create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  waste_type_id uuid not null references public.waste_types(id) on delete restrict,
  berat_kg numeric(12,2) not null check (berat_kg > 0),
  harga_per_kg integer not null check (harga_per_kg > 0),
  subtotal integer not null check (subtotal > 0),
  created_at timestamptz not null default now(),
  unique (order_id, waste_type_id),
  constraint order_items_subtotal_formula
    check (subtotal = round(berat_kg * harga_per_kg)::integer)
);

create index order_items_order_idx on public.order_items(order_id);

-- Rincian alokasi lot stok ke item pesanan (internal).
create table public.order_stock_allocations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  order_item_id uuid not null references public.order_items(id) on delete restrict,
  bsi_stock_id uuid not null references public.bsi_stock(id) on delete restrict,
  berat_kg numeric(12,2) not null check (berat_kg > 0),
  created_at timestamptz not null default now(),
  unique (order_item_id, bsi_stock_id)
);

create index order_stock_allocations_order_idx
  on public.order_stock_allocations(order_id);
create index order_stock_allocations_stock_idx
  on public.order_stock_allocations(bsi_stock_id);

-- ----------------------------------------------------------------------------
-- Jadwal pengambilan: BSI -> BSU, lalu pengepul -> BSI.
-- ----------------------------------------------------------------------------
create table public.pickups (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  tipe public.pickup_type not null,
  bsi_id uuid not null references public.organizations(id) on delete restrict,
  bsu_id uuid references public.organizations(id) on delete restrict,
  pengepul_id uuid references public.organizations(id) on delete restrict,
  jadwal timestamptz not null,
  status public.pickup_status not null default 'dijadwalkan',
  catatan text,
  dibuat_oleh uuid not null references public.profiles(id) on delete restrict default auth.uid(),
  selesai_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pickups_party_shape check (
    (tipe = 'bsi_ke_bsu' and bsu_id is not null and pengepul_id is null)
    or
    (tipe = 'pengepul_ke_bsi' and pengepul_id is not null and bsu_id is null)
  )
);

create index pickups_order_idx on public.pickups(order_id, tipe);
create index pickups_bsi_idx on public.pickups(bsi_id, status);
create index pickups_bsu_idx on public.pickups(bsu_id, status);
create index pickups_pengepul_idx on public.pickups(pengepul_id, status);

create trigger pickups_set_updated_at
before update on public.pickups
for each row execute function public.set_updated_at();

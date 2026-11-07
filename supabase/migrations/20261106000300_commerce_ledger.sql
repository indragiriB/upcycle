-- ============================================================================
-- UPCYCLE — 03: marketplace, pesanan produk, buku kas, notifikasi
-- ============================================================================
create table public.products (
  id uuid primary key default gen_random_uuid(),
  penjual_id uuid not null references public.profiles(id) on delete restrict,
  penjual_org_id uuid references public.organizations(id) on delete restrict,
  nama text not null check (length(btrim(nama)) > 0),
  deskripsi text,
  kategori text,
  harga integer not null check (harga > 0 and harga % 100 = 0),
  stok integer not null default 0 check (stok >= 0),
  satuan text not null default 'pcs',
  foto_urls text[] not null default '{}',
  status public.product_status not null default 'aktif',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_penjual_idx on public.products(penjual_id);
create index products_status_idx on public.products(status, created_at desc);
create index products_kategori_idx on public.products(kategori);

create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

create or replace function public.validate_product_seller()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.app_role;
  v_org_id uuid;
begin
  if tg_op = 'UPDATE' then
    if new.penjual_id is distinct from old.penjual_id then
      raise exception 'Pemilik produk tidak dapat diubah.';
    end if;
  end if;

  select p.role, p.org_id into v_role, v_org_id
  from public.profiles p
  where p.id = new.penjual_id;

  if v_role not in ('warga', 'pengepul') then
    raise exception 'Produk hanya boleh dijual oleh warga atau pengepul.';
  end if;

  if v_role = 'warga' and new.penjual_org_id is not null then
    raise exception 'Produk warga tidak boleh terhubung ke organisasi.';
  end if;

  if v_role = 'pengepul' and new.penjual_org_id is distinct from v_org_id then
    raise exception 'Produk pengepul harus terhubung ke organisasi pengepul.';
  end if;

  return new;
end;
$$;

create trigger products_validate_seller
before insert or update on public.products
for each row execute function public.validate_product_seller();

create table public.product_orders (
  id uuid primary key default gen_random_uuid(),
  nomor text not null unique,
  pembeli_id uuid not null references public.profiles(id) on delete restrict,
  penjual_id uuid not null references public.profiles(id) on delete restrict,
  penjual_org_id uuid references public.organizations(id) on delete restrict,
  status public.product_order_status not null default 'menunggu_pembayaran',
  subtotal integer not null default 0 check (subtotal >= 0),
  total integer not null default 0 check (total >= 0 and total % 100 = 0),
  metode_bayar public.payment_method,
  nomor_wa text not null check (nomor_wa ~ '^(\+62|62|0)8[1-9][0-9]{6,10}$'),
  alamat text not null check (length(btrim(alamat)) > 0),
  catatan text,
  dibayar_at timestamptz,
  selesai_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_orders_not_self check (pembeli_id <> penjual_id)
);

create index product_orders_pembeli_idx
  on public.product_orders(pembeli_id, created_at desc);
create index product_orders_penjual_idx
  on public.product_orders(penjual_id, created_at desc);
create index product_orders_org_idx
  on public.product_orders(penjual_org_id, created_at desc);

create trigger product_orders_set_updated_at
before update on public.product_orders
for each row execute function public.set_updated_at();

create table public.product_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.product_orders(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  nama_produk text not null,
  harga_satuan integer not null check (harga_satuan > 0),
  jumlah integer not null check (jumlah > 0),
  subtotal integer not null check (subtotal > 0),
  created_at timestamptz not null default now(),
  constraint product_order_items_subtotal_formula
    check (subtotal = harga_satuan * jumlah)
);

create index product_order_items_order_idx on public.product_order_items(order_id);
create index product_order_items_product_idx on public.product_order_items(product_id);

-- ----------------------------------------------------------------------------
-- Buku kas: append-only. Saldo TIDAK disimpan; dihitung dari view.
-- ----------------------------------------------------------------------------
create table public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete restrict,
  arah public.ledger_direction not null,
  kategori text not null check (
    kategori in (
      'pembayaran_warga', 'penjualan_stok', 'penjualan_produk',
      'operasional', 'koreksi', 'lainnya'
    )
  ),
  jumlah integer not null check (jumlah > 0),
  ref_type text,
  ref_id uuid,
  keterangan text,
  dicatat_oleh uuid references public.profiles(id) on delete set null default auth.uid(),
  tanggal timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index ledger_entries_org_date_idx
  on public.ledger_entries(org_id, tanggal desc);
create index ledger_entries_ref_idx
  on public.ledger_entries(ref_type, ref_id);
create unique index ledger_entries_auto_ref_uidx
  on public.ledger_entries(ref_type, ref_id, kategori)
  where ref_type is not null and ref_id is not null and kategori <> 'koreksi';

create trigger ledger_entries_append_only
before update or delete on public.ledger_entries
for each row execute function public.forbid_immutable_change();

-- ----------------------------------------------------------------------------
-- Notifikasi dalam aplikasi
-- ----------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  judul text not null,
  pesan text not null,
  tipe text not null default 'info',
  link text,
  dibaca boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_user_unread_idx
  on public.notifications(user_id, dibaca, created_at desc);

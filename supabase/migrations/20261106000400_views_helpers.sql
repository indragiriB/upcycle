-- ============================================================================
-- UPCYCLE — 04: view publik/privat & helper keamanan
-- ============================================================================

-- Harga aktif per jenis sampah + organisasi (baris terbaru <= sekarang).
create or replace view public.v_active_waste_prices
with (security_invoker = true)
as
select distinct on (wp.waste_type_id, wp.org_id, wp.tipe)
  wp.id,
  wp.waste_type_id,
  wt.nama as waste_nama,
  wt.kode as waste_kode,
  wt.kategori,
  wt.ikon,
  wt.warna,
  wt.satuan,
  wp.org_id,
  o.nama as org_nama,
  o.tipe as org_tipe,
  o.status as org_status,
  wp.tipe,
  wp.harga_per_kg,
  wp.berlaku_mulai
from public.waste_prices wp
join public.waste_types wt on wt.id = wp.waste_type_id
join public.organizations o on o.id = wp.org_id
where wp.berlaku_mulai <= now()
order by wp.waste_type_id, wp.org_id, wp.tipe,
         wp.berlaku_mulai desc, wp.created_at desc, wp.id desc;

-- Stok gabungan yang dapat dilihat semua pengguna login.
create or replace view public.v_bsi_stock_summary
with (security_invoker = true)
as
select
  s.bsi_id,
  o.nama as bsi_nama,
  s.waste_type_id,
  wt.nama as waste_nama,
  wt.kode as waste_kode,
  wt.kategori,
  wt.ikon,
  wt.warna,
  wt.satuan,
  round(sum(s.berat_tersedia_kg), 2) as berat_tersedia_kg,
  count(distinct s.bsu_id) as jumlah_bsu,
  public.get_active_price(s.waste_type_id, s.bsi_id, 'jual') as harga_jual_per_kg
from public.bsi_stock s
join public.organizations o on o.id = s.bsi_id
join public.waste_types wt on wt.id = s.waste_type_id
where s.berat_tersedia_kg > 0
group by s.bsi_id, o.nama, s.waste_type_id, wt.nama, wt.kode,
         wt.kategori, wt.ikon, wt.warna, wt.satuan;

-- Data setoran yang aman untuk BSI: tanpa nomor WA, alamat, URL/koordinat,
-- atau foto. View ini hanya mengembalikan baris bagi BSI penerima yang login.
create or replace view public.v_bsi_incoming_deposits
with (security_barrier = true)
as
select
  d.id,
  d.warga_id,
  p.nama as warga_nama,
  d.bsu_id,
  o.nama as bsu_nama,
  d.bsi_id,
  d.metode,
  d.metode_bayar,
  d.estimasi_jenis,
  d.estimasi_berat_kg,
  d.status,
  d.total,
  d.potongan,
  d.alasan_potongan,
  d.jadwal,
  d.created_at,
  d.updated_at,
  d.dicek_at,
  d.dibayar_at,
  d.dikonfirmasi_at,
  d.dikirim_ke_bsi_at,
  d.dipublikasikan_at,
  d.diambil_bsi_at,
  d.diambil_pengepul_at
from public.deposits d
join public.profiles p on p.id = d.warga_id
join public.organizations o on o.id = d.bsu_id
where public.get_my_role() = 'bsi'::public.app_role
  and d.bsi_id = public.get_my_org_id()
  and d.status in (
    'dikirim_ke_bsi', 'dipublikasikan', 'dibeli_pengepul',
    'diambil_bsi', 'diambil_pengepul'
  );

-- Saldo kas dihitung dari ledger. Baris hanya muncul untuk org pengguna.
create or replace view public.v_org_cash_balance
with (security_invoker = true)
as
select
  o.id as org_id,
  o.nama as org_nama,
  o.tipe,
  coalesce(sum(case when l.arah = 'masuk' then l.jumlah else 0 end), 0)::bigint as total_masuk,
  coalesce(sum(case when l.arah = 'keluar' then l.jumlah else 0 end), 0)::bigint as total_keluar,
  coalesce(sum(case when l.arah = 'masuk' then l.jumlah else -l.jumlah end), 0)::bigint as saldo
from public.organizations o
left join public.ledger_entries l on l.org_id = o.id
where o.id = public.get_my_org_id()
group by o.id, o.nama, o.tipe;

-- ----------------------------------------------------------------------------
-- Helper visibilitas (SECURITY DEFINER; hanya menerima id, tidak membocorkan
-- detail ke pengguna yang tidak berhak).
-- ----------------------------------------------------------------------------
create or replace function public.is_bsi_recipient(p_deposit_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.deposits d
    where d.id = p_deposit_id
      and d.bsi_id = public.get_my_org_id()
      and public.get_my_role() = 'bsi'::public.app_role
      and d.status in (
        'dikirim_ke_bsi', 'dipublikasikan', 'dibeli_pengepul',
        'diambil_bsi', 'diambil_pengepul'
      )
  )
$$;

create or replace function public.can_view_order(p_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.orders o
    where o.id = p_order_id
      and (
        o.bsi_id = public.get_my_org_id()
        or o.pengepul_id = public.get_my_org_id()
      )
  )
$$;

create or replace function public.can_view_product_order(p_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.product_orders po
    where po.id = p_order_id
      and (
        po.pembeli_id = auth.uid()
        or po.penjual_id = auth.uid()
        or (po.penjual_org_id is not null and po.penjual_org_id = public.get_my_org_id())
      )
  )
$$;

-- ----------------------------------------------------------------------------
-- Helper notifikasi internal. Tidak diekspos ke klien (lihat file grants).
-- ----------------------------------------------------------------------------
create or replace function public.notify_user(
  p_user_id uuid,
  p_judul text,
  p_pesan text,
  p_tipe text default 'info',
  p_link text default null
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, judul, pesan, tipe, link)
  select p_user_id, p_judul, p_pesan, p_tipe, p_link
  where p_user_id is not null;
$$;

create or replace function public.notify_org_staff(
  p_org_id uuid,
  p_judul text,
  p_pesan text,
  p_tipe text default 'info',
  p_link text default null
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, judul, pesan, tipe, link)
  select p.id, p_judul, p_pesan, p_tipe, p_link
  from public.profiles p
  where p.org_id = p_org_id;
$$;

-- ============================================================================
-- UPCYCLE — 06: RLS inti (profil, organisasi, harga, setoran, stok)
-- ============================================================================
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.waste_types enable row level security;
alter table public.waste_prices enable row level security;
alter table public.deposits enable row level security;
alter table public.deposit_items enable row level security;
alter table public.bsi_stock enable row level security;

-- ----------------------------------------------------------------------------
-- Profiles: kolom kontak tidak disimpan di sini; profil publik aman dibaca
-- untuk nama penjual/petugas. Peran & org dilindungi trigger.
-- ----------------------------------------------------------------------------
create policy profiles_select_authenticated
on public.profiles for select
to authenticated
using (true);

create policy profiles_update_self
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy profiles_update_admin
on public.profiles for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- Organizations
-- ----------------------------------------------------------------------------
create policy organizations_select
on public.organizations for select
to authenticated
using (
  status = 'verified'
  or public.is_admin()
  or id = public.get_my_org_id()
);

create policy organizations_insert_admin
on public.organizations for insert
to authenticated
with check (public.is_admin());

create policy organizations_update_admin
on public.organizations for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- Master jenis sampah
-- ----------------------------------------------------------------------------
create policy waste_types_select_authenticated
on public.waste_types for select
to authenticated
using (true);

create policy waste_types_insert_admin
on public.waste_types for insert
to authenticated
with check (public.is_admin());

create policy waste_types_update_admin
on public.waste_types for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- Harga append-only
-- ----------------------------------------------------------------------------
create policy waste_prices_select_authenticated
on public.waste_prices for select
to authenticated
using (true);

create policy waste_prices_insert_by_org
on public.waste_prices for insert
to authenticated
with check (
  org_id = public.get_my_org_id()
  and dibuat_oleh = auth.uid()
  and (
    (public.get_my_role() = 'bsu'::public.app_role and tipe = 'beli')
    or
    (public.get_my_role() = 'bsi'::public.app_role and tipe = 'jual')
  )
  and exists (
    select 1 from public.organizations o
    where o.id = waste_prices.org_id
      and o.status = 'verified'
  )
);

-- ----------------------------------------------------------------------------
-- Setoran mentah: hanya warga pemilik & BSU tujuan. BSI memakai view aman.
-- Tidak ada policy UPDATE/DELETE; semua transisi lewat RPC.
-- ----------------------------------------------------------------------------
create policy deposits_select_owner_or_bsu
on public.deposits for select
to authenticated
using (
  warga_id = auth.uid()
  or bsu_id = public.get_my_org_id()
);

create policy deposits_insert_warga
on public.deposits for insert
to authenticated
with check (
  warga_id = auth.uid()
  and public.get_my_role() = 'warga'::public.app_role
  and status = 'diajukan'
  and bsi_id is null
  and total = 0
  and potongan = 0
  and metode_bayar is null
  and exists (
    select 1 from public.organizations o
    where o.id = deposits.bsu_id
      and o.tipe = 'bsu'
      and o.status = 'verified'
  )
);

-- Item timbang: pemilik/BSU, serta BSI penerima setelah data dikirim.
create policy deposit_items_select
on public.deposit_items for select
to authenticated
using (
  public.is_bsi_recipient(deposit_id)
  or exists (
    select 1
    from public.deposits d
    where d.id = deposit_items.deposit_id
      and (
        d.warga_id = auth.uid()
        or d.bsu_id = public.get_my_org_id()
      )
  )
);

-- ----------------------------------------------------------------------------
-- Stok: BSI melihat semua lotnya; pengguna login lain melihat lot tersedia.
-- Tidak ada policy INSERT/UPDATE/DELETE; publikasi lewat RPC.
-- ----------------------------------------------------------------------------
create policy bsi_stock_select
on public.bsi_stock for select
to authenticated
using (
  bsi_id = public.get_my_org_id()
  or berat_tersedia_kg > 0
);

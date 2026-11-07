-- ============================================================================
-- UPCYCLE — 07: RLS pesanan, pengambilan, marketplace, kas, notifikasi
-- ============================================================================
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_stock_allocations enable row level security;
alter table public.pickups enable row level security;
alter table public.products enable row level security;
alter table public.product_orders enable row level security;
alter table public.product_order_items enable row level security;
alter table public.ledger_entries enable row level security;
alter table public.notifications enable row level security;

-- ----------------------------------------------------------------------------
-- Pesanan pengepul <-> BSI
-- ----------------------------------------------------------------------------
create policy orders_select_parties
on public.orders for select
to authenticated
using (public.can_view_order(id));

create policy order_items_select_parties
on public.order_items for select
to authenticated
using (public.can_view_order(order_id));

create policy order_allocations_select_parties
on public.order_stock_allocations for select
to authenticated
using (public.can_view_order(order_id));

create policy pickups_select_parties
on public.pickups for select
to authenticated
using (
  bsi_id = public.get_my_org_id()
  or bsu_id = public.get_my_org_id()
  or pengepul_id = public.get_my_org_id()
);

-- ----------------------------------------------------------------------------
-- Produk marketplace
-- ----------------------------------------------------------------------------
create policy products_select
on public.products for select
to authenticated
using (
  status = 'aktif'
  or penjual_id = auth.uid()
  or (penjual_org_id is not null and penjual_org_id = public.get_my_org_id())
);

create policy products_insert_seller
on public.products for insert
to authenticated
with check (
  penjual_id = auth.uid()
  and (
    (public.get_my_role() = 'warga'::public.app_role and penjual_org_id is null)
    or
    (public.get_my_role() = 'pengepul'::public.app_role and penjual_org_id = public.get_my_org_id())
  )
);

create policy products_update_seller
on public.products for update
to authenticated
using (
  penjual_id = auth.uid()
  or (
    public.get_my_role() = 'pengepul'::public.app_role
    and penjual_org_id = public.get_my_org_id()
  )
)
with check (
  penjual_id = auth.uid()
  or (
    public.get_my_role() = 'pengepul'::public.app_role
    and penjual_org_id = public.get_my_org_id()
  )
);

-- ----------------------------------------------------------------------------
-- Pesanan produk. Pembuatan & pembayaran lewat RPC pada tahap marketplace.
-- ----------------------------------------------------------------------------
create policy product_orders_select_parties
on public.product_orders for select
to authenticated
using (public.can_view_product_order(id));

create policy product_order_items_select_parties
on public.product_order_items for select
to authenticated
using (public.can_view_product_order(order_id));

-- ----------------------------------------------------------------------------
-- Buku kas: hanya organisasi pemilik. Insert manual hanya biaya operasional.
-- Tidak ada policy UPDATE/DELETE dan trigger append-only menjaga integritas.
-- ----------------------------------------------------------------------------
create policy ledger_entries_select_own_org
on public.ledger_entries for select
to authenticated
using (
  org_id = public.get_my_org_id()
  and public.get_my_org_id() is not null
);

create policy ledger_entries_insert_operational
on public.ledger_entries for insert
to authenticated
with check (
  org_id = public.get_my_org_id()
  and public.get_my_role() in (
    'bsu'::public.app_role, 'bsi'::public.app_role, 'pengepul'::public.app_role
  )
  and arah = 'keluar'
  and kategori = 'operasional'
  and ref_type is null
  and ref_id is null
  and dicatat_oleh = auth.uid()
);

-- ----------------------------------------------------------------------------
-- Notifikasi milik pengguna
-- ----------------------------------------------------------------------------
create policy notifications_select_self
on public.notifications for select
to authenticated
using (user_id = auth.uid());

create policy notifications_update_self
on public.notifications for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

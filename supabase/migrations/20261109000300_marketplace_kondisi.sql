-- ============================================================================
-- UPCYCLE — 14: kondisi produk marketplace (bekas / upcycle).
-- Produk lama dianggap upcycle agar tetap tampil dan data pesanan lama valid.
-- ============================================================================

create type public.product_condition as enum ('bekas', 'upcycle');

alter table public.products
  add column kondisi public.product_condition not null default 'upcycle';

create index products_kondisi_idx on public.products(kondisi, created_at desc);

alter table public.product_order_items
  add column kondisi_produk public.product_condition not null default 'upcycle';

update public.product_order_items poi
set kondisi_produk = p.kondisi
from public.products p
where p.id = poi.product_id;

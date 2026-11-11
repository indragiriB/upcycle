-- ============================================================================
-- UPCYCLE — 15: RLS marketplace dan kas untuk peran industri.
-- ============================================================================

drop policy if exists products_insert_seller on public.products;
create policy products_insert_seller
on public.products for insert
to authenticated
with check (
  penjual_id = auth.uid()
  and (
    (public.get_my_role() = 'warga'::public.app_role and penjual_org_id is null)
    or
    (public.get_my_role() = 'industri'::public.app_role and penjual_org_id = public.get_my_org_id())
  )
);

drop policy if exists products_update_seller on public.products;
create policy products_update_seller
on public.products for update
to authenticated
using (
  penjual_id = auth.uid()
  or (
    public.get_my_role() = 'industri'::public.app_role
    and penjual_org_id = public.get_my_org_id()
  )
)
with check (
  penjual_id = auth.uid()
  or (
    public.get_my_role() = 'industri'::public.app_role
    and penjual_org_id = public.get_my_org_id()
  )
);

drop policy if exists ledger_entries_insert_operational on public.ledger_entries;
create policy ledger_entries_insert_operational
on public.ledger_entries for insert
to authenticated
with check (
  org_id = public.get_my_org_id()
  and public.get_my_role() in (
    'bsu'::public.app_role, 'bsi'::public.app_role, 'industri'::public.app_role
  )
  and arah = 'keluar'
  and kategori = 'operasional'
  and ref_type is null
  and ref_id is null
  and dicatat_oleh = auth.uid()
);

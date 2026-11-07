-- ============================================================================
-- UPCYCLE — 08: hak akses. RLS tetap penentu baris; grant hanya membuka operasi
-- yang memang dipakai klien. Semua akses anonim ditutup (login wajib).
-- ============================================================================
grant usage on schema public to authenticated;

revoke all on table
  public.profiles,
  public.organizations,
  public.waste_types,
  public.waste_prices,
  public.deposits,
  public.deposit_items,
  public.bsi_stock,
  public.orders,
  public.order_items,
  public.order_stock_allocations,
  public.pickups,
  public.products,
  public.product_orders,
  public.product_order_items,
  public.ledger_entries,
  public.notifications
from anon, authenticated;

grant select on table
  public.profiles,
  public.organizations,
  public.waste_types,
  public.waste_prices,
  public.deposits,
  public.deposit_items,
  public.bsi_stock,
  public.orders,
  public.order_items,
  public.order_stock_allocations,
  public.pickups,
  public.products,
  public.product_orders,
  public.product_order_items,
  public.ledger_entries,
  public.notifications
to authenticated;

grant update on table public.profiles to authenticated;
grant insert, update on table public.organizations to authenticated;
grant insert, update on table public.waste_types to authenticated;
grant insert on table public.waste_prices to authenticated;
grant insert on table public.deposits to authenticated;
grant insert, update on table public.products to authenticated;
grant insert on table public.ledger_entries to authenticated;
grant update on table public.notifications to authenticated;

-- Views ---------------------------------------------------------------------
revoke all on table
  public.v_active_waste_prices,
  public.v_bsi_stock_summary,
  public.v_bsi_incoming_deposits,
  public.v_org_cash_balance
from anon, authenticated;

grant select on table
  public.v_active_waste_prices,
  public.v_bsi_stock_summary,
  public.v_bsi_incoming_deposits,
  public.v_org_cash_balance
to authenticated;

-- Functions -----------------------------------------------------------------
-- Default PostgreSQL memberi EXECUTE ke PUBLIC. Dicabut dulu, lalu dibuka
-- hanya untuk helper/RLS dan RPC yang aman dipanggil klien.
revoke all on function public.get_my_role() from public, anon, authenticated;
revoke all on function public.get_my_org_id() from public, anon, authenticated;
revoke all on function public.is_admin() from public, anon, authenticated;
revoke all on function public.get_active_price(uuid, uuid, public.price_kind) from public, anon, authenticated;
revoke all on function public.is_bsi_recipient(uuid) from public, anon, authenticated;
revoke all on function public.can_view_order(uuid) from public, anon, authenticated;
revoke all on function public.can_view_product_order(uuid) from public, anon, authenticated;
revoke all on function public.schedule_deposit_pickup(uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.complete_deposit_weighing(uuid, jsonb, public.payment_method, integer, text) from public, anon, authenticated;
revoke all on function public.confirm_deposit(uuid) from public, anon, authenticated;
revoke all on function public.send_deposit_to_bsi(uuid, uuid) from public, anon, authenticated;
revoke all on function public.publish_deposit_to_stock(uuid) from public, anon, authenticated;
revoke all on function public.correct_ledger_entry(uuid, text) from public, anon, authenticated;

-- Helper internal tidak boleh dipanggil langsung oleh klien.
revoke all on function public.notify_user(uuid, text, text, text, text) from public, anon, authenticated;
revoke all on function public.notify_org_staff(uuid, text, text, text, text) from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.validate_profile_role_org() from public, anon, authenticated;
revoke all on function public.protect_profile_privileges() from public, anon, authenticated;
revoke all on function public.forbid_organization_type_change() from public, anon, authenticated;
revoke all on function public.validate_waste_price() from public, anon, authenticated;
revoke all on function public.forbid_immutable_change() from public, anon, authenticated;
revoke all on function public.validate_deposit_organizations() from public, anon, authenticated;
revoke all on function public.sync_stock_status() from public, anon, authenticated;
revoke all on function public.validate_product_seller() from public, anon, authenticated;

grant execute on function public.get_my_role() to authenticated;
grant execute on function public.get_my_org_id() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.get_active_price(uuid, uuid, public.price_kind) to authenticated;
grant execute on function public.is_bsi_recipient(uuid) to authenticated;
grant execute on function public.can_view_order(uuid) to authenticated;
grant execute on function public.can_view_product_order(uuid) to authenticated;
grant execute on function public.schedule_deposit_pickup(uuid, timestamptz) to authenticated;
grant execute on function public.complete_deposit_weighing(uuid, jsonb, public.payment_method, integer, text) to authenticated;
grant execute on function public.confirm_deposit(uuid) to authenticated;
grant execute on function public.send_deposit_to_bsi(uuid, uuid) to authenticated;
grant execute on function public.publish_deposit_to_stock(uuid) to authenticated;
grant execute on function public.correct_ledger_entry(uuid, text) to authenticated;

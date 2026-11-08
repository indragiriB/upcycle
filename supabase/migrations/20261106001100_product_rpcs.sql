-- ============================================================================
-- UPCYCLE — 11: RPC pesanan produk marketplace.
-- Pembuatan pesanan mengunci stok, pembayaran mencatat kas penjual (bila
-- penjual memiliki organisasi), dan pembatalan mengembalikan stok.
-- ============================================================================

create or replace function public.create_product_order(
  p_items jsonb,
  p_nomor_wa text,
  p_alamat text,
  p_catatan text default null
)
returns public.product_orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.app_role := public.get_my_role();
  v_item jsonb;
  v_product public.products%rowtype;
  v_seller public.profiles%rowtype;
  v_order public.product_orders%rowtype;
  v_qty integer;
  v_count integer := 0;
  v_subtotal integer;
  v_total bigint := 0;
  v_seller_id uuid;
  v_nomor_wa text := nullif(btrim(p_nomor_wa), '');
  v_alamat text := nullif(btrim(p_alamat), '');
  v_catatan text := nullif(btrim(p_catatan), '');
begin
  if v_role is distinct from 'pembeli'::public.app_role then
    raise exception 'Hanya pembeli yang dapat membuat pesanan produk.';
  end if;

  if p_items is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'Minimal satu produk wajib dipilih.';
  end if;

  if v_nomor_wa is null
     or v_nomor_wa !~ '^(\+62|62|0)8[1-9][0-9]{6,10}$' then
    raise exception 'Nomor WhatsApp tidak valid.';
  end if;

  if v_alamat is null or length(v_alamat) < 5 then
    raise exception 'Alamat pengiriman wajib diisi.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_items) as e(item)
    group by e.item ->> 'product_id'
    having count(*) > 1
  ) then
    raise exception 'Produk tidak boleh duplikat dalam satu pesanan.';
  end if;

  -- Validasi dan kunci seluruh produk sebelum pesanan dibuat.
  for v_item in select value from jsonb_array_elements(p_items)
  loop
    if jsonb_typeof(v_item) <> 'object' then
      raise exception 'Format item pesanan tidak valid.';
    end if;

    begin
      v_qty := nullif(btrim(v_item ->> 'jumlah'), '')::integer;
    exception when others then
      raise exception 'Jumlah produk tidak valid.';
    end;

    if v_qty is null or v_qty <= 0 then
      raise exception 'Jumlah produk harus lebih dari 0.';
    end if;

    select * into v_product
    from public.products p
    where p.id = nullif(btrim(v_item ->> 'product_id'), '')::uuid
    for update;

    if not found then
      raise exception 'Produk tidak ditemukan.';
    end if;

    if v_product.status <> 'aktif'::public.product_status then
      raise exception 'Produk % sudah tidak aktif.', v_product.nama;
    end if;

    if v_product.stok < v_qty then
      raise exception 'Stok % hanya tersisa %.', v_product.nama, v_product.stok;
    end if;

    if v_product.penjual_id = auth.uid() then
      raise exception 'Anda tidak dapat membeli produk sendiri.';
    end if;

    if v_count = 0 then
      v_seller_id := v_product.penjual_id;
    elsif v_product.penjual_id <> v_seller_id then
      raise exception 'Satu pesanan hanya dapat berisi produk dari satu penjual.';
    end if;

    v_subtotal := v_product.harga * v_qty;
    if v_subtotal <= 0 then
      raise exception 'Subtotal produk harus lebih dari 0.';
    end if;

    v_total := v_total + v_subtotal::bigint;
    v_count := v_count + 1;
  end loop;

  if v_total > 2147483647 then
    raise exception 'Total pesanan terlalu besar.';
  end if;

  select * into v_seller
  from public.profiles p
  where p.id = v_seller_id;

  if not found or v_seller.role not in (
    'warga'::public.app_role,
    'pengepul'::public.app_role
  ) then
    raise exception 'Penjual produk tidak valid.';
  end if;

  if v_seller.role = 'pengepul'::public.app_role and (
    v_seller.org_id is null
    or not exists (
      select 1
      from public.organizations o
      where o.id = v_seller.org_id
        and o.status = 'verified'::public.verification_status
    )
  ) then
    raise exception 'Organisasi penjual belum terverifikasi.';
  end if;

  insert into public.product_orders (
    nomor, pembeli_id, penjual_id, penjual_org_id, status,
    subtotal, total, nomor_wa, alamat, catatan
  ) values (
    'PRD-' || to_char(now() at time zone 'Asia/Jakarta', 'YYMMDD-HH24MISS') || '-' ||
      upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4)),
    auth.uid(),
    v_seller.id,
    v_seller.org_id,
    'menunggu_pembayaran'::public.product_order_status,
    v_total::integer,
    v_total::integer,
    v_nomor_wa,
    v_alamat,
    v_catatan
  )
  returning * into v_order;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_qty := (v_item ->> 'jumlah')::integer;

    select * into v_product
    from public.products p
    where p.id = (v_item ->> 'product_id')::uuid;

    v_subtotal := v_product.harga * v_qty;

    insert into public.product_order_items (
      order_id, product_id, nama_produk, harga_satuan, jumlah, subtotal
    ) values (
      v_order.id, v_product.id, v_product.nama, v_product.harga, v_qty, v_subtotal
    );

    update public.products
    set stok = stok - v_qty
    where id = v_product.id;
  end loop;

  perform public.notify_user(
    v_seller.id,
    'Pesanan produk baru',
    format(
      'Pesanan %s dari %s menunggu pembayaran.',
      v_order.nomor,
      (select p.nama from public.profiles p where p.id = auth.uid())
    ),
    'produk',
    case
      when v_seller.role = 'pengepul'::public.app_role
        then '/pengepul/produk?tab=pesanan'
      else '/warga/produk?tab=pesanan'
    end
  );

  return v_order;
end;
$$;

-- ----------------------------------------------------------------------------
-- Pembeli membayar pesanan. Penjual yang memiliki organisasi otomatis
-- mendapatkan kas masuk kategori penjualan_produk.
-- ----------------------------------------------------------------------------
create or replace function public.pay_product_order(
  p_order_id uuid,
  p_metode public.payment_method
)
returns public.product_orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.product_orders%rowtype;
  v_seller_role public.app_role;
begin
  if p_metode is null then
    raise exception 'Metode pembayaran wajib dipilih.';
  end if;

  select * into v_order
  from public.product_orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Pesanan tidak ditemukan.';
  end if;

  if v_order.pembeli_id <> auth.uid() then
    raise exception 'Pesanan ini bukan milik Anda.';
  end if;

  if v_order.status <> 'menunggu_pembayaran'::public.product_order_status then
    raise exception 'Pesanan ini tidak menunggu pembayaran.';
  end if;

  update public.product_orders
  set status = 'dibayar'::public.product_order_status,
      metode_bayar = p_metode,
      dibayar_at = now()
  where id = p_order_id
  returning * into v_order;

  if v_order.penjual_org_id is not null
     and not exists (
       select 1
       from public.ledger_entries l
       where l.ref_type = 'product_order'
         and l.ref_id = v_order.id
         and l.kategori = 'penjualan_produk'
     ) then
    insert into public.ledger_entries (
      org_id, arah, kategori, jumlah, ref_type, ref_id, keterangan, dicatat_oleh
    ) values (
      v_order.penjual_org_id,
      'masuk'::public.ledger_direction,
      'penjualan_produk',
      v_order.total,
      'product_order',
      v_order.id,
      format('Penjualan produk %s', v_order.nomor),
      auth.uid()
    );
  end if;

  select p.role into v_seller_role
  from public.profiles p
  where p.id = v_order.penjual_id;

  perform public.notify_user(
    v_order.penjual_id,
    'Pesanan produk dibayar',
    format('Pesanan %s sudah dibayar. Siapkan barang untuk dikirim.', v_order.nomor),
    'produk',
    case
      when v_seller_role = 'pengepul'::public.app_role
        then '/pengepul/produk?tab=pesanan'
      else '/warga/produk?tab=pesanan'
    end
  );

  return v_order;
end;
$$;

-- ----------------------------------------------------------------------------
-- Pembatalan: pembeli boleh membatalkan sebelum bayar; penjual boleh
-- membatalkan sebelum dikirim. Stok selalu dikembalikan. Bila pesanan sudah
-- dibayar dan penjual punya organisasi, kas keluar koreksi dicatat otomatis.
-- ----------------------------------------------------------------------------
create or replace function public.cancel_product_order(p_order_id uuid)
returns public.product_orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.product_orders%rowtype;
  v_item record;
  v_is_buyer boolean;
  v_is_seller boolean;
  v_was_paid boolean;
  v_seller_role public.app_role;
begin
  select * into v_order
  from public.product_orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Pesanan tidak ditemukan.';
  end if;

  v_is_buyer := v_order.pembeli_id = auth.uid();
  v_is_seller := v_order.penjual_id = auth.uid()
    or (
      v_order.penjual_org_id is not null
      and v_order.penjual_org_id = public.get_my_org_id()
    );

  if not (v_is_buyer or v_is_seller) then
    raise exception 'Anda tidak berhak membatalkan pesanan ini.';
  end if;

  if v_order.status = 'dibatalkan'::public.product_order_status then
    raise exception 'Pesanan sudah dibatalkan.';
  end if;

  if v_order.status in (
    'dikirim'::public.product_order_status,
    'selesai'::public.product_order_status
  ) then
    raise exception 'Pesanan yang sudah dikirim tidak dapat dibatalkan.';
  end if;

  if v_order.status = 'dibayar'::public.product_order_status
     and not v_is_seller then
    raise exception 'Pesanan yang sudah dibayar hanya dapat dibatalkan penjual.';
  end if;

  v_was_paid := v_order.status = 'dibayar'::public.product_order_status;

  for v_item in
    select product_id, jumlah
    from public.product_order_items
    where order_id = p_order_id
  loop
    update public.products
    set stok = stok + v_item.jumlah
    where id = v_item.product_id;
  end loop;

  if v_was_paid
     and v_order.penjual_org_id is not null
     and not exists (
       select 1
       from public.ledger_entries l
       where l.ref_type = 'product_order_cancel'
         and l.ref_id = v_order.id
         and l.kategori = 'koreksi'
     ) then
    insert into public.ledger_entries (
      org_id, arah, kategori, jumlah, ref_type, ref_id, keterangan, dicatat_oleh
    ) values (
      v_order.penjual_org_id,
      'keluar'::public.ledger_direction,
      'koreksi',
      v_order.total,
      'product_order_cancel',
      v_order.id,
      format('Pembatalan pesanan produk %s', v_order.nomor),
      auth.uid()
    );
  end if;

  update public.product_orders
  set status = 'dibatalkan'::public.product_order_status
  where id = p_order_id
  returning * into v_order;

  select p.role into v_seller_role
  from public.profiles p
  where p.id = v_order.penjual_id;

  perform public.notify_user(
    case when v_is_seller then v_order.pembeli_id else v_order.penjual_id end,
    'Pesanan produk dibatalkan',
    format(
      'Pesanan %s dibatalkan oleh %s. Stok telah dikembalikan.',
      v_order.nomor,
      case when v_is_seller then 'penjual' else 'pembeli' end
    ),
    'produk',
    case
      when v_is_seller then '/pembeli/pesanan'
      when v_seller_role = 'pengepul'::public.app_role
        then '/pengepul/produk?tab=pesanan'
      else '/warga/produk?tab=pesanan'
    end
  );

  return v_order;
end;
$$;

-- ----------------------------------------------------------------------------
-- Penjual menandai pesanan sudah dikirim.
-- ----------------------------------------------------------------------------
create or replace function public.ship_product_order(p_order_id uuid)
returns public.product_orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.product_orders%rowtype;
begin
  select * into v_order
  from public.product_orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Pesanan tidak ditemukan.';
  end if;

  if not (
    v_order.penjual_id = auth.uid()
    or (
      v_order.penjual_org_id is not null
      and v_order.penjual_org_id = public.get_my_org_id()
    )
  ) then
    raise exception 'Pesanan ini bukan milik organisasi Anda.';
  end if;

  if v_order.status <> 'dibayar'::public.product_order_status then
    raise exception 'Hanya pesanan yang sudah dibayar yang dapat dikirim.';
  end if;

  update public.product_orders
  set status = 'dikirim'::public.product_order_status
  where id = p_order_id
  returning * into v_order;

  perform public.notify_user(
    v_order.pembeli_id,
    'Pesanan produk dikirim',
    format('Pesanan %s sedang dikirim. Konfirmasi setelah barang diterima.', v_order.nomor),
    'produk',
    '/pembeli/pesanan'
  );

  return v_order;
end;
$$;

-- ----------------------------------------------------------------------------
-- Pembeli mengonfirmasi barang diterima.
-- ----------------------------------------------------------------------------
create or replace function public.complete_product_order(p_order_id uuid)
returns public.product_orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.product_orders%rowtype;
  v_seller_role public.app_role;
begin
  select * into v_order
  from public.product_orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Pesanan tidak ditemukan.';
  end if;

  if v_order.pembeli_id <> auth.uid() then
    raise exception 'Pesanan ini bukan milik Anda.';
  end if;

  if v_order.status <> 'dikirim'::public.product_order_status then
    raise exception 'Pesanan belum dikirim oleh penjual.';
  end if;

  update public.product_orders
  set status = 'selesai'::public.product_order_status,
      selesai_at = now()
  where id = p_order_id
  returning * into v_order;

  select p.role into v_seller_role
  from public.profiles p
  where p.id = v_order.penjual_id;

  perform public.notify_user(
    v_order.penjual_id,
    'Pesanan produk selesai',
    format('Pembeli telah mengonfirmasi pesanan %s selesai.', v_order.nomor),
    'produk',
    case
      when v_seller_role = 'pengepul'::public.app_role
        then '/pengepul/produk?tab=pesanan'
      else '/warga/produk?tab=pesanan'
    end
  );

  return v_order;
end;
$$;

-- ----------------------------------------------------------------------------
-- Hak akses RPC.
-- ----------------------------------------------------------------------------
revoke all on function public.create_product_order(jsonb, text, text, text) from public, anon, authenticated;
revoke all on function public.pay_product_order(uuid, public.payment_method) from public, anon, authenticated;
revoke all on function public.cancel_product_order(uuid) from public, anon, authenticated;
revoke all on function public.ship_product_order(uuid) from public, anon, authenticated;
revoke all on function public.complete_product_order(uuid) from public, anon, authenticated;

grant execute on function public.create_product_order(jsonb, text, text, text) to authenticated;
grant execute on function public.pay_product_order(uuid, public.payment_method) to authenticated;
grant execute on function public.cancel_product_order(uuid) to authenticated;
grant execute on function public.ship_product_order(uuid) to authenticated;
grant execute on function public.complete_product_order(uuid) to authenticated;

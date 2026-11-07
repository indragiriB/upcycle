-- ============================================================================
-- UPCYCLE — 10: RPC pesanan stok BSI <-> pengepul, pembayaran, pengambilan,
-- dan pencatatan kas otomatis.
-- Semua perubahan status kritis hanya melalui fungsi SECURITY DEFINER.
-- ============================================================================

-- Pengepul membutuhkan kategori kas khusus untuk pembelian stok.
alter table public.ledger_entries
  drop constraint if exists ledger_entries_kategori_check;

alter table public.ledger_entries
  add constraint ledger_entries_kategori_check check (
    kategori in (
      'pembayaran_warga', 'penjualan_stok', 'penjualan_produk',
      'pembelian_stok', 'operasional', 'koreksi', 'lainnya'
    )
  );

-- BSU perlu melihat ringkasan pesanan yang stoknya akan diambil BSI dari BSU.
-- Policy ini hanya membuka baris orders yang punya jadwal pengambilan ke BSU
-- tersebut; order_items dan alokasi lot tetap tidak terlihat oleh BSU.
drop policy if exists orders_select_bsu_pickup on public.orders;

create policy orders_select_bsu_pickup
on public.orders for select
to authenticated
using (
  exists (
    select 1
    from public.pickups p
    where p.order_id = orders.id
      and p.bsu_id = public.get_my_org_id()
  )
);

-- ----------------------------------------------------------------------------
-- Pengepul membuat pesanan stok. Stok dialokasikan FIFO dari lot tertua dan
-- langsung dikurangi agar tidak terjadi penjualan ganda. Pesanan yang belum
-- dibayar dapat dibatalkan dan stoknya dikembalikan.
-- ----------------------------------------------------------------------------
create or replace function public.create_stock_order(
  p_bsi_id uuid,
  p_items jsonb,
  p_catatan text default null
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.app_role := public.get_my_role();
  v_org uuid := public.get_my_org_id();
  v_bsi_status public.verification_status;
  v_order public.orders%rowtype;
  v_item jsonb;
  v_waste_id uuid;
  v_berat numeric(12,2);
  v_harga integer;
  v_subtotal integer;
  v_total_raw bigint := 0;
  v_total integer;
  v_order_item_id uuid;
  v_remaining numeric(12,2);
  v_take numeric(12,2);
  v_lot record;
  v_count integer := 0;
  v_catatan text;
begin
  if v_role is distinct from 'pengepul'::public.app_role or v_org is null then
    raise exception 'Hanya pengepul yang dapat membuat pesanan stok.';
  end if;

  select o.status into v_bsi_status
  from public.organizations o
  where o.id = p_bsi_id
    and o.tipe = 'bsi';

  if v_bsi_status is distinct from 'verified' then
    raise exception 'BSI tujuan tidak ditemukan atau belum terverifikasi.';
  end if;

  if not exists (
    select 1
    from public.organizations o
    where o.id = v_org
      and o.status = 'verified'
  ) then
    raise exception 'Organisasi pengepul belum terverifikasi.';
  end if;

  if p_items is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'Minimal satu jenis stok wajib dipilih.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_items) as e(item)
    group by e.item ->> 'waste_type_id'
    having count(*) > 1
  ) then
    raise exception 'Jenis sampah tidak boleh duplikat dalam satu pesanan.';
  end if;

  v_catatan := nullif(btrim(p_catatan), '');

  insert into public.orders (
    nomor, bsi_id, pengepul_id, dibuat_oleh, status, subtotal, total, catatan
  ) values (
    'ORD-' || to_char(now() at time zone 'Asia/Jakarta', 'YYMMDD-HH24MISS') || '-' ||
      upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4)),
    p_bsi_id,
    v_org,
    auth.uid(),
    'menunggu_pembayaran'::public.order_status,
    0,
    0,
    v_catatan
  )
  returning * into v_order;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    if jsonb_typeof(v_item) <> 'object' then
      raise exception 'Format item pesanan tidak valid.';
    end if;

    v_waste_id := nullif(btrim(v_item ->> 'waste_type_id'), '')::uuid;
    if v_waste_id is null then
      raise exception 'Jenis sampah wajib dipilih pada setiap item.';
    end if;

    v_berat := round(nullif(btrim(v_item ->> 'berat_kg'), '')::numeric, 2);
    if v_berat is null or v_berat <= 0 then
      raise exception 'Berat pesanan setiap item harus lebih dari 0 kg.';
    end if;

    v_harga := public.get_active_price(v_waste_id, p_bsi_id, 'jual');
    if v_harga is null then
      raise exception 'Harga jual BSI belum diatur untuk jenis sampah %.', v_waste_id;
    end if;

    v_subtotal := round(v_berat * v_harga)::integer;
    if v_subtotal <= 0 then
      raise exception 'Subtotal item pesanan harus lebih dari 0.';
    end if;

    insert into public.order_items (
      order_id, waste_type_id, berat_kg, harga_per_kg, subtotal
    ) values (
      v_order.id, v_waste_id, v_berat, v_harga, v_subtotal
    )
    returning id into v_order_item_id;

    v_remaining := v_berat;

    for v_lot in
      select s.id, s.berat_tersedia_kg
      from public.bsi_stock s
      where s.bsi_id = p_bsi_id
        and s.waste_type_id = v_waste_id
        and s.berat_tersedia_kg > 0
      order by s.published_at, s.created_at, s.id
      for update
    loop
      exit when v_remaining <= 0;

      v_take := least(v_lot.berat_tersedia_kg, v_remaining);

      update public.bsi_stock
      set berat_tersedia_kg = berat_tersedia_kg - v_take
      where id = v_lot.id;

      insert into public.order_stock_allocations (
        order_id, order_item_id, bsi_stock_id, berat_kg
      ) values (
        v_order.id, v_order_item_id, v_lot.id, v_take
      );

      v_remaining := v_remaining - v_take;
    end loop;

    if v_remaining > 0 then
      raise exception 'Stok tersedia tidak mencukupi untuk jenis sampah %.', v_waste_id;
    end if;

    v_total_raw := v_total_raw + v_subtotal;
    v_count := v_count + 1;
  end loop;

  if v_count = 0 then
    raise exception 'Minimal satu jenis stok wajib dipilih.';
  end if;

  -- Total pesanan dibulatkan ke Rp100 terdekat, sama seperti total setoran.
  v_total := (round(v_total_raw::numeric / 100.0) * 100)::integer;

  update public.orders
  set subtotal = v_total_raw::integer,
      total = v_total
  where id = v_order.id
  returning * into v_order;

  update public.deposits d
  set status = 'dibeli_pengepul'::public.deposit_status
  where d.status = 'dipublikasikan'::public.deposit_status
    and d.id in (
      select distinct s.deposit_id
      from public.order_stock_allocations a
      join public.bsi_stock s on s.id = a.bsi_stock_id
      where a.order_id = v_order.id
    );

  perform public.notify_org_staff(
    p_bsi_id,
    'Pesanan stok baru',
    format(
      'Pengepul %s membuat pesanan %s senilai Rp%s.',
      (select o.nama from public.organizations o where o.id = v_org),
      v_order.nomor,
      to_char(v_order.total, 'FM999G999G999')
    ),
    'pesanan',
    '/bsi/pesanan'
  );

  return v_order;
end;
$$;

-- ----------------------------------------------------------------------------
-- Pengepul membayar pesanan. Kas masuk BSI dan kas keluar pengepul dicatat
-- otomatis. Setelah dibayar, pesanan tidak dapat dibatalkan.
-- ----------------------------------------------------------------------------
create or replace function public.pay_stock_order(
  p_order_id uuid,
  p_metode_bayar public.payment_method
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_role public.app_role := public.get_my_role();
  v_org uuid := public.get_my_org_id();
begin
  if v_role is distinct from 'pengepul'::public.app_role or v_org is null then
    raise exception 'Hanya pengepul yang dapat membayar pesanan stok.';
  end if;

  if p_metode_bayar is null then
    raise exception 'Metode pembayaran wajib dipilih.';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Pesanan tidak ditemukan.';
  end if;

  if v_order.pengepul_id <> v_org then
    raise exception 'Pesanan ini bukan milik organisasi Anda.';
  end if;

  if v_order.status <> 'menunggu_pembayaran'::public.order_status then
    raise exception 'Pesanan ini sudah dibayar atau tidak dapat dibayar lagi.';
  end if;

  update public.orders
  set status = 'dibayar'::public.order_status,
      metode_bayar = p_metode_bayar,
      dibayar_at = now()
  where id = p_order_id
  returning * into v_order;

  insert into public.ledger_entries (
    org_id, arah, kategori, jumlah, ref_type, ref_id, keterangan, dicatat_oleh
  ) values (
    v_order.bsi_id,
    'masuk',
    'penjualan_stok',
    v_order.total,
    'order',
    v_order.id,
    format('Penjualan stok pesanan %s', v_order.nomor),
    auth.uid()
  );

  insert into public.ledger_entries (
    org_id, arah, kategori, jumlah, ref_type, ref_id, keterangan, dicatat_oleh
  ) values (
    v_order.pengepul_id,
    'keluar',
    'pembelian_stok',
    v_order.total,
    'order',
    v_order.id,
    format('Pembelian stok pesanan %s', v_order.nomor),
    auth.uid()
  );

  perform public.notify_org_staff(
    v_order.bsi_id,
    'Pembayaran pesanan diterima',
    format(
      'Pesanan %s telah dibayar. Siapkan stok dan atur pengambilan dari BSU.',
      v_order.nomor
    ),
    'pesanan',
    '/bsi/pesanan'
  );

  return v_order;
end;
$$;

-- ----------------------------------------------------------------------------
-- Pembatalan hanya untuk pesanan yang belum dibayar. Alokasi tetap disimpan
-- sebagai jejak audit, tetapi stok dikembalikan ke lot asal.
-- ----------------------------------------------------------------------------
create or replace function public.cancel_stock_order(p_order_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_role public.app_role := public.get_my_role();
  v_org uuid := public.get_my_org_id();
begin
  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Pesanan tidak ditemukan.';
  end if;

  if not (
    (v_role = 'pengepul'::public.app_role and v_order.pengepul_id = v_org)
    or
    (v_role = 'bsi'::public.app_role and v_order.bsi_id = v_org)
  ) then
    raise exception 'Anda tidak berhak membatalkan pesanan ini.';
  end if;

  if v_order.status <> 'menunggu_pembayaran'::public.order_status then
    raise exception 'Hanya pesanan yang belum dibayar yang dapat dibatalkan.';
  end if;

  update public.orders
  set status = 'dibatalkan'::public.order_status
  where id = p_order_id
  returning * into v_order;

  update public.bsi_stock s
  set berat_tersedia_kg = least(s.berat_awal_kg, s.berat_tersedia_kg + a.total_berat)
  from (
    select bsi_stock_id, sum(berat_kg) as total_berat
    from public.order_stock_allocations
    where order_id = p_order_id
    group by bsi_stock_id
  ) a
  where s.id = a.bsi_stock_id;

  update public.deposits d
  set status = 'dipublikasikan'::public.deposit_status
  where d.status = 'dibeli_pengepul'::public.deposit_status
    and d.id in (
      select distinct s.deposit_id
      from public.order_stock_allocations a
      join public.bsi_stock s on s.id = a.bsi_stock_id
      where a.order_id = p_order_id
    )
    and not exists (
      select 1
      from public.order_stock_allocations a2
      join public.bsi_stock s2 on s2.id = a2.bsi_stock_id
      join public.orders o2 on o2.id = a2.order_id
      where s2.deposit_id = d.id
        and o2.status <> 'dibatalkan'::public.order_status
    );

  if v_role = 'pengepul'::public.app_role then
    perform public.notify_org_staff(
      v_order.bsi_id,
      'Pesanan dibatalkan pengepul',
      format('Pesanan %s dibatalkan. Stok telah dikembalikan.', v_order.nomor),
      'pesanan',
      '/bsi/pesanan'
    );
  else
    perform public.notify_org_staff(
      v_order.pengepul_id,
      'Pesanan dibatalkan BSI',
      format('BSI membatalkan pesanan %s. Stok telah dikembalikan.', v_order.nomor),
      'pesanan',
      '/pengepul/pesanan'
    );
  end if;

  return v_order;
end;
$$;

-- ----------------------------------------------------------------------------
-- BSI menjadwalkan pengambilan stok dari setiap BSU asal. Satu jadwal dibuat
-- per BSU untuk pesanan yang sama.
-- ----------------------------------------------------------------------------
create or replace function public.schedule_order_bsu_pickup(
  p_order_id uuid,
  p_jadwal timestamptz
)
returns setof public.pickups
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_role public.app_role := public.get_my_role();
  v_org uuid := public.get_my_org_id();
  v_pickup public.pickups%rowtype;
  v_bsu_id uuid;
  v_count integer := 0;
begin
  if v_role is distinct from 'bsi'::public.app_role or v_org is null then
    raise exception 'Hanya petugas BSI yang dapat menjadwalkan pengambilan dari BSU.';
  end if;

  if p_jadwal is null then
    raise exception 'Jadwal pengambilan wajib diisi.';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Pesanan tidak ditemukan.';
  end if;

  if v_order.bsi_id <> v_org then
    raise exception 'Pesanan ini bukan untuk BSI Anda.';
  end if;

  if v_order.status not in (
    'dibayar'::public.order_status,
    'diproses'::public.order_status
  ) then
    raise exception 'Pesanan belum dibayar atau sudah selesai.';
  end if;

  for v_bsu_id in
    select distinct s.bsu_id
    from public.order_stock_allocations a
    join public.bsi_stock s on s.id = a.bsi_stock_id
    where a.order_id = p_order_id
  loop
    select * into v_pickup
    from public.pickups
    where order_id = p_order_id
      and tipe = 'bsi_ke_bsu'::public.pickup_type
      and bsu_id = v_bsu_id
    order by created_at desc
    limit 1;

    if found then
      if v_pickup.status in (
        'dalam_perjalanan'::public.pickup_status,
        'selesai'::public.pickup_status
      ) then
        continue;
      end if;

      update public.pickups
      set jadwal = p_jadwal,
          status = 'dijadwalkan'::public.pickup_status
      where id = v_pickup.id;
    else
      insert into public.pickups (
        order_id, tipe, bsi_id, bsu_id, pengepul_id,
        jadwal, status, dibuat_oleh
      ) values (
        p_order_id,
        'bsi_ke_bsu'::public.pickup_type,
        v_order.bsi_id,
        v_bsu_id,
        null,
        p_jadwal,
        'dijadwalkan'::public.pickup_status,
        auth.uid()
      );
    end if;

    v_count := v_count + 1;

    perform public.notify_org_staff(
      v_bsu_id,
      'Jadwal pengambilan oleh BSI',
      format(
        'BSI %s akan mengambil stok pesanan %s pada %s.',
        (select o.nama from public.organizations o where o.id = v_order.bsi_id),
        v_order.nomor,
        to_char(p_jadwal at time zone 'Asia/Jakarta', 'DD Mon YYYY HH24:MI')
      ),
      'pesanan',
      '/bsu/jemput'
    );
  end loop;

  if v_count = 0 then
    raise exception 'Tidak ada pengambilan BSU yang perlu dijadwalkan.';
  end if;

  update public.orders
  set status = 'diproses'::public.order_status
  where id = p_order_id
    and status = 'dibayar'::public.order_status;

  return query
    select *
    from public.pickups
    where order_id = p_order_id
      and tipe = 'bsi_ke_bsu'::public.pickup_type
    order by bsu_id, created_at;
end;
$$;

-- ----------------------------------------------------------------------------
-- Pengepul menjadwalkan pengambilan stok di lokasi BSI setelah BSI memproses
-- pesanan.
-- ----------------------------------------------------------------------------
create or replace function public.schedule_order_pengepul_pickup(
  p_order_id uuid,
  p_jadwal timestamptz
)
returns public.pickups
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_pickup public.pickups%rowtype;
  v_role public.app_role := public.get_my_role();
  v_org uuid := public.get_my_org_id();
begin
  if v_role is distinct from 'pengepul'::public.app_role or v_org is null then
    raise exception 'Hanya pengepul yang dapat menjadwalkan pengambilan.';
  end if;

  if p_jadwal is null then
    raise exception 'Jadwal pengambilan wajib diisi.';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Pesanan tidak ditemukan.';
  end if;

  if v_order.pengepul_id <> v_org then
    raise exception 'Pesanan ini bukan milik organisasi Anda.';
  end if;

  if v_order.status <> 'diproses'::public.order_status then
    raise exception 'BSI belum memproses pesanan ini.';
  end if;

  -- Stok baru berada di lokasi BSI setelah semua rute jemput dari BSU selesai.
  if not exists (
    select 1
    from public.pickups
    where order_id = p_order_id
      and tipe = 'bsi_ke_bsu'::public.pickup_type
  ) or exists (
    select 1
    from public.pickups
    where order_id = p_order_id
      and tipe = 'bsi_ke_bsu'::public.pickup_type
      and status <> 'selesai'::public.pickup_status
  ) then
    raise exception 'BSI belum menyelesaikan pengambilan stok dari BSU.';
  end if;

  select * into v_pickup
  from public.pickups
  where order_id = p_order_id
    and tipe = 'pengepul_ke_bsi'::public.pickup_type
  order by created_at desc
  limit 1;

  if found then
    if v_pickup.status = 'selesai'::public.pickup_status then
      raise exception 'Pengambilan pesanan ini sudah selesai.';
    end if;

    if v_pickup.status <> 'dibatalkan'::public.pickup_status then
      update public.pickups
      set jadwal = p_jadwal
      where id = v_pickup.id
      returning * into v_pickup;

      return v_pickup;
    end if;
  end if;

  insert into public.pickups (
    order_id, tipe, bsi_id, bsu_id, pengepul_id,
    jadwal, status, dibuat_oleh
  ) values (
    p_order_id,
    'pengepul_ke_bsi'::public.pickup_type,
    v_order.bsi_id,
    null,
    v_order.pengepul_id,
    p_jadwal,
    'dijadwalkan'::public.pickup_status,
    auth.uid()
  )
  returning * into v_pickup;

  perform public.notify_org_staff(
    v_order.bsi_id,
    'Jadwal pengambilan pengepul',
    format(
      'Pengepul akan mengambil pesanan %s di lokasi BSI pada %s.',
      v_order.nomor,
      to_char(p_jadwal at time zone 'Asia/Jakarta', 'DD Mon YYYY HH24:MI')
    ),
    'pesanan',
    '/bsi/pesanan'
  );

  return v_pickup;
end;
$$;

-- ----------------------------------------------------------------------------
-- Perubahan status pengambilan. Menyelesaikan pengambilan pengepul otomatis
-- menutup pesanan dan menandai setoran asal sebagai sudah diambil.
-- ----------------------------------------------------------------------------
create or replace function public.update_pickup_status(
  p_pickup_id uuid,
  p_status public.pickup_status
)
returns public.pickups
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pickup public.pickups%rowtype;
  v_role public.app_role := public.get_my_role();
  v_org uuid := public.get_my_org_id();
begin
  if p_status is null then
    raise exception 'Status pengambilan wajib dipilih.';
  end if;

  select * into v_pickup
  from public.pickups
  where id = p_pickup_id
  for update;

  if not found then
    raise exception 'Jadwal pengambilan tidak ditemukan.';
  end if;

  if v_pickup.tipe = 'bsi_ke_bsu'::public.pickup_type then
    if not (
      (v_role = 'bsi'::public.app_role and v_org = v_pickup.bsi_id)
      or
      (v_role = 'bsu'::public.app_role and v_org = v_pickup.bsu_id)
    ) then
      raise exception 'Anda tidak berhak mengubah pengambilan ini.';
    end if;
  else
    if not (
      (v_role = 'pengepul'::public.app_role and v_org = v_pickup.pengepul_id)
      or
      (v_role = 'bsi'::public.app_role and v_org = v_pickup.bsi_id)
    ) then
      raise exception 'Anda tidak berhak mengubah pengambilan ini.';
    end if;
  end if;

  if v_pickup.status in (
    'selesai'::public.pickup_status,
    'dibatalkan'::public.pickup_status
  ) then
    raise exception 'Pengambilan yang sudah selesai/dibatalkan tidak dapat diubah.';
  end if;

  if p_status = 'dijadwalkan'::public.pickup_status then
    raise exception 'Status pengambilan tidak dapat dikembalikan ke dijadwalkan.';
  end if;

  if v_pickup.status = 'dijadwalkan'::public.pickup_status
     and p_status not in (
       'dalam_perjalanan'::public.pickup_status,
       'selesai'::public.pickup_status,
       'dibatalkan'::public.pickup_status
     ) then
    raise exception 'Perubahan status pengambilan tidak valid.';
  end if;

  if v_pickup.status = 'dalam_perjalanan'::public.pickup_status
     and p_status not in (
       'selesai'::public.pickup_status,
       'dibatalkan'::public.pickup_status
     ) then
    raise exception 'Perubahan status pengambilan tidak valid.';
  end if;

  update public.pickups
  set status = p_status,
      selesai_at = case
        when p_status = 'selesai'::public.pickup_status then now()
        when p_status = 'dibatalkan'::public.pickup_status then null
        else selesai_at
      end
  where id = p_pickup_id
  returning * into v_pickup;

  if p_status = 'selesai'::public.pickup_status then
    if v_pickup.tipe = 'bsi_ke_bsu'::public.pickup_type then
      update public.deposits d
      set status = 'diambil_bsi'::public.deposit_status,
          diambil_bsi_at = coalesce(d.diambil_bsi_at, now())
      where d.status in (
        'dipublikasikan'::public.deposit_status,
        'dibeli_pengepul'::public.deposit_status
      )
        and d.id in (
          select distinct s.deposit_id
          from public.order_stock_allocations a
          join public.bsi_stock s on s.id = a.bsi_stock_id
          where a.order_id = v_pickup.order_id
            and s.bsu_id = v_pickup.bsu_id
        );

      -- Beri tahu pengepul saat seluruh stok pesanan sudah tiba di BSI.
      if not exists (
        select 1
        from public.pickups p
        where p.order_id = v_pickup.order_id
          and p.tipe = 'bsi_ke_bsu'::public.pickup_type
          and p.status <> 'selesai'::public.pickup_status
      ) then
        perform public.notify_org_staff(
          (select o.pengepul_id from public.orders o where o.id = v_pickup.order_id),
          'Stok siap diambil di BSI',
          format(
            'Seluruh stok pesanan %s sudah tiba di BSI. Silakan jadwalkan pengambilan.',
            (select o.nomor from public.orders o where o.id = v_pickup.order_id)
          ),
          'pesanan',
          '/pengepul/pesanan'
        );
      end if;

      if v_role = 'bsu'::public.app_role then
        perform public.notify_org_staff(
          v_pickup.bsi_id,
          'Stok diambil dari BSU',
          'BSU telah menandai pengambilan stok oleh BSI sebagai selesai.',
          'pesanan',
          '/bsi/pesanan'
        );
      else
        perform public.notify_org_staff(
          v_pickup.bsu_id,
          'Stok telah diambil BSI',
          'BSI telah menyelesaikan pengambilan stok dari BSU.',
          'pesanan',
          '/bsu/jemput'
        );
      end if;
    else
      update public.deposits d
      set status = 'diambil_pengepul'::public.deposit_status,
          diambil_pengepul_at = coalesce(d.diambil_pengepul_at, now())
      where d.status in (
        'dipublikasikan'::public.deposit_status,
        'dibeli_pengepul'::public.deposit_status,
        'diambil_bsi'::public.deposit_status
      )
        and d.id in (
          select distinct s.deposit_id
          from public.order_stock_allocations a
          join public.bsi_stock s on s.id = a.bsi_stock_id
          where a.order_id = v_pickup.order_id
        );

      update public.orders
      set status = 'selesai'::public.order_status,
          selesai_at = now()
      where id = v_pickup.order_id
        and status = 'diproses'::public.order_status;

      if v_role = 'pengepul'::public.app_role then
        perform public.notify_org_staff(
          v_pickup.bsi_id,
          'Pesanan selesai',
          'Pengepul telah menyelesaikan pengambilan stok. Pesanan ditutup.',
          'pesanan',
          '/bsi/pesanan'
        );
      else
        perform public.notify_org_staff(
          v_pickup.pengepul_id,
          'Pesanan selesai',
          'BSI telah menandai pengambilan stok oleh pengepul sebagai selesai.',
          'pesanan',
          '/pengepul/pesanan'
        );
      end if;
    end if;
  end if;

  return v_pickup;
end;
$$;

-- ----------------------------------------------------------------------------
-- Hak akses: RPC dibuka untuk pengguna login, helper internal tetap tertutup.
-- ----------------------------------------------------------------------------
revoke all on function public.create_stock_order(uuid, jsonb, text) from public, anon, authenticated;
revoke all on function public.pay_stock_order(uuid, public.payment_method) from public, anon, authenticated;
revoke all on function public.cancel_stock_order(uuid) from public, anon, authenticated;
revoke all on function public.schedule_order_bsu_pickup(uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.schedule_order_pengepul_pickup(uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.update_pickup_status(uuid, public.pickup_status) from public, anon, authenticated;

grant execute on function public.create_stock_order(uuid, jsonb, text) to authenticated;
grant execute on function public.pay_stock_order(uuid, public.payment_method) to authenticated;
grant execute on function public.cancel_stock_order(uuid) to authenticated;
grant execute on function public.schedule_order_bsu_pickup(uuid, timestamptz) to authenticated;
grant execute on function public.schedule_order_pengepul_pickup(uuid, timestamptz) to authenticated;
grant execute on function public.update_pickup_status(uuid, public.pickup_status) to authenticated;

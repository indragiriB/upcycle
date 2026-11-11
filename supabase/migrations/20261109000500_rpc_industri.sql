-- ============================================================================
-- UPCYCLE — 16: RPC memakai peran industri dan rute marketplace baru.
-- Nama kolom/fungsi internal (pengepul_id, schedule_order_pengepul_pickup)
-- dipertahankan agar data dan kontrak lama tetap valid.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Pesanan stok BSI <-> industri
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
  if v_role is distinct from 'industri'::public.app_role or v_org is null then
    raise exception 'Hanya industri yang dapat membuat pesanan stok.';
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
    raise exception 'Organisasi industri belum terverifikasi.';
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
      'Industri %s membuat pesanan %s senilai Rp%s.',
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
  if v_role is distinct from 'industri'::public.app_role or v_org is null then
    raise exception 'Hanya industri yang dapat membayar pesanan stok.';
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
    (v_role = 'industri'::public.app_role and v_order.pengepul_id = v_org)
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

  if v_role = 'industri'::public.app_role then
    perform public.notify_org_staff(
      v_order.bsi_id,
      'Pesanan dibatalkan industri',
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
      '/industri/pesanan'
    );
  end if;

  return v_order;
end;
$$;

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
  if v_role is distinct from 'industri'::public.app_role or v_org is null then
    raise exception 'Hanya industri yang dapat menjadwalkan pengambilan.';
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
    'Jadwal pengambilan industri',
    format(
      'Industri akan mengambil pesanan %s di lokasi BSI pada %s.',
      v_order.nomor,
      to_char(p_jadwal at time zone 'Asia/Jakarta', 'DD Mon YYYY HH24:MI')
    ),
    'pesanan',
    '/bsi/pesanan'
  );

  return v_pickup;
end;
$$;

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
      (v_role = 'industri'::public.app_role and v_org = v_pickup.pengepul_id)
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

      -- Beri tahu industri saat seluruh stok pesanan sudah tiba di BSI.
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
          '/industri/pesanan'
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

      if v_role = 'industri'::public.app_role then
        perform public.notify_org_staff(
          v_pickup.bsi_id,
          'Pesanan selesai',
          'Industri telah menyelesaikan pengambilan stok. Pesanan ditutup.',
          'pesanan',
          '/bsi/pesanan'
        );
      else
        perform public.notify_org_staff(
          v_pickup.pengepul_id,
          'Pesanan selesai',
          'BSI telah menandai pengambilan stok oleh industri sebagai selesai.',
          'pesanan',
          '/industri/pesanan'
        );
      end if;
    end if;
  end if;

  return v_pickup;
end;
$$;

-- ----------------------------------------------------------------------------
-- Copy stok dan koreksi kas
-- ----------------------------------------------------------------------------
create or replace function public.publish_deposit_to_stock(p_deposit_id uuid)
returns setof public.bsi_stock
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_dep public.deposits%rowtype;
  v_org uuid := public.get_my_org_id();
  v_item record;
  v_price integer;
  v_item_count integer;
begin
  if public.get_my_role() is distinct from 'bsi'::public.app_role then
    raise exception 'Hanya petugas BSI yang dapat mempublikasikan stok.';
  end if;

  select * into v_dep
  from public.deposits
  where id = p_deposit_id
  for update;

  if not found then
    raise exception 'Setoran tidak ditemukan.';
  end if;

  if v_dep.bsi_id is distinct from v_org then
    raise exception 'Setoran ini bukan untuk BSI Anda.';
  end if;

  if v_dep.status <> 'dikirim_ke_bsi' then
    raise exception 'Hanya setoran yang baru dikirim yang dapat dipublikasikan.';
  end if;

  select count(*) into v_item_count
  from public.deposit_items
  where deposit_id = p_deposit_id;

  if v_item_count = 0 then
    raise exception 'Setoran tidak memiliki item untuk dipublikasikan.';
  end if;

  for v_item in
    select di.waste_type_id, di.berat_final_kg, wt.nama
    from public.deposit_items di
    join public.waste_types wt on wt.id = di.waste_type_id
    where di.deposit_id = p_deposit_id
    order by di.created_at
  loop
    v_price := public.get_active_price(v_item.waste_type_id, v_org, 'jual');
    if v_price is null then
      raise exception 'Harga jual BSI belum diatur untuk jenis sampah %.', v_item.nama;
    end if;

    insert into public.bsi_stock (
      bsi_id, bsu_id, deposit_id, deposit_item_id, waste_type_id,
      berat_awal_kg, berat_tersedia_kg
    ) values (
      v_org, v_dep.bsu_id, p_deposit_id,
      (select di.id from public.deposit_items di
       where di.deposit_id = p_deposit_id and di.waste_type_id = v_item.waste_type_id),
      v_item.waste_type_id, v_item.berat_final_kg, v_item.berat_final_kg
    );
  end loop;

  update public.deposits
  set status = 'dipublikasikan',
      dipublikasikan_at = now()
  where id = p_deposit_id
  returning * into v_dep;

  perform public.notify_org_staff(
    v_dep.bsu_id,
    'Stok telah dipublikasikan BSI',
    format('Setoran %s sudah tampil pada stok gabungan BSI.', v_dep.id),
    'stok',
    '/bsu/setoran/' || v_dep.id::text
  );

  perform public.notify_user(
    v_dep.warga_id,
    'Setoran dipublikasikan',
    'Sampah Anda sudah masuk stok BSI dan tersedia bagi industri.',
    'stok',
    '/warga/setoran/' || v_dep.id::text
  );

  return query
    select * from public.bsi_stock
    where deposit_id = p_deposit_id
    order by created_at;
end;
$$;

create or replace function public.correct_ledger_entry(
  p_entry_id uuid,
  p_alasan text
)
returns public.ledger_entries
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_entry public.ledger_entries%rowtype;
  v_new public.ledger_entries%rowtype;
  v_org uuid := public.get_my_org_id();
begin
  if public.get_my_role() not in (
    'bsu'::public.app_role, 'bsi'::public.app_role, 'industri'::public.app_role
  ) or v_org is null then
    raise exception 'Hanya staf organisasi yang dapat mengoreksi kas.';
  end if;

  if nullif(btrim(p_alasan), '') is null then
    raise exception 'Alasan koreksi wajib diisi.';
  end if;

  select * into v_entry
  from public.ledger_entries
  where id = p_entry_id;

  if not found then
    raise exception 'Entri kas tidak ditemukan.';
  end if;

  if v_entry.org_id <> v_org then
    raise exception 'Entri kas ini bukan milik organisasi Anda.';
  end if;

  if v_entry.kategori = 'koreksi' then
    raise exception 'Entri koreksi tidak dapat dikoreksi lagi.';
  end if;

  if exists (
    select 1 from public.ledger_entries le
    where le.ref_type = 'ledger_entry'
      and le.ref_id = v_entry.id
      and le.kategori = 'koreksi'
  ) then
    raise exception 'Entri ini sudah pernah dikoreksi.';
  end if;

  insert into public.ledger_entries (
    org_id, arah, kategori, jumlah, ref_type, ref_id, keterangan, dicatat_oleh
  ) values (
    v_entry.org_id,
    case when v_entry.arah = 'masuk' then 'keluar'::public.ledger_direction
         else 'masuk'::public.ledger_direction end,
    'koreksi',
    v_entry.jumlah,
    'ledger_entry',
    v_entry.id,
    format('Koreksi entri %s: %s', v_entry.id, btrim(p_alasan)),
    auth.uid()
  )
  returning * into v_new;

  return v_new;
end;
$$;

-- ----------------------------------------------------------------------------
-- Pesanan produk marketplace: hanya warga dapat membeli; industri dan warga
-- tetap dapat menjadi penjual. Kondisi produk disimpan sebagai snapshot.
-- ----------------------------------------------------------------------------
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
  if v_role is distinct from 'warga'::public.app_role then
    raise exception 'Hanya warga yang dapat membuat pesanan produk.';
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
    'industri'::public.app_role
  ) then
    raise exception 'Penjual produk tidak valid.';
  end if;

  if v_seller.role = 'industri'::public.app_role and (
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
      order_id, product_id, nama_produk, harga_satuan, jumlah, subtotal,
      kondisi_produk
    ) values (
      v_order.id, v_product.id, v_product.nama, v_product.harga, v_qty,
      v_subtotal, v_product.kondisi
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
      when v_seller.role = 'industri'::public.app_role
        then '/industri/produk?tab=pesanan'
      else '/warga/produk?tab=pesanan'
    end
  );

  return v_order;
end;
$$;

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
      when v_seller_role = 'industri'::public.app_role
        then '/industri/produk?tab=pesanan'
      else '/warga/produk?tab=pesanan'
    end
  );

  return v_order;
end;
$$;

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
      case when v_is_seller then 'penjual' else 'warga' end
    ),
    'produk',
    case
      when v_is_seller then '/warga/pesanan'
      when v_seller_role = 'industri'::public.app_role
        then '/industri/produk?tab=pesanan'
      else '/warga/produk?tab=pesanan'
    end
  );

  return v_order;
end;
$$;

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
    '/warga/pesanan'
  );

  return v_order;
end;
$$;

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
    format('Warga telah mengonfirmasi pesanan %s selesai.', v_order.nomor),
    'produk',
    case
      when v_seller_role = 'industri'::public.app_role
        then '/industri/produk?tab=pesanan'
      else '/warga/produk?tab=pesanan'
    end
  );

  return v_order;
end;
$$;

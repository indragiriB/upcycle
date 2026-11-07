-- ============================================================================
-- UPCYCLE — 05: RPC alur setoran & koreksi buku kas
-- Semua perubahan status kritis hanya melalui fungsi SECURITY DEFINER.
-- ============================================================================

-- BSU menjadwalkan penjemputan.
create or replace function public.schedule_deposit_pickup(
  p_deposit_id uuid,
  p_jadwal timestamptz
)
returns public.deposits
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_dep public.deposits%rowtype;
  v_org uuid := public.get_my_org_id();
begin
  if public.get_my_role() is distinct from 'bsu'::public.app_role then
    raise exception 'Hanya petugas BSU yang dapat menjadwalkan penjemputan.';
  end if;

  if p_jadwal is null then
    raise exception 'Jadwal penjemputan wajib diisi.';
  end if;

  select * into v_dep
  from public.deposits
  where id = p_deposit_id
  for update;

  if not found then
    raise exception 'Setoran tidak ditemukan.';
  end if;

  if v_dep.bsu_id <> v_org then
    raise exception 'Setoran ini bukan untuk BSU Anda.';
  end if;

  if v_dep.metode <> 'jemput' then
    raise exception 'Setoran dengan metode antar tidak perlu dijadwalkan jemput.';
  end if;

  if v_dep.status <> 'diajukan' then
    raise exception 'Hanya setoran berstatus diajukan yang dapat dijadwalkan.';
  end if;

  update public.deposits
  set status = 'dijadwalkan',
      jadwal = p_jadwal,
      dijadwalkan_at = now()
  where id = p_deposit_id
  returning * into v_dep;

  perform public.notify_user(
    v_dep.warga_id,
    'Penjemputan dijadwalkan',
    format('BSU akan menjemput sampah Anda pada %s.',
      to_char(p_jadwal at time zone 'Asia/Jakarta', 'DD Mon YYYY HH24:MI')),
    'setoran',
    '/warga/setoran/' || v_dep.id::text
  );

  return v_dep;
end;
$$;

-- Inti alur: BSU memasukkan hasil timbang, sistem menyimpan snapshot harga,
-- menghitung total, mencatat kas keluar, dan mengubah status.
create or replace function public.complete_deposit_weighing(
  p_deposit_id uuid,
  p_items jsonb,
  p_metode_bayar public.payment_method,
  p_potongan integer default 0,
  p_alasan_potongan text default null
)
returns public.deposits
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_dep public.deposits%rowtype;
  v_org uuid := public.get_my_org_id();
  v_item jsonb;
  v_waste_id uuid;
  v_berat numeric(12,2);
  v_harga integer;
  v_harga_acuan integer;
  v_alasan text;
  v_subtotal integer;
  v_total_raw bigint := 0;
  v_total integer;
  v_potongan integer := coalesce(p_potongan, 0);
  v_alasan_potongan text;
  v_jumlah_item integer := 0;
begin
  if public.get_my_role() is distinct from 'bsu'::public.app_role then
    raise exception 'Hanya petugas BSU yang dapat menyelesaikan penimbangan.';
  end if;

  if p_metode_bayar is null then
    raise exception 'Metode pembayaran wajib dipilih.';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Minimal satu item hasil timbang wajib diisi.';
  end if;

  if v_potongan < 0 then
    raise exception 'Potongan tidak boleh negatif.';
  end if;

  if v_potongan > 0 and nullif(btrim(p_alasan_potongan), '') is null then
    raise exception 'Alasan potongan wajib diisi.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_items) as e(item)
    group by e.item ->> 'waste_type_id'
    having count(*) > 1
  ) then
    raise exception 'Jenis sampah tidak boleh duplikat dalam satu setoran.';
  end if;

  select * into v_dep
  from public.deposits
  where id = p_deposit_id
  for update;

  if not found then
    raise exception 'Setoran tidak ditemukan.';
  end if;

  if v_dep.bsu_id <> v_org then
    raise exception 'Setoran ini bukan untuk BSU Anda.';
  end if;

  if not (
    (v_dep.metode = 'antar' and v_dep.status = 'diajukan')
    or
    (v_dep.metode = 'jemput' and v_dep.status = 'dijadwalkan')
  ) then
    raise exception 'Status setoran tidak valid untuk penimbangan (status saat ini: %).', v_dep.status;
  end if;

  if exists (select 1 from public.deposit_items where deposit_id = p_deposit_id) then
    raise exception 'Setoran ini sudah pernah ditimbang.';
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    if jsonb_typeof(v_item) <> 'object' then
      raise exception 'Format item penimbangan tidak valid.';
    end if;

    v_waste_id := nullif(btrim(v_item ->> 'waste_type_id'), '')::uuid;
    if v_waste_id is null then
      raise exception 'Jenis sampah wajib dipilih pada setiap item.';
    end if;

    v_berat := (v_item ->> 'berat_final')::numeric(12,2);
    if v_berat is null or v_berat <= 0 then
      raise exception 'Berat final setiap item harus lebih dari 0 kg.';
    end if;

    v_harga_acuan := public.get_active_price(v_waste_id, v_org, 'beli');
    if v_harga_acuan is null then
      raise exception 'Harga beli BSU belum diatur untuk jenis sampah %.', v_waste_id;
    end if;

    v_harga := coalesce(
      nullif(btrim(v_item ->> 'harga_per_kg'), '')::integer,
      v_harga_acuan
    );

    if v_harga is null or v_harga <= 0 then
      raise exception 'Harga per kg harus lebih dari 0.';
    end if;

    v_alasan := nullif(btrim(v_item ->> 'alasan_penyesuaian'), '');

    if v_harga <> v_harga_acuan and v_alasan is null then
      raise exception 'Alasan penyesuaian harga wajib diisi jika harga diubah dari harga aktif.';
    end if;

    v_subtotal := round(v_berat * v_harga)::integer;
    if v_subtotal <= 0 then
      raise exception 'Subtotal item harus lebih dari 0.';
    end if;

    insert into public.deposit_items (
      deposit_id, waste_type_id, berat_final_kg, harga_per_kg,
      harga_acuan_per_kg, alasan_penyesuaian, subtotal
    ) values (
      p_deposit_id, v_waste_id, v_berat, v_harga,
      v_harga_acuan, v_alasan, v_subtotal
    );

    v_total_raw := v_total_raw + v_subtotal;
    v_jumlah_item := v_jumlah_item + 1;
  end loop;

  if v_jumlah_item = 0 then
    raise exception 'Minimal satu item hasil timbang wajib diisi.';
  end if;

  if v_potongan > v_total_raw then
    raise exception 'Potongan melebihi total hasil timbang.';
  end if;

  -- Total = jumlah subtotal - potongan, dibulatkan ke Rp100 terdekat.
  v_total := (round((v_total_raw - v_potongan)::numeric / 100.0) * 100)::integer;
  v_alasan_potongan := case when v_potongan > 0
    then nullif(btrim(p_alasan_potongan), '')
    else null
  end;

  update public.deposits
  set status = 'dicek_dibayar',
      metode_bayar = p_metode_bayar,
      total = v_total,
      potongan = v_potongan,
      alasan_potongan = v_alasan_potongan,
      dicek_at = now(),
      dibayar_at = now()
  where id = p_deposit_id
  returning * into v_dep;

  -- Kas keluar otomatis. Tidak ada saldo/tabungan warga.
  if v_total > 0 then
    insert into public.ledger_entries (
      org_id, arah, kategori, jumlah, ref_type, ref_id, keterangan, dicatat_oleh
    ) values (
      v_org,
      'keluar',
      'pembayaran_warga',
      v_total,
      'deposit',
      p_deposit_id,
      format('Pembayaran langsung setoran %s kepada warga', p_deposit_id),
      auth.uid()
    );
  end if;

  perform public.notify_user(
    v_dep.warga_id,
    'Hasil timbang dan pembayaran siap dikonfirmasi',
    format('Total diterima Rp%s. Silakan periksa rincian item dan konfirmasi.',
      to_char(v_total, 'FM999G999G999')),
    'setoran',
    '/warga/setoran/' || v_dep.id::text
  );

  return v_dep;
end;
$$;

-- Warga mengonfirmasi hasil cek dan pembayaran.
create or replace function public.confirm_deposit(p_deposit_id uuid)
returns public.deposits
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_dep public.deposits%rowtype;
begin
  select * into v_dep
  from public.deposits
  where id = p_deposit_id
  for update;

  if not found then
    raise exception 'Setoran tidak ditemukan.';
  end if;

  if v_dep.warga_id <> auth.uid() then
    raise exception 'Hanya pemilik setoran yang dapat mengonfirmasi.';
  end if;

  if v_dep.status <> 'dicek_dibayar' then
    raise exception 'Setoran belum siap dikonfirmasi.';
  end if;

  update public.deposits
  set status = 'dikonfirmasi',
      dikonfirmasi_at = now()
  where id = p_deposit_id
  returning * into v_dep;

  perform public.notify_org_staff(
    v_dep.bsu_id,
    'Setoran dikonfirmasi warga',
    format('Warga telah mengonfirmasi setoran %s. Data siap dikirim ke BSI.', v_dep.id),
    'setoran',
    '/bsu/setoran/' || v_dep.id::text
  );

  return v_dep;
end;
$$;

-- BSU mengirim data terkonfirmasi ke BSI. Nomor WA & lokasi tidak ikut
-- terekspos ke BSI karena aksesnya memakai view aman.
create or replace function public.send_deposit_to_bsi(
  p_deposit_id uuid,
  p_bsi_id uuid default null
)
returns public.deposits
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_dep public.deposits%rowtype;
  v_org uuid := public.get_my_org_id();
  v_bsi_id uuid := p_bsi_id;
  v_bsi_status public.verification_status;
begin
  if public.get_my_role() is distinct from 'bsu'::public.app_role then
    raise exception 'Hanya petugas BSU yang dapat mengirim data ke BSI.';
  end if;

  select * into v_dep
  from public.deposits
  where id = p_deposit_id
  for update;

  if not found then
    raise exception 'Setoran tidak ditemukan.';
  end if;

  if v_dep.bsu_id <> v_org then
    raise exception 'Setoran ini bukan untuk BSU Anda.';
  end if;

  if v_dep.status <> 'dikonfirmasi' then
    raise exception 'Hanya setoran terkonfirmasi yang dapat dikirim ke BSI.';
  end if;

  if not exists (select 1 from public.deposit_items where deposit_id = p_deposit_id) then
    raise exception 'Setoran belum memiliki item hasil timbang.';
  end if;

  if v_bsi_id is null then
    select o.id into v_bsi_id
    from public.organizations o
    where o.tipe = 'bsi' and o.status = 'verified'
    order by o.created_at
    limit 1;
  end if;

  if v_bsi_id is null then
    raise exception 'Belum ada BSI terverifikasi.';
  end if;

  select o.status into v_bsi_status
  from public.organizations o
  where o.id = v_bsi_id and o.tipe = 'bsi';

  if v_bsi_status is distinct from 'verified' then
    raise exception 'BSI tujuan tidak ditemukan atau belum terverifikasi.';
  end if;

  update public.deposits
  set bsi_id = v_bsi_id,
      status = 'dikirim_ke_bsi',
      dikirim_ke_bsi_at = now()
  where id = p_deposit_id
  returning * into v_dep;

  perform public.notify_org_staff(
    v_bsi_id,
    'Data setoran masuk dari BSU',
    format('BSU mengirim setoran %s untuk diperiksa dan dipublikasikan.', v_dep.id),
    'setoran',
    '/bsi/setoran/' || v_dep.id::text
  );

  return v_dep;
end;
$$;

-- BSI mempublikasikan setoran menjadi lot stok. Setiap item harus punya harga
-- jual aktif. Stok gabungan dibaca dari v_bsi_stock_summary.
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
    'Sampah Anda sudah masuk stok BSI dan tersedia bagi pengepul.',
    'stok',
    '/warga/setoran/' || v_dep.id::text
  );

  return query
    select * from public.bsi_stock
    where deposit_id = p_deposit_id
    order by created_at;
end;
$$;

-- Koreksi buku kas dilakukan dengan entri pembalik, bukan edit/hapus.
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
    'bsu'::public.app_role, 'bsi'::public.app_role, 'pengepul'::public.app_role
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

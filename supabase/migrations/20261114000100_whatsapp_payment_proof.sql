-- ============================================================================
-- UPCYCLE — 18: bukti pembayaran dua arah + antrean notifikasi WhatsApp
--
-- Fitur:
-- 1. BSU dapat mengunggah bukti transfer pembayaran setoran.
-- 2. Warga dapat mengonfirmasi pembayaran diterima atau melaporkan masalah.
-- 3. Perubahan status setoran otomatis masuk ke whatsapp_outbox. Pengiriman
--    dilakukan oleh Edge Function whatsapp-dispatch (opsional, di balik env).
--
-- Migration ini idempoten dan aman dijalankan berulang.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Kolom bukti pembayaran pada deposits.
-- ----------------------------------------------------------------------------
alter table public.deposits
  add column if not exists bukti_bayar_url text,
  add column if not exists bukti_bayar_at timestamptz,
  add column if not exists pembayaran_diterima_at timestamptz,
  add column if not exists pembayaran_ditolak_at timestamptz,
  add column if not exists alasan_bayar_ditolak text;

comment on column public.deposits.bukti_bayar_url is
  'Path storage bukti transfer/pembayaran yang diunggah BSU.';
comment on column public.deposits.pembayaran_diterima_at is
  'Waktu warga mengonfirmasi pembayaran diterima.';
comment on column public.deposits.pembayaran_ditolak_at is
  'Waktu warga melaporkan masalah pembayaran.';

-- ----------------------------------------------------------------------------
-- 2. Antrean WhatsApp. Ditulis oleh trigger, dikirim oleh Edge Function.
-- ----------------------------------------------------------------------------
create table if not exists public.whatsapp_outbox (
  id uuid primary key default gen_random_uuid(),
  phone text not null check (length(btrim(phone)) > 0),
  message text not null check (length(btrim(message)) > 0),
  template text,
  ref_type text,
  ref_id uuid,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'failed', 'skipped')),
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  scheduled_at timestamptz not null default now(),
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists whatsapp_outbox_pending_idx
  on public.whatsapp_outbox(status, scheduled_at, created_at)
  where status = 'pending';

create index if not exists whatsapp_outbox_ref_idx
  on public.whatsapp_outbox(ref_type, ref_id);

alter table public.whatsapp_outbox enable row level security;

drop policy if exists "whatsapp_outbox_admin_read" on public.whatsapp_outbox;
create policy "whatsapp_outbox_admin_read"
on public.whatsapp_outbox for select
to authenticated
using (public.is_admin());

revoke all on table public.whatsapp_outbox from anon, authenticated;
grant select on table public.whatsapp_outbox to authenticated;
grant all on table public.whatsapp_outbox to service_role;

-- Helper internal. Hanya dipanggil trigger SECURITY DEFINER.
create or replace function public.enqueue_whatsapp_message(
  p_phone text,
  p_message text,
  p_template text,
  p_ref_type text,
  p_ref_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if nullif(btrim(p_phone), '') is null
     or nullif(btrim(p_message), '') is null then
    return null;
  end if;

  insert into public.whatsapp_outbox (
    phone, message, template, ref_type, ref_id
  ) values (
    btrim(p_phone), btrim(p_message), p_template, p_ref_type, p_ref_id
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.enqueue_whatsapp_message(text, text, text, text, uuid)
  from public, anon, authenticated;

-- Trigger: setoran baru dan setiap perubahan status.
create or replace function public.queue_deposit_whatsapp()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_message text;
  v_template text;
begin
  if tg_op = 'INSERT' then
    perform public.enqueue_whatsapp_message(
      new.nomor_wa,
      format(
        'Halo! Setoran %s (%s kg) sudah kami terima dan sedang menunggu proses BSU. Pantau statusnya di aplikasi UPCYCLE.',
        new.estimasi_jenis,
        trim(to_char(new.estimasi_berat_kg, 'FM999999990.##'))
      ),
      'deposit_diajukan',
      'deposit',
      new.id
    );
    return new;
  end if;

  if new.status is not distinct from old.status then
    return new;
  end if;

  v_template := 'deposit_' || new.status::text;

  v_message := case new.status
    when 'dijadwalkan' then format(
      'BSU akan menjemput sampahmu pada %s. Siapkan sampah dan pastikan lokasi mudah dijangkau.',
      to_char(new.jadwal at time zone 'Asia/Jakarta', 'DD Mon YYYY HH24:MI')
    )
    when 'dicek_dibayar' then format(
      'Hasil timbang setoran %s sudah siap. Total Rp%s. Buka aplikasi UPCYCLE untuk memeriksa rincian dan mengonfirmasi.',
      new.estimasi_jenis,
      trim(to_char(new.total, 'FM999G999G999'))
    )
    when 'dikonfirmasi' then
      'Terima kasih sudah mengonfirmasi hasil timbang. BSU akan meneruskan data ke BSI.'
    when 'dikirim_ke_bsi' then
      'Data setoranmu sudah diteruskan BSU ke BSI untuk dipublikasikan menjadi stok.'
    when 'dipublikasikan' then
      'Sampahmu sudah masuk stok BSI dan siap disalurkan ke industri.'
    when 'dibeli_industri' then
      'Kabar baik! Sampah dari setoranmu sudah dibeli industri melalui BSI.'
    when 'diambil_bsi' then
      'Sampah dari setoranmu sudah diambil BSI sesuai jadwal.'
    when 'diambil_industri' then
      'Sampah dari setoranmu sudah diambil industri. Terima kasih sudah memilah sampah!'
    else null
  end;

  if v_message is not null then
    perform public.enqueue_whatsapp_message(
      new.nomor_wa,
      v_message,
      v_template,
      'deposit',
      new.id
    );
  end if;

  return new;
end;
$$;

drop trigger if exists deposits_queue_whatsapp_insert on public.deposits;
create trigger deposits_queue_whatsapp_insert
after insert on public.deposits
for each row execute function public.queue_deposit_whatsapp();

drop trigger if exists deposits_queue_whatsapp_update on public.deposits;
create trigger deposits_queue_whatsapp_update
after update of status on public.deposits
for each row execute function public.queue_deposit_whatsapp();

revoke all on function public.queue_deposit_whatsapp()
  from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 3. RPC bukti pembayaran.
-- ----------------------------------------------------------------------------
create or replace function public.set_deposit_payment_proof(
  p_deposit_id uuid,
  p_path text
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
    raise exception 'Hanya petugas BSU yang dapat mengunggah bukti pembayaran.';
  end if;

  if nullif(btrim(p_path), '') is null then
    raise exception 'Berkas bukti pembayaran wajib diisi.';
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

  if v_dep.status not in (
    'dicek_dibayar'::public.deposit_status,
    'dikonfirmasi'::public.deposit_status,
    'dikirim_ke_bsi'::public.deposit_status,
    'dipublikasikan'::public.deposit_status,
    'dibeli_industri'::public.deposit_status,
    'diambil_bsi'::public.deposit_status,
    'diambil_industri'::public.deposit_status
  ) then
    raise exception 'Bukti pembayaran hanya dapat diunggah setelah penimbangan.';
  end if;

  update public.deposits
  set bukti_bayar_url = btrim(p_path),
      bukti_bayar_at = now(),
      pembayaran_diterima_at = null,
      pembayaran_ditolak_at = null,
      alasan_bayar_ditolak = null
  where id = p_deposit_id
  returning * into v_dep;

  perform public.notify_user(
    v_dep.warga_id,
    'Bukti pembayaran tersedia',
    format(
      'BSU telah mengunggah bukti pembayaran setoran %s sebesar Rp%s. Silakan periksa dan konfirmasi.',
      v_dep.estimasi_jenis,
      trim(to_char(v_dep.total, 'FM999G999G999'))
    ),
    'setoran',
    '/warga/setoran/' || v_dep.id::text
  );

  return v_dep;
end;
$$;

create or replace function public.confirm_payment_received(
  p_deposit_id uuid,
  p_terima boolean,
  p_alasan text default null
)
returns public.deposits
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_dep public.deposits%rowtype;
  v_alasan text := nullif(btrim(p_alasan), '');
begin
  select * into v_dep
  from public.deposits
  where id = p_deposit_id
  for update;

  if not found then
    raise exception 'Setoran tidak ditemukan.';
  end if;

  if v_dep.warga_id <> auth.uid() then
    raise exception 'Hanya pemilik setoran yang dapat mengonfirmasi pembayaran.';
  end if;

  if v_dep.status not in (
    'dicek_dibayar'::public.deposit_status,
    'dikonfirmasi'::public.deposit_status,
    'dikirim_ke_bsi'::public.deposit_status,
    'dipublikasikan'::public.deposit_status,
    'dibeli_industri'::public.deposit_status,
    'diambil_bsi'::public.deposit_status,
    'diambil_industri'::public.deposit_status
  ) then
    raise exception 'Pembayaran belum dapat dikonfirmasi pada status ini.';
  end if;

  if p_terima is null then
    raise exception 'Pilih konfirmasi pembayaran diterima atau bermasalah.';
  end if;

  if not p_terima and v_alasan is null then
    raise exception 'Jelaskan masalah pembayaran yang kamu temui.';
  end if;

  update public.deposits
  set pembayaran_diterima_at = case when p_terima then now() else null end,
      pembayaran_ditolak_at = case when p_terima then null else now() end,
      alasan_bayar_ditolak = case when p_terima then null else v_alasan end
  where id = p_deposit_id
  returning * into v_dep;

  perform public.notify_org_staff(
    v_dep.bsu_id,
    case when p_terima
      then 'Warga mengonfirmasi pembayaran diterima'
      else 'Warga melaporkan masalah pembayaran'
    end,
    case when p_terima
      then format('Warga telah mengonfirmasi pembayaran setoran %s.', v_dep.id)
      else format('Warga melaporkan masalah pembayaran setoran %s: %s', v_dep.id, v_alasan)
    end,
    'setoran',
    '/bsu/setoran/' || v_dep.id::text
  );

  return v_dep;
end;
$$;

revoke all on function public.set_deposit_payment_proof(uuid, text)
  from public, anon, authenticated;
grant execute on function public.set_deposit_payment_proof(uuid, text)
  to authenticated;

revoke all on function public.confirm_payment_received(uuid, boolean, text)
  from public, anon, authenticated;
grant execute on function public.confirm_payment_received(uuid, boolean, text)
  to authenticated;

-- ----------------------------------------------------------------------------
-- 4. Storage bukti pembayaran. Path: {deposit_id}/{berkas}
-- Warga pemilik dan BSU tujuan boleh membaca; keduanya boleh mengunggah.
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-proofs',
  'payment-proofs',
  false,
  3145728,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "payment_proofs_select" on storage.objects;
create policy "payment_proofs_select"
on storage.objects for select
to authenticated
using (
  bucket_id = 'payment-proofs'
  and exists (
    select 1
    from public.deposits d
    where d.id::text = (storage.foldername(name))[1]
      and (
        d.warga_id = auth.uid()
        or d.bsu_id = public.get_my_org_id()
        or public.is_admin()
      )
  )
);

drop policy if exists "payment_proofs_insert" on storage.objects;
create policy "payment_proofs_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'payment-proofs'
  and exists (
    select 1
    from public.deposits d
    where d.id::text = (storage.foldername(name))[1]
      and (
        d.warga_id = auth.uid()
        or d.bsu_id = public.get_my_org_id()
        or public.is_admin()
      )
  )
);

drop policy if exists "payment_proofs_delete" on storage.objects;
create policy "payment_proofs_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'payment-proofs'
  and exists (
    select 1
    from public.deposits d
    where d.id::text = (storage.foldername(name))[1]
      and (
        d.bsu_id = public.get_my_org_id()
        or public.is_admin()
      )
  )
);

-- Muat ulang schema cache PostgREST agar RPC/kolom baru langsung terbaca.
notify pgrst, 'reload schema';

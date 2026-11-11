-- ============================================================================
-- UPCYCLE — 13: migrasi pembeli -> warga dan pengepul -> industri.
-- Trigger validasi dilepas sementara agar tipe organisasi dan peran profil
-- dapat diubah, lalu dipasang kembali dengan aturan baru.
-- ============================================================================

drop trigger if exists profiles_validate_role_org on public.profiles;
drop trigger if exists organizations_type_immutable on public.organizations;

update public.organizations
set tipe = 'industri'
where tipe = 'pengepul';

update public.profiles
set role = 'industri'
where role = 'pengepul';

update public.profiles
set role = 'warga'
where role = 'pembeli';

-- ----------------------------------------------------------------------------
-- Validasi profil: warga/admin tanpa organisasi; bsu/bsi/industri wajib
-- terhubung ke organisasi yang tipenya cocok.
-- ----------------------------------------------------------------------------
create or replace function public.validate_profile_role_org()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org_type public.org_type;
begin
  if new.role in ('bsu', 'bsi', 'industri') then
    if new.org_id is null then
      raise exception 'Peran % wajib terhubung ke organisasi.', new.role;
    end if;

    select o.tipe into v_org_type
    from public.organizations o
    where o.id = new.org_id;

    if v_org_type is null then
      raise exception 'Organisasi tidak ditemukan.';
    end if;

    if (new.role = 'bsu' and v_org_type <> 'bsu')
       or (new.role = 'bsi' and v_org_type <> 'bsi')
       or (new.role = 'industri' and v_org_type <> 'industri') then
      raise exception 'Peran % tidak cocok dengan tipe organisasi %.', new.role, v_org_type;
    end if;
  elsif new.org_id is not null then
    raise exception 'Peran warga dan admin tidak boleh terhubung ke organisasi usaha.';
  end if;

  return new;
end;
$$;

create trigger profiles_validate_role_org
before insert or update on public.profiles
for each row execute function public.validate_profile_role_org();

create trigger organizations_type_immutable
before update of tipe on public.organizations
for each row execute function public.forbid_organization_type_change();

-- ----------------------------------------------------------------------------
-- Registrasi mandiri selalu menjadi warga. Peran usaha hanya diberikan admin.
-- Metadata account_type dari klien tidak lagi menentukan peran.
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nama text;
begin
  v_nama := nullif(btrim(new.raw_user_meta_data ->> 'nama'), '');
  if v_nama is null then
    v_nama := split_part(coalesce(new.email, 'Pengguna'), '@', 1);
  end if;

  insert into public.profiles (id, nama, role)
  values (new.id, v_nama, 'warga'::public.app_role)
  on conflict (id) do nothing;

  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- Penjual produk: warga (tanpa organisasi) atau industri (dengan organisasi).
-- Fungsi diganti sebelum data lama diperbarui agar trigger produk tidak
-- menolak baris milik industri.
-- ----------------------------------------------------------------------------
create or replace function public.validate_product_seller()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.app_role;
  v_org_id uuid;
begin
  if tg_op = 'UPDATE' then
    if new.penjual_id is distinct from old.penjual_id then
      raise exception 'Pemilik produk tidak dapat diubah.';
    end if;
  end if;

  select p.role, p.org_id into v_role, v_org_id
  from public.profiles p
  where p.id = new.penjual_id;

  if v_role not in ('warga', 'industri') then
    raise exception 'Produk hanya boleh dijual oleh warga atau industri.';
  end if;

  if v_role = 'warga' and new.penjual_org_id is not null then
    raise exception 'Produk warga tidak boleh terhubung ke organisasi.';
  end if;

  if v_role = 'industri' and new.penjual_org_id is distinct from v_org_id then
    raise exception 'Produk industri harus terhubung ke organisasi industri.';
  end if;

  return new;
end;
$$;

-- Tautan notifikasi lama ikut dipindahkan ke rute baru.
update public.notifications
set link = replace(link, '/pengepul/', '/industri/')
where link like '/pengepul/%';

update public.notifications
set link = '/warga/pesanan'
where link = '/pembeli/pesanan';

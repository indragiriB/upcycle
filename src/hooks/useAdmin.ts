import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { WASTE_TYPES_KEY } from '@/hooks/usePrices';
import type {
  AdminProfileRecord,
  AppRole,
  OrganizationAdminRecord,
  VerificationStatus,
  WasteType,
} from '@/types/database';

export const ADMIN_ORGANIZATIONS_KEY = 'admin-organizations';
export const ADMIN_PROFILES_KEY = 'admin-profiles';

const ADMIN_PROFILE_SELECT = `
  id, nama, role, org_id, avatar_url, created_at,
  organizations:org_id (id, nama, tipe, status)
`;

const ADMIN_ORGANIZATION_SELECT = `
  id, tipe, nama, slug, alamat, kota, provinsi, telepon, email, lat, lng,
  logo_url, status, verified_at, verified_by, created_at, updated_at
`;

const WASTE_TYPE_SELECT = `
  id, nama, kode, kategori, deskripsi, ikon, warna, satuan, aktif,
  created_at, updated_at
`;

function readableError(
  error: { message: string; code?: string } | null,
  fallback: string,
) {
  if (error?.code === '23505' || error?.message.includes('duplicate key')) {
    return new Error('Nama atau kode jenis sampah sudah digunakan.');
  }

  return new Error(error?.message || fallback);
}

export interface WasteTypeInput {
  nama: string;
  kode: string;
  kategori: string;
  deskripsi: string;
  ikon: string;
  warna: string;
  satuan: string;
  aktif: boolean;
}

function normalizeWasteType(row: WasteType): WasteType {
  return {
    ...row,
    kode: row.kode ?? null,
    kategori: row.kategori ?? null,
    deskripsi: row.deskripsi ?? null,
    aktif: Boolean(row.aktif),
  };
}

export function useAdminWasteTypes() {
  return useQuery({
    queryKey: [WASTE_TYPES_KEY, 'admin'],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('waste_types')
        .select(WASTE_TYPE_SELECT)
        .order('nama', { ascending: true })
        .limit(500);

      if (error) throw readableError(error, 'Jenis sampah gagal dimuat.');
      return ((data ?? []) as WasteType[]).map(normalizeWasteType);
    },
  });
}

export function useCreateWasteType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: WasteTypeInput) => {
      const { data, error } = await supabase
        .from('waste_types')
        .insert({
          nama: input.nama.trim(),
          kode: input.kode.trim() || null,
          kategori: input.kategori.trim() || null,
          deskripsi: input.deskripsi.trim() || null,
          ikon: input.ikon.trim() || 'Recycle',
          warna: input.warna,
          satuan: input.satuan.trim() || 'kg',
          aktif: input.aktif,
        })
        .select(WASTE_TYPE_SELECT)
        .single();

      if (error) throw readableError(error, 'Jenis sampah gagal disimpan.');
      return normalizeWasteType(data as WasteType);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [WASTE_TYPES_KEY] });
      void queryClient.invalidateQueries({ queryKey: ['prices'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateWasteType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: WasteTypeInput & { id: string }) => {
      const { data, error } = await supabase
        .from('waste_types')
        .update({
          nama: input.nama.trim(),
          kode: input.kode.trim() || null,
          kategori: input.kategori.trim() || null,
          deskripsi: input.deskripsi.trim() || null,
          ikon: input.ikon.trim() || 'Recycle',
          warna: input.warna,
          satuan: input.satuan.trim() || 'kg',
          aktif: input.aktif,
        })
        .eq('id', input.id)
        .select(WASTE_TYPE_SELECT)
        .single();

      if (error) throw readableError(error, 'Perubahan jenis sampah gagal disimpan.');
      return normalizeWasteType(data as WasteType);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [WASTE_TYPES_KEY] });
      void queryClient.invalidateQueries({ queryKey: ['prices'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useAdminOrganizations() {
  return useQuery({
    queryKey: [ADMIN_ORGANIZATIONS_KEY],
    staleTime: 20_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select(ADMIN_ORGANIZATION_SELECT)
        .order('created_at', { ascending: false })
        .limit(300);

      if (error) {
        throw new Error(error.message || 'Organisasi gagal dimuat.');
      }

      return (data ?? []) as OrganizationAdminRecord[];
    },
  });
}

export interface OrganizationDetailsInput {
  id: string;
  nama: string;
  telepon: string;
  email: string;
  alamat: string;
  kota: string;
  provinsi: string;
  lat: number | null;
  lng: number | null;
}

export function useUpdateOrganizationDetails() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: OrganizationDetailsInput) => {
      const { data, error } = await supabase
        .from('organizations')
        .update({
          nama: input.nama.trim(),
          telepon: input.telepon.trim() || null,
          email: input.email.trim() || null,
          alamat: input.alamat.trim() || null,
          kota: input.kota.trim() || null,
          provinsi: input.provinsi.trim() || null,
          lat: input.lat,
          lng: input.lng,
        })
        .eq('id', input.id)
        .select(ADMIN_ORGANIZATION_SELECT)
        .single();

      if (error) {
        if (error.code === '23505' || error.message.includes('duplicate key')) {
          throw new Error('Nama organisasi sudah digunakan.');
        }
        throw new Error(error.message || 'Data organisasi gagal disimpan.');
      }

      return data as OrganizationAdminRecord;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [ADMIN_ORGANIZATIONS_KEY] });
      void queryClient.invalidateQueries({ queryKey: ['organizations'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateOrganizationStatus(adminId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      status: Extract<VerificationStatus, 'verified' | 'rejected' | 'pending'>;
    }) => {
      if (!adminId) {
        throw new Error('Sesi admin tidak ditemukan.');
      }

      const verified = input.status === 'verified';

      const { data, error } = await supabase
        .from('organizations')
        .update({
          status: input.status,
          verified_at: verified ? new Date().toISOString() : null,
          verified_by: verified ? adminId : null,
        })
        .eq('id', input.id)
        .select(ADMIN_ORGANIZATION_SELECT)
        .single();

      if (error) {
        throw new Error(error.message || 'Status organisasi gagal diperbarui.');
      }

      return data as OrganizationAdminRecord;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [ADMIN_ORGANIZATIONS_KEY] });
      void queryClient.invalidateQueries({ queryKey: ['organizations'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export interface UserAccessInput {
  id: string;
  role: AppRole;
  orgId: string | null;
}

function userAccessError(error: { message: string } | null) {
  const message = error?.message ?? '';

  if (message.includes('wajib terhubung ke organisasi')) {
    return new Error('Peran ini wajib terhubung ke organisasi.');
  }
  if (message.includes('tidak cocok dengan tipe organisasi')) {
    return new Error('Tipe organisasi tidak cocok dengan peran yang dipilih.');
  }
  if (message.includes('tidak boleh terhubung ke organisasi')) {
    return new Error('Peran warga dan admin tidak boleh terhubung ke organisasi usaha.');
  }

  return new Error(message || 'Peran pengguna gagal diperbarui.');
}

export function useAdminProfiles() {
  return useQuery({
    queryKey: [ADMIN_PROFILES_KEY],
    staleTime: 20_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(ADMIN_PROFILE_SELECT)
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) {
        throw new Error(error.message || 'Daftar pengguna gagal dimuat.');
      }

      return (data ?? []) as unknown as AdminProfileRecord[];
    },
  });
}

export function useUpdateUserAccess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UserAccessInput) => {
      const { data, error } = await supabase
        .from('profiles')
        .update({ role: input.role, org_id: input.orgId })
        .eq('id', input.id)
        .select(ADMIN_PROFILE_SELECT)
        .single();

      if (error) throw userAccessError(error);

      return data as unknown as AdminProfileRecord;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [ADMIN_PROFILES_KEY] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

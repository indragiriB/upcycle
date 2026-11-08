import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { WASTE_TYPES_KEY } from '@/hooks/usePrices';
import type {
  OrganizationAdminRecord,
  VerificationStatus,
  WasteType,
} from '@/types/database';

export const ADMIN_ORGANIZATIONS_KEY = 'admin-organizations';

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

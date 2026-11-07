import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/auth/AuthProvider';

export interface DbProduct {
  id: string;
  penjual_id: string;
  penjual_org_id: string | null;
  nama: string;
  deskripsi: string | null;
  kategori: string | null;
  harga: number;
  stok: number;
  satuan: string;
  foto_urls: string[];
  status: 'aktif' | 'nonaktif' | 'habis';
  created_at: string;
  penjual?: {
    id: string;
    nama: string;
    role: string;
  } | null;
  org?: {
    id: string;
    nama: string;
  } | null;
}

export function useMarketplaceProducts() {
  const { session } = useAuth();

  return useQuery({
    queryKey: ['marketplace-products', session?.user?.id],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          penjual_id,
          penjual_org_id,
          nama,
          deskripsi,
          kategori,
          harga,
          stok,
          satuan,
          foto_urls,
          status,
          created_at,
          penjual:profiles!products_penjual_id_fkey(id, nama, role),
          org:organizations!products_penjual_org_id_fkey(id, nama)
        `)
        .eq('status', 'aktif')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Gagal memuat produk dari DB, menggunakan fallback:', error.message);
        return [] as DbProduct[];
      }

      return (data ?? []) as unknown as DbProduct[];
    },
  });
}

export function useCreateMarketplaceProduct() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({
      nama,
      kategori,
      bankSampah,
      harga,
      kondisi,
      deskripsi,
    }: {
      nama: string;
      kategori: string;
      bankSampah: string;
      harga: number;
      kondisi: string;
      deskripsi: string;
    }) => {
      if (!profile) throw new Error('Harus login terlebih dahulu.');

      // Validasi role: trigger DB mengizinkan 'warga' atau 'pengepul'
      // Jika role lain (misal pembeli/admin/bsu), kita fallback aman
      const roundedHarga = Math.max(100, Math.round(harga / 100) * 100);
      const combinedDescription = `[Bank: ${bankSampah}] [Kondisi: ${kondisi}] ${deskripsi || 'Barang layak pakai terverifikasi.'}`;

      const { data, error } = await supabase
        .from('products')
        .insert({
          penjual_id: profile.id,
          penjual_org_id: profile.role === 'pengepul' ? profile.org_id : null,
          nama: nama.startsWith('SIM · ') ? nama : `SIM · ${nama}`,
          deskripsi: combinedDescription,
          kategori,
          harga: roundedHarga,
          stok: 1,
          satuan: 'pcs',
          status: 'aktif',
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-products'] });
    },
  });
}


import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toNumber } from '@/lib/utils';
import type {
  AppRole,
  PaymentMethod,
  ProductCondition,
  ProductOrderRecord,
  ProductRecord,
  Profile,
} from '@/types/database';

export const PRODUCTS_KEY = 'products';
export const PRODUCT_ORDERS_KEY = 'product-orders';

const PRODUCT_SELECT = `
  id, penjual_id, penjual_org_id, nama, deskripsi, kategori, kondisi, harga, stok,
  satuan, foto_urls, status, created_at, updated_at,
  penjual:profiles!products_penjual_id_fkey(id, nama, role, avatar_url),
  org:organizations!products_penjual_org_id_fkey(id, nama, kota)
`;

const PRODUCT_ORDER_SELECT = `
  id, nomor, pembeli_id, penjual_id, penjual_org_id, status, subtotal, total,
  metode_bayar, nomor_wa, alamat, catatan, dibayar_at, selesai_at, created_at,
  updated_at,
  pembeli:profiles!product_orders_pembeli_id_fkey(nama),
  penjual:profiles!product_orders_penjual_id_fkey(nama, role),
  penjual_org:organizations!product_orders_penjual_org_id_fkey(nama, alamat, kota, telepon),
  product_order_items(
    id, order_id, product_id, nama_produk, harga_satuan, jumlah, subtotal,
    kondisi_produk, created_at,
    products(foto_urls)
  )
`;

function readableError(error: { message: string } | null, fallback: string) {
  return new Error(error?.message || fallback);
}

function normalizeProduct(row: ProductRecord): ProductRecord {
  return {
    ...row,
    harga: toNumber(row.harga),
    stok: toNumber(row.stok),
    foto_urls: row.foto_urls ?? [],
  };
}

function normalizeOrder(row: ProductOrderRecord): ProductOrderRecord {
  return {
    ...row,
    subtotal: toNumber(row.subtotal),
    total: toNumber(row.total),
    product_order_items: (row.product_order_items ?? []).map((item) => ({
      ...item,
      harga_satuan: toNumber(item.harga_satuan),
      jumlah: toNumber(item.jumlah),
      subtotal: toNumber(item.subtotal),
    })),
  };
}

function invalidateProductData(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: [PRODUCTS_KEY] });
  void queryClient.invalidateQueries({ queryKey: [PRODUCT_ORDERS_KEY] });
  void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
}

const CATALOG_PAGE_SIZE = 24;

export function useCatalogProducts() {
  return useInfiniteQuery({
    queryKey: [PRODUCTS_KEY, 'catalog'],
    staleTime: 20_000,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const from = pageParam * CATALOG_PAGE_SIZE;
      const { data, error } = await supabase
        .from('products')
        .select(PRODUCT_SELECT)
        .eq('status', 'aktif')
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(from, from + CATALOG_PAGE_SIZE - 1);

      if (error) throw readableError(error, 'Produk marketplace gagal dimuat.');
      return ((data ?? []) as unknown as ProductRecord[]).map(normalizeProduct);
    },
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < CATALOG_PAGE_SIZE ? undefined : allPages.length,
  });
}

export function useSellerProducts({
  userId,
  orgId,
  role,
}: {
  userId: string | null;
  orgId: string | null;
  role: AppRole | null;
}) {
  const sellerKey = role === 'industri' && orgId ? orgId : userId;

  return useQuery({
    queryKey: [PRODUCTS_KEY, 'seller', sellerKey],
    enabled: Boolean(userId && sellerKey),
    staleTime: 15_000,
    queryFn: async () => {
      let request = supabase
        .from('products')
        .select(PRODUCT_SELECT)
        .order('created_at', { ascending: false })
        .limit(200);

      request =
        role === 'industri' && orgId
          ? request.eq('penjual_org_id', orgId)
          : request.eq('penjual_id', userId);

      const { data, error } = await request;
      if (error) throw readableError(error, 'Produk Anda gagal dimuat.');
      return ((data ?? []) as unknown as ProductRecord[]).map(normalizeProduct);
    },
  });
}

export function useProductOrders({
  role,
  userId,
  orgId,
}: {
  role: 'warga' | 'penjual';
  userId: string | null;
  orgId: string | null;
}) {
  const orderKey = role === 'penjual' && orgId ? orgId : userId;

  return useQuery({
    queryKey: [PRODUCT_ORDERS_KEY, role, orderKey],
    enabled: Boolean(userId && orderKey),
    staleTime: 15_000,
    queryFn: async () => {
      let request = supabase
        .from('product_orders')
        .select(PRODUCT_ORDER_SELECT)
        .order('created_at', { ascending: false })
        .limit(200);

      request =
        role === 'warga'
          ? request.eq('pembeli_id', userId)
          : orgId
            ? request.eq('penjual_org_id', orgId)
            : request.eq('penjual_id', userId);

      const { data, error } = await request;
      if (error) throw readableError(error, 'Pesanan produk gagal dimuat.');
      return ((data ?? []) as unknown as ProductOrderRecord[]).map(
        normalizeOrder,
      );
    },
  });
}

export interface ProductInput {
  nama: string;
  deskripsi: string;
  kategori: string;
  kondisi: ProductCondition;
  harga: number;
  stok: number;
  satuan: string;
  fotoUrls: string[];
}

export function useCreateProduct(profile: Profile | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ProductInput) => {
      if (!profile) throw new Error('Harus login terlebih dahulu.');

      const { data, error } = await supabase
        .from('products')
        .insert({
          penjual_id: profile.id,
          penjual_org_id:
            profile.role === 'industri' ? profile.org_id : null,
          nama: input.nama.trim(),
          deskripsi: input.deskripsi.trim() || null,
          kategori: input.kategori.trim() || null,
          kondisi: input.kondisi,
          harga: input.harga,
          stok: input.stok,
          satuan: input.satuan.trim() || 'pcs',
          foto_urls: input.fotoUrls,
          status: 'aktif',
        })
        .select(PRODUCT_SELECT)
        .single();

      if (error) throw readableError(error, 'Produk gagal disimpan.');
      return normalizeProduct(data as unknown as ProductRecord);
    },
    onSuccess: () => invalidateProductData(queryClient),
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: ProductInput & {
        id: string;
        status: 'aktif' | 'nonaktif';
      },
    ) => {
      const { data, error } = await supabase
        .from('products')
        .update({
          nama: input.nama.trim(),
          deskripsi: input.deskripsi.trim() || null,
          kategori: input.kategori.trim() || null,
          kondisi: input.kondisi,
          harga: input.harga,
          stok: input.stok,
          satuan: input.satuan.trim() || 'pcs',
          foto_urls: input.fotoUrls,
          status: input.status,
        })
        .eq('id', input.id)
        .select(PRODUCT_SELECT)
        .single();

      if (error) throw readableError(error, 'Perubahan produk gagal disimpan.');
      return normalizeProduct(data as unknown as ProductRecord);
    },
    onSuccess: () => invalidateProductData(queryClient),
  });
}

export function useCreateProductOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      items: Array<{ product_id: string; jumlah: number }>;
      nomorWa: string;
      alamat: string;
      catatan: string;
    }) => {
      const { data, error } = await supabase.rpc('create_product_order', {
        p_items: input.items,
        p_nomor_wa: input.nomorWa,
        p_alamat: input.alamat,
        p_catatan: input.catatan,
      });

      if (error) {
        throw readableError(error, 'Pesanan produk gagal dibuat.');
      }

      return data as unknown as ProductOrderRecord;
    },
    onSuccess: () => invalidateProductData(queryClient),
  });
}

export function usePayProductOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      orderId: string;
      metodeBayar: PaymentMethod;
    }) => {
      const { data, error } = await supabase.rpc('pay_product_order', {
        p_order_id: input.orderId,
        p_metode: input.metodeBayar,
      });

      if (error) {
        throw readableError(error, 'Pembayaran pesanan gagal dicatat.');
      }

      return data as unknown as ProductOrderRecord;
    },
    onSuccess: () => {
      invalidateProductData(queryClient);
      void queryClient.invalidateQueries({ queryKey: ['cash'] });
    },
  });
}

export function useShipProductOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      const { data, error } = await supabase.rpc('ship_product_order', {
        p_order_id: orderId,
      });

      if (error) {
        throw readableError(error, 'Pesanan gagal ditandai dikirim.');
      }

      return data as unknown as ProductOrderRecord;
    },
    onSuccess: () => invalidateProductData(queryClient),
  });
}

export function useCompleteProductOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      const { data, error } = await supabase.rpc('complete_product_order', {
        p_order_id: orderId,
      });

      if (error) {
        throw readableError(error, 'Pesanan gagal diselesaikan.');
      }

      return data as unknown as ProductOrderRecord;
    },
    onSuccess: () => invalidateProductData(queryClient),
  });
}

export function useCancelProductOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      const { data, error } = await supabase.rpc('cancel_product_order', {
        p_order_id: orderId,
      });

      if (error) {
        throw readableError(error, 'Pesanan gagal dibatalkan.');
      }

      return data as unknown as ProductOrderRecord;
    },
    onSuccess: () => {
      invalidateProductData(queryClient);
      void queryClient.invalidateQueries({ queryKey: ['cash'] });
    },
  });
}

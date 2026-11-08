import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BottleWine,
  Box,
  CheckCircle2,
  CircleDot,
  Cpu,
  FileText,
  GlassWater,
  Layers,
  Package,
  Plus,
  Recycle,
  RefreshCw,
  Search,
  Shirt,
  TreePine,
  Wine,
  type LucideIcon,
} from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import {
  useAdminWasteTypes,
  useUpdateWasteType,
} from '@/hooks/useAdmin';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatCard, StatCardSkeleton } from '@/components/dashboard/StatCard';
import { WasteTypeFormDialog } from '@/components/admin/WasteTypeFormDialog';
import type { DashboardStat, WasteType } from '@/types/database';

const ICONS: Record<string, LucideIcon> = {
  Recycle,
  Package,
  FileText,
  GlassWater,
  BottleWine,
  Wine,
  CircleDot,
  Cpu,
  Shirt,
  TreePine,
  Box,
  Layers,
  // Nilai lama dari seed awal tetap dipetakan agar tidak kehilangan ikon.
  Bottle: BottleWine,
};

const STATUS_FILTERS = [
  { key: 'semua', label: 'Semua' },
  { key: 'aktif', label: 'Aktif' },
  { key: 'nonaktif', label: 'Nonaktif' },
] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number]['key'];

export function WasteTypesPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('semua');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<WasteType | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{
    tone: 'success' | 'error';
    text: string;
  } | null>(null);

  usePageTitle('Master jenis sampah');

  const wasteTypesQuery = useAdminWasteTypes();
  const updateMutation = useUpdateWasteType();
  const wasteTypes = wasteTypesQuery.data ?? [];

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 6000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const categories = useMemo(
    () =>
      new Set(
        wasteTypes
          .map((item) => item.kategori)
          .filter((value): value is string => Boolean(value)),
      ).size,
    [wasteTypes],
  );

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return wasteTypes.filter((item) => {
      if (statusFilter === 'aktif' && !item.aktif) return false;
      if (statusFilter === 'nonaktif' && item.aktif) return false;
      if (!keyword) return true;
      return `${item.nama} ${item.kode ?? ''} ${item.kategori ?? ''} ${
        item.deskripsi ?? ''
      }`
        .toLowerCase()
        .includes(keyword);
    });
  }, [wasteTypes, search, statusFilter]);

  const activeCount = wasteTypes.filter((item) => item.aktif).length;
  const inactiveCount = wasteTypes.length - activeCount;

  const stats: DashboardStat[] = [
    {
      key: 'total',
      label: 'Total jenis',
      value: wasteTypes.length,
      format: 'number',
      hint: 'Seluruh master sampah',
    },
    {
      key: 'aktif',
      label: 'Jenis aktif',
      value: activeCount,
      format: 'number',
      hint: 'Bisa dipakai BSU & BSI',
    },
    {
      key: 'nonaktif',
      label: 'Nonaktif',
      value: inactiveCount,
      format: 'number',
      hint: 'Disembunyikan dari pilihan',
    },
    {
      key: 'kategori',
      label: 'Kategori',
      value: categories,
      format: 'number',
      hint: 'Pengelompokan jenis',
    },
  ];

  const handleToggle = async (item: WasteType) => {
    setNotice(null);
    setPendingId(item.id);
    try {
      await updateMutation.mutateAsync({
        id: item.id,
        nama: item.nama,
        kode: item.kode ?? '',
        kategori: item.kategori ?? '',
        deskripsi: item.deskripsi ?? '',
        ikon: item.ikon,
        warna: item.warna,
        satuan: item.satuan,
        aktif: !item.aktif,
      });
      setNotice({
        tone: 'success',
        text: item.aktif
          ? `${item.nama} dinonaktifkan. Jenis ini tidak lagi muncul di pilihan baru.`
          : `${item.nama} diaktifkan kembali.`,
      });
    } catch (failure) {
      setNotice({
        tone: 'error',
        text:
          failure instanceof Error
            ? failure.message
            : 'Status jenis sampah gagal diubah.',
      });
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4 pb-4">
      <PageHeader
        eyebrow="Master data admin"
        title="Jenis sampah"
        description="Kelola daftar jenis sampah yang dipakai BSU dan BSI untuk penimbangan, harga, serta stok."
        backTo="/dashboard"
        backLabel="Kembali ke dashboard"
        actions={
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            Tambah jenis
          </Button>
        }
      />

      {notice && (
        <div
          className={`flex items-start gap-2.5 rounded-2xl border px-4 py-3 text-[11px] leading-5 ${
            notice.tone === 'success'
              ? 'border-brand-100 bg-brand-50 text-brand-900'
              : 'border-red-100 bg-red-50 text-red-700'
          }`}
        >
          {notice.tone === 'success' ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          {notice.text}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {wasteTypesQuery.isLoading
          ? [0, 1, 2, 3].map((item) => <StatCardSkeleton key={item} />)
          : stats.map((stat) => <StatCard key={stat.key} stat={stat} />)}
      </div>

      <Card className="p-4 md:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="w-full max-w-sm">
            <Input
              label="Cari jenis sampah"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nama, kode, atau kategori"
              icon={Search}
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {STATUS_FILTERS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setStatusFilter(item.key)}
                className={`rounded-full px-3 py-1.5 text-[10px] font-semibold transition-colors ${
                  statusFilter === item.key
                    ? 'bg-brand-600 text-white'
                    : 'bg-[#f2f5f1] text-muted hover:bg-[#e9eee6] hover:text-ink'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          {wasteTypesQuery.isLoading && (
            <div className="space-y-2">
              {[0, 1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-[22px] border border-black/[0.04] p-3.5"
                >
                  <Skeleton className="h-10 w-10 rounded-2xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-40" />
                    <Skeleton className="h-2.5 w-52" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {wasteTypesQuery.isError && (
            <EmptyState
              icon={Recycle}
              title="Jenis sampah belum bisa dimuat"
              description="Periksa koneksi Supabase lalu coba lagi."
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void wasteTypesQuery.refetch()}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Coba lagi
                </Button>
              }
            />
          )}

          {!wasteTypesQuery.isLoading &&
            !wasteTypesQuery.isError &&
            wasteTypes.length === 0 && (
              <EmptyState
                icon={Recycle}
                title="Belum ada jenis sampah"
                description="Tambahkan jenis sampah pertama agar BSU dan BSI dapat menimbang setoran."
                action={
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditing(null);
                      setDialogOpen(true);
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Tambah jenis
                  </Button>
                }
              />
            )}

          {!wasteTypesQuery.isLoading &&
            !wasteTypesQuery.isError &&
            wasteTypes.length > 0 &&
            filtered.length === 0 && (
              <EmptyState
                icon={Recycle}
                title="Tidak ada jenis pada filter ini"
                description="Ubah kata kunci atau pilih status lain."
              />
            )}

          {!wasteTypesQuery.isLoading &&
            !wasteTypesQuery.isError &&
            filtered.length > 0 && (
              <div className="space-y-2">
                {filtered.map((item) => {
                  const Icon = ICONS[item.ikon] ?? Recycle;
                  const isToggling = pendingId === item.id;

                  return (
                    <article
                      key={item.id}
                      className="flex flex-col gap-3 rounded-[22px] border border-black/[0.05] bg-white p-3.5 sm:flex-row sm:items-center"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <span
                          aria-hidden="true"
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white"
                          style={{ backgroundColor: item.warna || '#22C55E' }}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="truncate text-[13px] font-bold text-ink">
                              {item.nama}
                            </p>
                            {item.kode && (
                              <Badge
                                tone="neutral"
                                className="px-2 py-0.5 text-[9px]"
                              >
                                {item.kode}
                              </Badge>
                            )}
                            <Badge
                              tone={item.aktif ? 'green' : 'neutral'}
                              className="px-2 py-0.5 text-[9px]"
                            >
                              {item.aktif ? 'Aktif' : 'Nonaktif'}
                            </Badge>
                          </div>
                          <p className="mt-0.5 text-[10px] text-muted">
                            {item.kategori || 'Tanpa kategori'} · per{' '}
                            {item.satuan}
                            {item.deskripsi ? ` · ${item.deskripsi}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          loading={isToggling}
                          onClick={() => void handleToggle(item)}
                        >
                          {item.aktif ? 'Nonaktifkan' : 'Aktifkan'}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            setEditing(item);
                            setDialogOpen(true);
                          }}
                        >
                          Ubah
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
        </div>
      </Card>

      {!wasteTypesQuery.isLoading && !wasteTypesQuery.isError && (
        <p className="px-1 text-[10px] text-muted">
          Menampilkan {filtered.length} dari {wasteTypes.length} jenis sampah.
          Jenis nonaktif tetap tersimpan untuk riwayat transaksi lama.
        </p>
      )}

      <WasteTypeFormDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditing(null);
        }}
        wasteType={editing}
      />
    </div>
  );
}

import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  Circle,
  Inbox,
  Info,
  RefreshCw,
  Scale,
  ShieldCheck,
  Warehouse,
} from 'lucide-react';
import { useAuth } from '@/auth/AuthProvider';
import { usePageTitle } from '@/hooks/usePageTitle';
import {
  useBsiDepositItems,
  useBsiIncomingDeposit,
  usePublishDepositToStock,
} from '@/hooks/useBsi';
import {
  formatCurrency,
  formatDateTime,
  formatWeight,
  toNumber,
} from '@/lib/utils';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button, buttonStyles } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { DepositStatusBadge } from '@/components/deposits/DepositStatusBadge';
import type { BsiIncomingDeposit, DepositItem } from '@/types/database';

function ItemsTable({ items }: { items: DepositItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={Scale}
        title="Rincian timbangan belum tersedia"
        description="Item setoran akan muncul setelah BSU menyelesaikan penimbangan."
        compact
      />
    );
  }

  return (
    <div className="-mx-1 overflow-x-auto">
      <table className="w-full min-w-[480px] text-left text-[11px]">
        <thead>
          <tr className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted">
            <th className="px-2 py-2 font-bold">Jenis sampah</th>
            <th className="px-2 py-2 text-right font-bold">Berat final</th>
            <th className="px-2 py-2 text-right font-bold">Harga BSU/kg</th>
            <th className="px-2 py-2 text-right font-bold">Subtotal</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-black/[0.05]">
          {items.map((item) => (
            <tr key={item.id} className="align-top">
              <td className="px-2 py-3">
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{
                      backgroundColor: item.waste_types?.warna ?? '#22C55E',
                    }}
                  />
                  <p className="font-semibold text-ink">
                    {item.waste_types?.nama ?? 'Jenis sampah'}
                  </p>
                </div>
              </td>
              <td className="px-2 py-3 text-right font-semibold text-ink">
                {formatWeight(toNumber(item.berat_final_kg))}
              </td>
              <td className="px-2 py-3 text-right text-muted">
                {formatCurrency(toNumber(item.harga_per_kg))}
              </td>
              <td className="px-2 py-3 text-right font-bold text-ink">
                {formatCurrency(toNumber(item.subtotal))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TimelineStep({
  title,
  description,
  at,
  done,
  last,
}: {
  title: string;
  description: string;
  at: string | null;
  done: boolean;
  last?: boolean;
}) {
  return (
    <div className="relative flex gap-3 pb-4 last:pb-0">
      {!last && (
        <span
          aria-hidden="true"
          className={`absolute left-[11px] top-6 h-[calc(100%-12px)] w-px ${
            done ? 'bg-brand-200' : 'bg-black/[0.06]'
          }`}
        />
      )}
      <span
        className={`relative z-10 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full ${
          done
            ? 'bg-brand-600 text-white'
            : 'border border-black/10 bg-white text-muted'
        }`}
      >
        {done ? (
          <CheckCircle2 className="h-3 w-3" />
        ) : (
          <Circle className="h-2.5 w-2.5" />
        )}
      </span>
      <div className="min-w-0 pt-0.5">
        <p
          className={`text-[11px] font-bold ${
            done ? 'text-ink' : 'text-muted'
          }`}
        >
          {title}
        </p>
        <p className="mt-0.5 text-[10px] leading-4 text-muted">
          {description}
        </p>
        <p className="mt-0.5 text-[9px] text-muted">
          {at ? formatDateTime(at) : 'Belum terjadi'}
        </p>
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-56" />
      <div className="grid gap-4 lg:grid-cols-[1.5fr_0.8fr]">
        <div className="space-y-4">
          <Skeleton className="h-48 rounded-[24px]" />
          <Skeleton className="h-56 rounded-[24px]" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-52 rounded-[24px]" />
          <Skeleton className="h-40 rounded-[24px]" />
        </div>
      </div>
    </div>
  );
}

function timelineFor(deposit: BsiIncomingDeposit) {
  const purchased =
    deposit.status === 'dibeli_pengepul' ||
    deposit.status === 'diambil_bsi' ||
    deposit.status === 'diambil_pengepul';

  return [
    {
      key: 'dikirim',
      title: 'Dikirim BSU ke BSI',
      description:
        'BSU meneruskan data setoran yang sudah dikonfirmasi warga.',
      at: deposit.dikirim_ke_bsi_at,
      done: Boolean(deposit.dikirim_ke_bsi_at),
    },
    {
      key: 'dipublikasikan',
      title: 'Dipublikasikan menjadi stok',
      description:
        'BSI mengubah setoran menjadi lot stok yang dapat dibeli industri.',
      at: deposit.dipublikasikan_at,
      done: Boolean(deposit.dipublikasikan_at),
    },
    {
      key: 'dibeli',
      title: 'Dibeli industri',
      description:
        'Lot stok dialokasikan ke pesanan industri yang sah.',
      at: purchased ? deposit.updated_at : null,
      done: purchased,
    },
    {
      key: 'diambil_bsi',
      title: 'Diambil BSI dari BSU',
      description: 'Stok sudah dijemput dari BSU asal.',
      at: deposit.diambil_bsi_at,
      done: Boolean(deposit.diambil_bsi_at),
    },
    {
      key: 'diambil_pengepul',
      title: 'Diambil industri',
      description: 'Stok sudah diambil industri di lokasi BSI.',
      at: deposit.diambil_pengepul_at,
      done: Boolean(deposit.diambil_pengepul_at),
    },
  ];
}

export function IncomingDepositDetailPage() {
  const { depositId } = useParams<{ depositId: string }>();
  const { profile } = useAuth();
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const depositQuery = useBsiIncomingDeposit(depositId);
  const itemsQuery = useBsiDepositItems(depositId);
  const publishMutation = usePublishDepositToStock();

  const deposit = depositQuery.data ?? null;

  usePageTitle(
    deposit ? `Setoran ${deposit.warga_nama}` : 'Detail data masuk',
  );

  if (!profile) return null;

  const handlePublish = async () => {
    if (!deposit) return;
    setMessage(null);
    try {
      await publishMutation.mutateAsync(deposit.id);
      setMessage({
        type: 'success',
        text: 'Setoran berhasil dipublikasikan menjadi stok BSI.',
      });
    } catch (failure) {
      setMessage({
        type: 'error',
        text:
          failure instanceof Error
            ? failure.message
            : 'Stok gagal dipublikasikan.',
      });
    }
  };

  const loading = depositQuery.isLoading || itemsQuery.isLoading;
  const error = depositQuery.isError || itemsQuery.isError;

  return (
    <div className="mx-auto max-w-6xl space-y-4 pb-4">
      <PageHeader
        eyebrow="Data masuk BSI"
        title={deposit ? deposit.estimasi_jenis : 'Detail setoran'}
        description={
          deposit
            ? `Setoran dari ${deposit.warga_nama} melalui ${deposit.bsu_nama}.`
            : 'Periksa rincian setoran yang diterima BSI.'
        }
        backTo="/bsi/setoran"
        backLabel="Kembali ke data masuk"
        actions={
          deposit ? <DepositStatusBadge status={deposit.status} /> : undefined
        }
      />

      {loading && <DetailSkeleton />}

      {!loading && (error || !deposit) && (
        <Card className="p-5">
          <EmptyState
            icon={Inbox}
            title={error ? 'Detail belum bisa dimuat' : 'Setoran tidak ditemukan'}
            description={
              error
                ? 'Periksa koneksi Supabase lalu coba lagi.'
                : 'Data ini tidak tersedia untuk organisasi BSI Anda.'
            }
            action={
              error ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    void depositQuery.refetch();
                    void itemsQuery.refetch();
                  }}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Coba lagi
                </Button>
              ) : (
                <Link
                  to="/bsi/setoran"
                  className={buttonStyles({ variant: 'secondary', size: 'sm' })}
                >
                  Kembali
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )
            }
          />
        </Card>
      )}

      {!loading && deposit && (
        <>
          {message && (
            <div
              className={`flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-[11px] leading-5 ${
                message.type === 'success'
                  ? 'border-brand-100 bg-brand-50 text-brand-900'
                  : 'border-red-100 bg-red-50 text-red-700'
              }`}
            >
              <p className="flex items-start gap-2">
                {message.type === 'success' ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                ) : (
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                )}
                {message.text}
              </p>
              <button
                type="button"
                onClick={() => setMessage(null)}
                className="text-[10px] font-semibold underline-offset-2 hover:underline"
              >
                Tutup
              </button>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-[1.5fr_0.8fr]">
            <div className="space-y-4">
              <Card className="p-4 md:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      aria-hidden="true"
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white"
                      style={{
                        backgroundColor:
                          itemsQuery.data?.[0]?.waste_types?.warna ??
                          '#22C55E',
                      }}
                    >
                      <Scale className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-ink">
                        {deposit.estimasi_jenis}
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted">
                        {deposit.warga_nama} · dari {deposit.bsu_nama}
                      </p>
                      <p className="mt-1 text-[10px] text-muted">
                        Diajukan {formatDateTime(deposit.created_at)} · ID{' '}
                        {deposit.id.slice(0, 8)}
                      </p>
                    </div>
                  </div>
                  <Badge tone="neutral" className="px-2 py-0.5 text-[9px]">
                    {deposit.metode === 'jemput'
                      ? 'Dijemput BSU'
                      : 'Diantar ke BSU'}
                  </Badge>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <div className="rounded-2xl bg-[#f8faf7] px-3.5 py-2.5">
                    <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted">
                      Berat final
                    </p>
                    <p className="mt-0.5 text-[12px] font-bold text-ink">
                      {formatWeight(toNumber(deposit.berat_final_kg))}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[#f8faf7] px-3.5 py-2.5">
                    <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted">
                      Dibayar BSU
                    </p>
                    <p className="mt-0.5 text-[12px] font-bold text-ink">
                      {formatCurrency(toNumber(deposit.total))}
                    </p>
                  </div>
                  <div className="col-span-2 rounded-2xl bg-[#f8faf7] px-3.5 py-2.5 sm:col-span-1">
                    <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted">
                      Konfirmasi warga
                    </p>
                    <p className="mt-0.5 text-[11px] font-semibold text-ink">
                      {deposit.dikonfirmasi_at
                        ? formatDateTime(deposit.dikonfirmasi_at)
                        : 'Belum dikonfirmasi'}
                    </p>
                  </div>
                </div>

                {toNumber(deposit.potongan) > 0 && (
                  <p className="mt-2 rounded-2xl bg-amber-50 px-3.5 py-2.5 text-[10px] leading-4 text-amber-800">
                    Potongan {formatCurrency(toNumber(deposit.potongan))}
                    {deposit.alasan_potongan
                      ? ` · ${deposit.alasan_potongan}`
                      : ''}
                  </p>
                )}
              </Card>

              <Card className="p-4 md:p-5">
                <div className="mb-3 flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                    <Scale className="h-[18px] w-[18px]" />
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-ink">
                      Rincian timbangan
                    </h2>
                    <p className="text-[10px] text-muted">
                      Berat final dan harga yang dibayarkan BSU ke warga.
                    </p>
                  </div>
                </div>
                <ItemsTable items={itemsQuery.data ?? []} />
              </Card>

              <Card className="p-4 md:p-5">
                <div className="mb-3 flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                    <CalendarClock className="h-[18px] w-[18px]" />
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-ink">
                      Perjalanan setoran
                    </h2>
                    <p className="text-[10px] text-muted">
                      Status stok dan pengambilan setelah publikasi.
                    </p>
                  </div>
                </div>
                <div>
                  {timelineFor(deposit).map((step, index, all) => (
                    <TimelineStep
                      key={step.key}
                      title={step.title}
                      description={step.description}
                      at={step.at}
                      done={step.done}
                      last={index === all.length - 1}
                    />
                  ))}
                </div>
              </Card>
            </div>

            <div className="space-y-4">
              <Card className="p-4 md:p-5">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                    <Building2 className="h-[18px] w-[18px]" />
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-ink">BSU asal</h2>
                    <p className="text-[10px] text-muted">
                      Mitra pengirim data setoran.
                    </p>
                  </div>
                </div>
                <div className="mt-3 rounded-2xl bg-[#f8faf7] px-4 py-3.5">
                  <p className="text-sm font-bold text-ink">
                    {deposit.bsu_nama}
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted">
                    Dikirim{' '}
                    {deposit.dikirim_ke_bsi_at
                      ? formatDateTime(deposit.dikirim_ke_bsi_at)
                      : 'belum dikirim'}
                  </p>
                </div>
                <p className="mt-3 flex items-start gap-2 rounded-2xl bg-brand-50 px-4 py-3 text-[10px] leading-5 text-brand-900">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Nomor WhatsApp, alamat, koordinat, dan foto warga tidak
                  diteruskan ke BSI.
                </p>
              </Card>

              <Card className="p-4 md:p-5">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                    <Warehouse className="h-[18px] w-[18px]" />
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-ink">
                      Publikasi stok
                    </h2>
                    <p className="text-[10px] text-muted">
                      Ubah setoran menjadi lot stok BSI.
                    </p>
                  </div>
                </div>

                {deposit.status === 'dikirim_ke_bsi' ? (
                  <>
                    <p className="mt-3 flex items-start gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-[10px] leading-5 text-amber-800">
                      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      Pastikan harga jual BSI sudah diatur untuk setiap jenis
                      sampah pada setoran ini. Publikasi akan gagal jika ada
                      harga jual yang belum aktif.
                    </p>
                    <div className="mt-3 flex flex-col gap-2">
                      <Button
                        loading={publishMutation.isPending}
                        onClick={() => void handlePublish()}
                      >
                        <Warehouse className="h-3.5 w-3.5" />
                        Publikasikan jadi stok
                      </Button>
                      <Link
                        to="/bsi/stok"
                        className={buttonStyles({
                          variant: 'secondary',
                          size: 'sm',
                        })}
                      >
                        Atur harga jual
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </>
                ) : deposit.status === 'dipublikasikan' ? (
                  <>
                    <p className="mt-3 flex items-start gap-2 rounded-2xl bg-brand-50 px-4 py-3 text-[10px] leading-5 text-brand-900">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      Setoran ini sudah menjadi stok dan menunggu pembelian
                      industri.
                    </p>
                    <div className="mt-3 flex flex-col gap-2">
                      <Link
                        to="/bsi/stok"
                        className={buttonStyles({ size: 'sm' })}
                      >
                        Lihat stok
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                      <Link
                        to="/bsi/pesanan"
                        className={buttonStyles({
                          variant: 'secondary',
                          size: 'sm',
                        })}
                      >
                        Lihat pesanan
                      </Link>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="mt-3 flex items-start gap-2 rounded-2xl bg-[#f8faf7] px-4 py-3 text-[10px] leading-5 text-muted">
                      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      Setoran ini sudah diproses lebih lanjut. Pantau status
                      pengambilan pada bagian perjalanan setoran.
                    </p>
                    <Link
                      to="/bsi/pesanan"
                      className={`${buttonStyles({ variant: 'secondary', size: 'sm' })} mt-3 w-full`}
                    >
                      Buka pesanan
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </>
                )}
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarClock,
  Check,
  Circle,
  Clock3,
  ImageIcon,
  MapPin,
  MessageCircle,
  Phone,
  RefreshCw,
  Scale,
  SearchX,
  Send,
  ShieldCheck,
  Store,
  StickyNote,
  Truck,
  UserRound,
  Wallet,
  X,
} from 'lucide-react';
import { useAuth } from '@/auth/AuthProvider';
import { usePageTitle } from '@/hooks/usePageTitle';
import {
  useConfirmDeposit,
  useDepositDetail,
  useDepositPhoto,
  useSendDepositToBsi,
} from '@/hooks/useDeposits';
import { useOrganizationById } from '@/hooks/useOrganizations';
import {
  bsuDepositAction,
  depositTimeline,
  depositWeight,
  paymentMethodLabel,
} from '@/lib/deposits';
import {
  formatCurrency,
  formatDateShort,
  formatDateTime,
  formatWeight,
  mapsUrl,
  toNumber,
  whatsappUrl,
} from '@/lib/utils';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button, buttonStyles } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { DepositStatusBadge } from '@/components/deposits/DepositStatusBadge';
import { DepositItemsTable } from '@/components/deposits/DepositItemsTable';
import { SchedulePickupDialog } from '@/components/deposits/SchedulePickupDialog';
import { WeighingDialog } from '@/components/deposits/WeighingDialog';
import type { DepositRecord } from '@/types/database';

function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-4 lg:grid-cols-[1.5fr_0.8fr]">
        <div className="space-y-4">
          <Skeleton className="h-56 rounded-[24px]" />
          <Skeleton className="h-48 rounded-[24px]" />
          <Skeleton className="h-64 rounded-[24px]" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-44 rounded-[24px]" />
          <Skeleton className="h-52 rounded-[24px]" />
        </div>
      </div>
    </div>
  );
}

function InfoLine({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-2xl bg-[#f8faf7] px-3.5 py-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-brand-700 shadow-sm">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0">
        <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted">
          {label}
        </p>
        <p className="mt-0.5 break-words text-[11px] font-semibold leading-4 text-ink">
          {value}
        </p>
      </div>
    </div>
  );
}

function CounterpartCard({
  viewer,
  deposit,
  bsuOrg,
}: {
  viewer: 'warga' | 'bsu';
  deposit: DepositRecord;
  bsuOrg: {
    nama: string;
    alamat: string | null;
    kota: string | null;
    telepon: string | null;
    lat: number | null;
    lng: number | null;
  } | null;
}) {
  if (viewer === 'bsu') {
    const wa = whatsappUrl(
      deposit.nomor_wa,
      `Halo ${deposit.profiles?.nama ?? 'warga'}, saya petugas BSU terkait setoran ${deposit.estimasi_jenis}.`,
    );
    // Satu tautan lokasi saja: pakai tautan yang dibagikan warga bila ada,
    // lalu jatuh ke koordinat/alamat.
    const map =
      deposit.lokasi_url ?? mapsUrl(deposit.lat, deposit.lng, deposit.alamat);

    return (
      <Card className="p-4 md:p-5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <UserRound className="h-[18px] w-[18px]" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-ink">Informasi warga</h2>
            <p className="text-[10px] text-muted">
              Kontak untuk koordinasi setoran
            </p>
          </div>
        </div>

        <div className="mt-3 space-y-2">
          <div className="rounded-2xl bg-[#f8faf7] px-4 py-3.5">
            <p className="text-[13px] font-bold text-ink">
              {deposit.profiles?.nama ?? 'Warga UPCYCLE'}
            </p>
            <p className="mt-0.5 text-[10px] text-muted">
              ID setoran {deposit.id.slice(0, 8)}
            </p>
          </div>

          <InfoLine
            icon={Phone}
            label="Nomor WhatsApp"
            value={deposit.nomor_wa}
          />
          <InfoLine
            icon={MapPin}
            label="Alamat / lokasi"
            value={
              deposit.alamat ??
              (deposit.metode === 'antar'
                ? 'Antar langsung ke BSU'
                : 'Tidak dicantumkan')
            }
          />

          <div className="flex flex-wrap gap-2 pt-1">
            {wa && (
              <a
                href={wa}
                target="_blank"
                rel="noreferrer"
                className={buttonStyles({ variant: 'primary', size: 'sm' })}
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Chat WhatsApp
              </a>
            )}
            {map && (
              <a
                href={map}
                target="_blank"
                rel="noreferrer"
                className={buttonStyles({ variant: 'secondary', size: 'sm' })}
              >
                <MapPin className="h-3.5 w-3.5" />
                Buka lokasi
              </a>
            )}
          </div>
        </div>

        <p className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-[9px] leading-4 text-amber-800">
          <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0" />
          Nomor WA dan lokasi hanya terlihat oleh BSU tujuan, tidak diteruskan
          ke BSI.
        </p>
      </Card>
    );
  }

  const map = bsuOrg
    ? mapsUrl(bsuOrg.lat, bsuOrg.lng, bsuOrg.alamat)
    : null;

  return (
    <Card className="p-4 md:p-5">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
          <Building2 className="h-[18px] w-[18px]" />
        </span>
        <div>
          <h2 className="text-sm font-bold text-ink">BSU tujuan</h2>
          <p className="text-[10px] text-muted">Mitra pengelola setoranmu</p>
        </div>
      </div>

      <div className="mt-3 rounded-2xl bg-[#f8faf7] px-4 py-3.5">
        <p className="text-[13px] font-bold text-ink">
          {bsuOrg?.nama ?? 'BSU UPCYCLE'}
        </p>
        <p className="mt-0.5 text-[10px] leading-4 text-muted">
          {[bsuOrg?.alamat, bsuOrg?.kota].filter(Boolean).join(', ') ||
            'Alamat BSU belum tersedia'}
        </p>
      </div>

      <div className="mt-2 space-y-2">
        {bsuOrg?.telepon && (
          <InfoLine icon={Phone} label="Telepon BSU" value={bsuOrg.telepon} />
        )}
        <InfoLine
          icon={UserRound}
          label="Jenis layanan"
          value="Setoran sampah rumah tangga"
        />
      </div>

      {map && (
        <a
          href={map}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-semibold text-brand-700 transition-colors hover:text-brand-800"
        >
          <MapPin className="h-3 w-3" />
          Lihat lokasi BSU
        </a>
      )}
    </Card>
  );
}

export function DepositDetailPage({ viewer }: { viewer: 'warga' | 'bsu' }) {
  const { depositId } = useParams<{ depositId: string }>();
  const { profile } = useAuth();
  const location = useLocation();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [weighOpen, setWeighOpen] = useState(false);
  const [createdNotice, setCreatedNotice] = useState(
    Boolean((location.state as { created?: boolean } | null)?.created),
  );
  const [actionMessage, setActionMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const depositQuery = useDepositDetail(depositId);
  const deposit = depositQuery.data ?? null;
  const bsuOrgQuery = useOrganizationById(
    viewer === 'warga' ? (deposit?.bsu_id ?? null) : null,
  );
  const photoQuery = useDepositPhoto(deposit?.foto_url);
  const confirmMutation = useConfirmDeposit();
  const sendMutation = useSendDepositToBsi();

  usePageTitle(
    deposit ? `Setoran ${deposit.estimasi_jenis}` : 'Detail setoran',
  );

  if (!profile) return null;

  const backTo = viewer === 'warga' ? '/warga/riwayat' : '/bsu/setoran';
  const backLabel =
    viewer === 'warga' ? 'Kembali ke riwayat' : 'Kembali ke antrean';

  if (depositQuery.isLoading) {
    return (
      <div className="mx-auto max-w-6xl pt-2">
        <DetailSkeleton />
      </div>
    );
  }

  if (depositQuery.isError) {
    return (
      <div className="mx-auto max-w-4xl pt-2">
        <PageHeader
          eyebrow="Setoran"
          title="Detail setoran"
          description="Terjadi masalah saat memuat data setoran."
          backTo={backTo}
          backLabel={backLabel}
        />
        <Card className="p-5">
          <EmptyState
            icon={AlertTriangle}
            title="Setoran belum bisa dimuat"
            description="Periksa koneksi Supabase lalu coba lagi."
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void depositQuery.refetch()}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Coba lagi
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  if (!deposit) {
    return (
      <div className="mx-auto max-w-4xl pt-2">
        <PageHeader
          eyebrow="Setoran"
          title="Setoran tidak ditemukan"
          description="Data setoran tidak tersedia atau bukan milik akunmu."
          backTo={backTo}
          backLabel={backLabel}
        />
        <Card className="p-5">
          <EmptyState
            icon={SearchX}
            title="Setoran tidak ditemukan"
            description="Pastikan tautan benar dan kamu memiliki akses ke setoran ini."
            action={
              <Link
                to={backTo}
                className={buttonStyles({ variant: 'soft', size: 'sm' })}
              >
                Kembali
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
        </Card>
      </div>
    );
  }

  const action = viewer === 'bsu' ? bsuDepositAction(deposit) : null;
  const bsuOrg = bsuOrgQuery.data ?? null;
  const items = deposit.deposit_items ?? [];
  const hasFinalWeight = items.length > 0;
  const timeline = depositTimeline(deposit);
  const MethodIcon = deposit.metode === 'jemput' ? Truck : Store;

  const handleConfirm = async () => {
    setActionMessage(null);
    try {
      await confirmMutation.mutateAsync(deposit.id);
      setActionMessage({
        type: 'success',
        text: 'Setoran berhasil dikonfirmasi. BSU akan meneruskan data ke BSI.',
      });
    } catch (failure) {
      setActionMessage({
        type: 'error',
        text:
          failure instanceof Error
            ? failure.message
            : 'Konfirmasi setoran gagal.',
      });
    }
  };

  const handleSendToBsi = async () => {
    setActionMessage(null);
    try {
      await sendMutation.mutateAsync(deposit.id);
      setActionMessage({
        type: 'success',
        text: 'Data setoran berhasil dikirim ke BSI.',
      });
    } catch (failure) {
      setActionMessage({
        type: 'error',
        text:
          failure instanceof Error
            ? failure.message
            : 'Data setoran gagal dikirim ke BSI.',
      });
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4 pb-4">
      <PageHeader
        eyebrow={viewer === 'warga' ? 'Riwayat setoran' : 'Antrean BSU'}
        title={`Setoran ${deposit.estimasi_jenis}`}
        description={`Dibuat ${formatDateTime(deposit.created_at)} · ID ${deposit.id.slice(0, 8)}`}
        backTo={backTo}
        backLabel={backLabel}
        actions={
          <>
            <DepositStatusBadge status={deposit.status} />
            <Badge tone="neutral" className="px-2.5 py-1">
              {deposit.metode === 'jemput' ? 'Dijemput BSU' : 'Antar sendiri'}
            </Badge>
          </>
        }
      />

      {createdNotice && (
        <div className="flex items-start justify-between gap-3 rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3 text-[11px] leading-5 text-brand-900">
          <p className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0" />
            Setoran berhasil dikirim. Pantau status dan notifikasi dari halaman
            ini.
          </p>
          <button
            type="button"
            onClick={() => setCreatedNotice(false)}
            aria-label="Tutup pemberitahuan"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-brand-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {actionMessage && (
        <div
          className={`flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-[11px] leading-5 ${
            actionMessage.type === 'success'
              ? 'border-brand-100 bg-brand-50 text-brand-900'
              : 'border-red-100 bg-red-50 text-red-700'
          }`}
        >
          <p className="flex items-start gap-2">
            {actionMessage.type === 'success' ? (
              <Check className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            {actionMessage.text}
          </p>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            aria-label="Tutup pemberitahuan"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-black/[0.05]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.5fr_0.8fr]">
        <div className="min-w-0 space-y-4">
          <Card className="overflow-hidden">
            <div className="relative overflow-hidden bg-[#101a12] px-5 py-5">
              <div className="auth-grid absolute inset-0 opacity-60" />
              <div className="auth-orb absolute -right-24 -top-32 h-64 w-64 rounded-full opacity-40" />
              <div className="relative">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/40">
                      Ringkasan setoran
                    </p>
                    <h2 className="mt-1 text-xl font-extrabold tracking-tight text-white sm:text-2xl">
                      {deposit.estimasi_jenis}
                    </h2>
                    <p className="mt-1 flex items-center gap-1.5 text-[10px] text-white/45">
                      <Clock3 className="h-3 w-3" />
                      {formatDateTime(deposit.created_at)}
                    </p>
                  </div>
                  <DepositStatusBadge status={deposit.status} />
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  {[
                    {
                      label: hasFinalWeight ? 'Berat final' : 'Estimasi berat',
                      value: formatWeight(depositWeight(deposit)),
                    },
                    {
                      label: 'Metode',
                      value:
                        deposit.metode === 'jemput'
                          ? 'Dijemput BSU'
                          : 'Antar sendiri',
                    },
                    {
                      label: 'Jadwal',
                      value: deposit.jadwal
                        ? formatDateTime(deposit.jadwal)
                        : 'Menunggu',
                    },
                    {
                      label: 'Total',
                      value:
                        toNumber(deposit.total) > 0
                          ? formatCurrency(toNumber(deposit.total))
                          : 'Belum dibayar',
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-2xl border border-white/[0.08] bg-white/[0.05] px-3 py-2.5"
                    >
                      <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-white/35">
                        {item.label}
                      </p>
                      <p className="mt-1 line-clamp-2 text-[11px] font-bold leading-4 text-white">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-2 p-4 sm:grid-cols-2">
              <InfoLine
                icon={MethodIcon}
                label="Metode setor"
                value={
                  deposit.metode === 'jemput'
                    ? 'Dijemput oleh BSU'
                    : 'Antar langsung ke BSU'
                }
              />
              <InfoLine
                icon={Scale}
                label="Berat"
                value={`${formatWeight(depositWeight(deposit))}${
                  hasFinalWeight ? ' (final)' : ' (estimasi)'
                }`}
              />
              <InfoLine
                icon={CalendarClock}
                label="Jadwal penjemputan"
                value={
                  deposit.jadwal
                    ? formatDateTime(deposit.jadwal)
                    : deposit.metode === 'antar'
                      ? 'Tidak perlu jadwal jemput'
                      : 'Belum dijadwalkan'
                }
              />
              <InfoLine
                icon={Wallet}
                label="Pembayaran"
                value={
                  toNumber(deposit.total) > 0
                    ? `${formatCurrency(toNumber(deposit.total))} · ${paymentMethodLabel(
                        deposit.metode_bayar,
                      )}`
                    : 'Menunggu penimbangan'
                }
              />
            </div>
          </Card>

          {viewer === 'bsu' && (
            <Card className="border-brand-100 bg-brand-50/40 p-4 md:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-brand-700 shadow-sm">
                    <Scale className="h-[18px] w-[18px]" />
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-ink">
                      {action === 'schedule'
                        ? 'Setoran menunggu jadwal jemput'
                        : action === 'weigh'
                          ? 'Setoran siap ditimbang'
                          : action === 'send'
                            ? 'Siap dikirim ke BSI'
                            : 'Tidak ada aksi yang diperlukan'}
                    </h2>
                    <p className="mt-1 max-w-xl text-[11px] leading-5 text-muted">
                      {action === 'schedule'
                        ? 'Tentukan waktu penjemputan agar warga mendapat notifikasi otomatis.'
                        : action === 'weigh'
                          ? 'Masukkan hasil timbang per jenis sampah, potongan bila ada, lalu pilih metode pembayaran.'
                          : action === 'send'
                            ? 'Warga sudah mengonfirmasi hasil timbang. Kirim data ke BSI untuk dipublikasikan menjadi stok.'
                            : deposit.status === 'dicek_dibayar'
                              ? 'Menunggu warga memeriksa dan mengonfirmasi hasil timbang.'
                              : deposit.status === 'dikirim_ke_bsi'
                                ? 'Data sudah diterima BSI. Publikasi stok diproses pada Tahap 4.'
                                : 'Setoran sudah selesai diproses pada tahap ini.'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {action === 'schedule' && (
                    <Button
                      size="sm"
                      onClick={() => setScheduleOpen(true)}
                    >
                      <CalendarClock className="h-3.5 w-3.5" />
                      Jadwalkan jemput
                    </Button>
                  )}
                  {action === 'weigh' && (
                    <Button size="sm" onClick={() => setWeighOpen(true)}>
                      <Scale className="h-3.5 w-3.5" />
                      Timbang & bayar
                    </Button>
                  )}
                  {action === 'send' && (
                    <Button
                      size="sm"
                      onClick={() => void handleSendToBsi()}
                      loading={sendMutation.isPending}
                    >
                      <Send className="h-3.5 w-3.5" />
                      Kirim ke BSI
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          )}

          {viewer === 'warga' && deposit.status === 'dicek_dibayar' && (
            <Card className="border-brand-100 bg-brand-50/50 p-4 md:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-brand-700 shadow-sm">
                    <Wallet className="h-[18px] w-[18px]" />
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-ink">
                      Konfirmasi hasil timbang
                    </h2>
                    <p className="mt-1 max-w-xl text-[11px] leading-5 text-muted">
                      BSU mencatat total pembayaran{' '}
                      <strong className="text-ink">
                        {formatCurrency(toNumber(deposit.total))}
                      </strong>{' '}
                      dengan metode {paymentMethodLabel(deposit.metode_bayar)}.
                      Periksa rincian item sebelum mengonfirmasi.
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => void handleConfirm()}
                  loading={confirmMutation.isPending}
                >
                  <Check className="h-3.5 w-3.5" />
                  Konfirmasi hasil
                </Button>
              </div>
              <p className="mt-3 rounded-xl bg-white/80 px-3 py-2.5 text-[9px] leading-4 text-muted">
                Setelah dikonfirmasi, data akan diteruskan BSU ke BSI. Jika ada
                ketidaksesuaian, hubungi BSU sebelum menekan tombol konfirmasi.
              </p>
            </Card>
          )}

          {viewer === 'warga' &&
            deposit.status !== 'dicek_dibayar' &&
            deposit.status !== 'dipublikasikan' &&
            deposit.status !== 'dibeli_pengepul' &&
            deposit.status !== 'diambil_bsi' &&
            deposit.status !== 'diambil_pengepul' && (
              <Card className="p-4 md:p-5">
                <div className="flex items-start gap-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f2f5f1] text-ink">
                    <Clock3 className="h-[18px] w-[18px]" />
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-ink">
                      {deposit.status === 'dikonfirmasi' ||
                      deposit.status === 'dikirim_ke_bsi'
                        ? 'Data sudah dikonfirmasi'
                        : 'Menunggu proses BSU'}
                    </h2>
                    <p className="mt-1 text-[11px] leading-5 text-muted">
                      {deposit.status === 'dikonfirmasi' ||
                      deposit.status === 'dikirim_ke_bsi'
                        ? 'Terima kasih. BSU akan atau sudah meneruskan data setoran ini ke BSI.'
                        : deposit.status === 'dijadwalkan'
                          ? 'BSU sudah menjadwalkan penjemputan. Siapkan sampah sesuai jadwal.'
                          : 'BSU akan memeriksa setoran dan menghubungi nomor WhatsApp-mu bila diperlukan.'}
                    </p>
                  </div>
                </div>
              </Card>
            )}

          <Card className="p-4 md:p-5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f2f5f1] text-ink">
                <Scale className="h-[18px] w-[18px]" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-ink">
                  Rincian hasil timbang
                </h2>
                <p className="text-[10px] text-muted">
                  Berat final, harga, dan subtotal per jenis sampah
                </p>
              </div>
            </div>
            <div className="mt-3">
              <DepositItemsTable deposit={deposit} />
            </div>
          </Card>

          {deposit.foto_url && (
            <Card className="p-4 md:p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f2f5f1] text-ink">
                    <ImageIcon className="h-[18px] w-[18px]" />
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-ink">
                      Foto setoran
                    </h2>
                    <p className="text-[10px] text-muted">
                      Hanya terlihat oleh warga dan BSU tujuan
                    </p>
                  </div>
                </div>
                <Badge tone="neutral" className="px-2 py-0.5 text-[9px]">
                  Privat
                </Badge>
              </div>
              <div className="mt-3 overflow-hidden rounded-2xl border border-black/[0.05] bg-[#f8faf7]">
                {photoQuery.isLoading && (
                  <Skeleton className="h-56 w-full rounded-none" />
                )}
                {photoQuery.isError && (
                  <p className="px-4 py-8 text-center text-[11px] leading-5 text-muted">
                    Foto tidak bisa dibuka. Pastikan bucket dan policy storage
                    sudah diterapkan.
                  </p>
                )}
                {photoQuery.data && (
                  <a
                    href={photoQuery.data}
                    target="_blank"
                    rel="noreferrer"
                    className="block"
                  >
                    <img
                      src={photoQuery.data}
                      alt={`Foto setoran ${deposit.estimasi_jenis}`}
                      className="max-h-[420px] w-full object-cover transition-transform hover:scale-[1.01]"
                    />
                  </a>
                )}
              </div>
            </Card>
          )}

          <Card className="p-4 md:p-5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f2f5f1] text-ink">
                <Clock3 className="h-[18px] w-[18px]" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-ink">
                  Perjalanan setoran
                </h2>
                <p className="text-[10px] text-muted">
                  Jejak status dari pengajuan hingga publikasi stok
                </p>
              </div>
            </div>

            <ol className="mt-4 space-y-0">
              {timeline.map((step, index) => (
                <li key={step.key} className="relative flex gap-3 pb-4 last:pb-0">
                  {index < timeline.length - 1 && (
                    <span
                      aria-hidden="true"
                      className={`absolute left-[11px] top-6 h-[calc(100%-12px)] w-px ${
                        step.done ? 'bg-brand-200' : 'bg-black/[0.07]'
                      }`}
                    />
                  )}
                  <span
                    className={`relative z-10 mt-0.5 flex h-[23px] w-[23px] shrink-0 items-center justify-center rounded-full ${
                      step.done
                        ? 'bg-brand-600 text-white'
                        : 'bg-[#f2f5f1] text-muted'
                    }`}
                  >
                    {step.done ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Circle className="h-2.5 w-2.5" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p
                        className={`text-[11px] font-bold ${
                          step.done ? 'text-ink' : 'text-muted'
                        }`}
                      >
                        {step.title}
                      </p>
                      <p className="text-[9px] text-muted">
                        {step.at
                          ? formatDateShort(step.at)
                          : step.done
                            ? 'Selesai'
                            : 'Menunggu'}
                      </p>
                    </div>
                    <p className="mt-0.5 text-[10px] leading-4 text-muted">
                      {step.description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <aside className="min-w-0 space-y-4">
          <CounterpartCard
            viewer={viewer}
            deposit={deposit}
            bsuOrg={bsuOrg}
          />

          <Card className="p-4 md:p-5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <Wallet className="h-[18px] w-[18px]" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-ink">
                  Ringkasan pembayaran
                </h2>
                <p className="text-[10px] text-muted">
                  Nominal dan status pembayaran
                </p>
              </div>
            </div>

            <dl className="mt-3 divide-y divide-black/[0.05]">
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-[11px] text-muted">Metode bayar</dt>
                <dd className="text-[11px] font-semibold text-ink">
                  {paymentMethodLabel(deposit.metode_bayar)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-[11px] text-muted">Potongan</dt>
                <dd className="text-[11px] font-semibold text-ink">
                  {toNumber(deposit.potongan) > 0
                    ? formatCurrency(toNumber(deposit.potongan))
                    : '—'}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-[11px] text-muted">Dibayar pada</dt>
                <dd className="text-[11px] font-semibold text-ink">
                  {deposit.dibayar_at
                    ? formatDateTime(deposit.dibayar_at)
                    : 'Belum dibayar'}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-3">
                <dt className="text-[12px] font-bold text-ink">Total</dt>
                <dd className="text-lg font-extrabold tracking-tight text-brand-800">
                  {formatCurrency(toNumber(deposit.total))}
                </dd>
              </div>
            </dl>

            {deposit.alasan_potongan && (
              <p className="mt-1 rounded-xl bg-amber-50 px-3 py-2.5 text-[9px] leading-4 text-amber-800">
                Alasan potongan: {deposit.alasan_potongan}
              </p>
            )}
          </Card>

          {deposit.catatan && (
            <Card className="p-4 md:p-5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f2f5f1] text-ink">
                  <StickyNote className="h-[18px] w-[18px]" />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-ink">Catatan</h2>
                  <p className="text-[10px] text-muted">Dari pengirim setoran</p>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-line rounded-2xl bg-[#f8faf7] px-4 py-3 text-[11px] leading-5 text-muted">
                {deposit.catatan}
              </p>
            </Card>
          )}
        </aside>
      </div>

      {viewer === 'bsu' && (
        <>
          <SchedulePickupDialog
            open={scheduleOpen}
            onClose={() => setScheduleOpen(false)}
            deposit={deposit}
          />
          <WeighingDialog
            open={weighOpen}
            onClose={() => setWeighOpen(false)}
            deposit={deposit}
            orgId={profile.org_id}
          />
        </>
      )}
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BadgeCheck,
  Building2,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  ShieldX,
} from 'lucide-react';
import { useAuth } from '@/auth/AuthProvider';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useAdminOrganizations } from '@/hooks/useAdmin';
import {
  VERIFICATION_LABELS,
  VERIFICATION_TONES,
  statusLabel,
  statusTone,
} from '@/lib/status';
import {
  ORG_TYPE_LABELS,
  ORG_TYPE_SHORT_LABELS,
} from '@/lib/roles';
import {
  formatDateShort,
  formatDateTime,
  mapsUrl,
  whatsappUrl,
} from '@/lib/utils';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatCard, StatCardSkeleton } from '@/components/dashboard/StatCard';
import {
  OrganizationDecisionDialog,
  type OrganizationDecision,
} from '@/components/admin/OrganizationDecisionDialog';
import type {
  DashboardStat,
  OrganizationAdminRecord,
  OrganizationType,
  VerificationStatus,
} from '@/types/database';

type StatusFilter = VerificationStatus | 'semua';
type TypeFilter = OrganizationType | 'semua';

const STATUS_FILTERS: Array<{ key: StatusFilter; label: string }> = [
  { key: 'pending', label: 'Menunggu' },
  { key: 'verified', label: 'Terverifikasi' },
  { key: 'rejected', label: 'Ditolak' },
  { key: 'semua', label: 'Semua' },
];

const TYPE_FILTERS: Array<{ key: TypeFilter; label: string }> = [
  { key: 'semua', label: 'Semua tipe' },
  { key: 'bsu', label: 'BSU' },
  { key: 'bsi', label: 'BSI' },
  { key: 'industri', label: 'Industri' },
];

export function OrganizationVerificationPage() {
  const { profile } = useAuth();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('semua');
  const [search, setSearch] = useState('');
  const [decision, setDecision] = useState<{
    organization: OrganizationAdminRecord;
    action: OrganizationDecision;
  } | null>(null);

  usePageTitle('Verifikasi organisasi');

  const organizationsQuery = useAdminOrganizations();
  const organizations = organizationsQuery.data ?? [];

  const pendingCount = organizations.filter(
    (org) => org.status === 'pending',
  ).length;
  const verifiedCount = organizations.filter(
    (org) => org.status === 'verified',
  ).length;
  const rejectedCount = organizations.filter(
    (org) => org.status === 'rejected',
  ).length;

  const stats: DashboardStat[] = [
    {
      key: 'pending',
      label: 'Menunggu verifikasi',
      value: pendingCount,
      format: 'number',
      hint: 'Perlu ditinjau admin',
      badge: pendingCount > 0 ? 'Perlu aksi' : undefined,
    },
    {
      key: 'verified',
      label: 'Terverifikasi',
      value: verifiedCount,
      format: 'number',
      hint: 'Dapat bertransaksi',
    },
    {
      key: 'rejected',
      label: 'Ditolak',
      value: rejectedCount,
      format: 'number',
      hint: 'Belum disetujui',
    },
    {
      key: 'total',
      label: 'Total organisasi',
      value: organizations.length,
      format: 'number',
      hint: 'BSU, BSI, industri',
    },
  ];

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return organizations.filter((org) => {
      if (statusFilter !== 'semua' && org.status !== statusFilter) return false;
      if (typeFilter !== 'semua' && org.tipe !== typeFilter) return false;
      if (!keyword) return true;
      return `${org.nama} ${org.kota ?? ''} ${org.provinsi ?? ''} ${
        org.alamat ?? ''
      } ${org.email ?? ''} ${org.telepon ?? ''}`
        .toLowerCase()
        .includes(keyword);
    });
  }, [organizations, search, statusFilter, typeFilter]);

  const [notice, setNotice] = useState<{
    tone: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 6000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  return (
    <div className="mx-auto max-w-5xl space-y-4 pb-4">
      <PageHeader
        eyebrow="Admin & verifikasi"
        title="Verifikasi organisasi"
        description="Tinjau akun BSU, BSI, dan industri yang mendaftar. Organisasi terverifikasi dapat dipakai pada alur setoran, stok, dan marketplace."
        backTo="/dashboard"
        backLabel="Kembali ke dashboard"
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
        {organizationsQuery.isLoading
          ? [0, 1, 2, 3].map((item) => <StatCardSkeleton key={item} />)
          : stats.map((stat) => <StatCard key={stat.key} stat={stat} />)}
      </div>

      <Card className="p-4 md:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="w-full max-w-sm">
            <Input
              label="Cari organisasi"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nama, kota, alamat, atau kontak"
              icon={Search}
            />
          </div>
          <div className="space-y-2">
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
            <div className="flex flex-wrap gap-1.5 md:justify-end">
              {TYPE_FILTERS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setTypeFilter(item.key)}
                  className={`rounded-full border px-3 py-1.5 text-[10px] font-semibold transition-colors ${
                    typeFilter === item.key
                      ? 'border-brand-200 bg-brand-50 text-brand-800'
                      : 'border-black/[0.06] bg-white text-muted hover:border-black/15 hover:text-ink'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4">
          {organizationsQuery.isLoading && (
            <div className="space-y-2.5">
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className="rounded-[22px] border border-black/[0.04] p-4"
                >
                  <div className="flex items-start gap-3">
                    <Skeleton className="h-11 w-11 rounded-2xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3.5 w-52" />
                      <Skeleton className="h-2.5 w-72" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {organizationsQuery.isError && (
            <EmptyState
              icon={Building2}
              title="Organisasi belum bisa dimuat"
              description="Periksa koneksi Supabase lalu coba lagi."
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void organizationsQuery.refetch()}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Coba lagi
                </Button>
              }
            />
          )}

          {!organizationsQuery.isLoading &&
            !organizationsQuery.isError &&
            organizations.length === 0 && (
              <EmptyState
                icon={Building2}
                title="Belum ada organisasi"
                description="Akun BSU, BSI, dan industri yang mendaftar akan muncul di sini."
              />
            )}

          {!organizationsQuery.isLoading &&
            !organizationsQuery.isError &&
            organizations.length > 0 &&
            filtered.length === 0 && (
              <EmptyState
                icon={ShieldCheck}
                title="Tidak ada organisasi pada filter ini"
                description={
                  statusFilter === 'pending'
                    ? 'Semua organisasi sudah ditinjau. Pilih filter lain untuk melihat riwayat.'
                    : 'Ubah kata kunci, status, atau tipe organisasi.'
                }
              />
            )}

          {!organizationsQuery.isLoading &&
            !organizationsQuery.isError &&
            filtered.length > 0 && (
              <div className="space-y-2.5">
                {filtered.map((org) => {
                  const location = mapsUrl(org.lat, org.lng, org.alamat);
                  const phoneLink = whatsappUrl(
                    org.telepon,
                    `Halo ${org.nama}, kami admin UPCYCLE terkait verifikasi organisasi Anda.`,
                  );

                  return (
                    <article
                      key={org.id}
                      className="rounded-[22px] border border-black/[0.05] bg-white p-3.5 sm:p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                            <Building2 className="h-[18px] w-[18px]" />
                          </span>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p className="truncate text-[13px] font-bold text-ink sm:text-sm">
                                {org.nama}
                              </p>
                              <Badge
                                tone={statusTone(
                                  org.status,
                                  VERIFICATION_TONES,
                                )}
                                className="px-2 py-0.5 text-[9px]"
                              >
                                {statusLabel(org.status, VERIFICATION_LABELS)}
                              </Badge>
                              <Badge
                                tone="neutral"
                                className="px-2 py-0.5 text-[9px]"
                              >
                                {ORG_TYPE_SHORT_LABELS[org.tipe]}
                              </Badge>
                            </div>
                            <p className="mt-0.5 text-[10px] text-muted">
                              {ORG_TYPE_LABELS[org.tipe]} · terdaftar{' '}
                              {formatDateShort(org.created_at)}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {org.status !== 'verified' && (
                            <Button
                              size="sm"
                              onClick={() =>
                                setDecision({
                                  organization: org,
                                  action: 'verify',
                                })
                              }
                            >
                              <BadgeCheck className="h-3.5 w-3.5" />
                              Verifikasi
                            </Button>
                          )}
                          {org.status !== 'rejected' && (
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() =>
                                setDecision({
                                  organization: org,
                                  action: 'reject',
                                })
                              }
                            >
                              <ShieldX className="h-3.5 w-3.5" />
                              {org.status === 'verified'
                                ? 'Cabut verifikasi'
                                : 'Tolak'}
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 grid gap-2 rounded-2xl border border-black/[0.04] px-3.5 py-3 text-[10px] leading-4 text-muted sm:grid-cols-2">
                        <p className="flex items-start gap-1.5">
                          <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                          <span>
                            <span className="font-semibold text-ink">
                              Lokasi:
                            </span>{' '}
                            {[org.alamat, org.kota, org.provinsi]
                              .filter(Boolean)
                              .join(', ') || 'Belum diisi'}
                          </span>
                        </p>
                        <p className="flex items-start gap-1.5">
                          <Phone className="mt-0.5 h-3 w-3 shrink-0" />
                          <span>
                            <span className="font-semibold text-ink">
                              Telepon:
                            </span>{' '}
                            {org.telepon ?? 'Belum diisi'}
                          </span>
                        </p>
                        <p className="flex items-start gap-1.5">
                          <Mail className="mt-0.5 h-3 w-3 shrink-0" />
                          <span className="truncate">
                            <span className="font-semibold text-ink">
                              Email:
                            </span>{' '}
                            {org.email ?? 'Belum diisi'}
                          </span>
                        </p>
                        <p className="flex items-start gap-1.5">
                          <CalendarDays className="mt-0.5 h-3 w-3 shrink-0" />
                          <span>
                            <span className="font-semibold text-ink">
                              {org.verified_at ? 'Diverifikasi:' : 'Diperbarui:'}
                            </span>{' '}
                            {formatDateTime(
                              org.verified_at ?? org.updated_at,
                            )}
                          </span>
                        </p>

                        <div className="flex flex-wrap gap-3 sm:col-span-2">
                          {location && (
                            <a
                              href={location}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:text-brand-800"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Buka titik lokasi
                            </a>
                          )}
                          {phoneLink && (
                            <a
                              href={phoneLink}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:text-brand-800"
                            >
                              <Phone className="h-3 w-3" />
                              Hubungi via WhatsApp
                            </a>
                          )}
                          {org.email && (
                            <a
                              href={`mailto:${org.email}`}
                              className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:text-brand-800"
                            >
                              <Mail className="h-3 w-3" />
                              Kirim email
                            </a>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
        </div>
      </Card>

      {!organizationsQuery.isLoading && !organizationsQuery.isError && (
        <p className="px-1 text-[10px] text-muted">
          Menampilkan {filtered.length} dari {organizations.length} organisasi.
          {pendingCount > 0 &&
            ` ${pendingCount} organisasi masih menunggu verifikasi.`}
        </p>
      )}

      <OrganizationDecisionDialog
        open={Boolean(decision)}
        onClose={() => setDecision(null)}
        organization={decision?.organization ?? null}
        decision={decision?.action ?? 'verify'}
        adminId={profile?.id ?? null}
        onSuccess={(organization, action) => {
          setNotice({
            tone: 'success',
            text:
              action === 'verify'
                ? `${organization.nama} berhasil diverifikasi.`
                : `${organization.nama} ditolak. Verifikasi sebelumnya, bila ada, telah dicabut.`,
          });
        }}
      />
    </div>
  );
}

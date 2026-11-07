import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ChevronLeft,
  Clock3,
  LayoutDashboard,
  LockKeyhole,
  Settings2,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from 'lucide-react';
import { useAuth } from '@/auth/AuthProvider';
import { usePageTitle } from '@/hooks/usePageTitle';
import {
  NAVIGATION,
  PRIMARY_ACTIONS,
  getAllowedRolesForPath,
  type UpcomingPageMeta,
} from '@/config/navigation';
import { ROLE_LABELS } from '@/lib/roles';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';

const STAGE_LABELS = [
  'Fondasi data',
  'Akun & navigasi',
  'Setoran & BSU',
  'Stok & BSI',
  'Marketplace',
  'Admin & verifikasi',
];

export function UpcomingPage({
  path,
  meta,
}: {
  path: string;
  meta: UpcomingPageMeta;
}) {
  const { profile } = useAuth();
  usePageTitle(meta.title);

  const navItem = Object.values(NAVIGATION)
    .flat()
    .find((item) => item.to === path);
  const Icon = navItem?.icon ?? Sparkles;
  const stageNumber = Number(meta.stage.match(/\d+/)?.[0] ?? 0);
  const allowedRoles = getAllowedRolesForPath(path);
  const primaryAction = profile ? PRIMARY_ACTIONS[profile.role] : null;

  return (
    <div className="mx-auto max-w-4xl pt-2">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-1.5 rounded-full px-2 py-1.5 text-[11px] font-semibold text-muted transition-colors hover:bg-white hover:text-ink"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Kembali ke dashboard
      </Link>

      <Card className="mt-3 overflow-hidden">
        <div className="relative overflow-hidden bg-[#101a12] px-5 py-8 sm:px-8 sm:py-10">
          <div className="auth-grid absolute inset-0 opacity-70" />
          <div className="auth-orb absolute -right-32 -top-40 h-[380px] w-[380px] rounded-full opacity-55" />
          <div className="absolute -bottom-24 -left-16 h-56 w-56 rounded-full border border-white/[0.07]" />

          <div className="relative">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="dark" className="border border-white/10 bg-white/[0.08]">
                {meta.stage}
              </Badge>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[10px] font-semibold text-white/50">
                <Clock3 className="h-3 w-3 text-brand-400" />
                Sedang disiapkan
              </span>
            </div>

            <span className="mt-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.07] text-brand-400">
              <Icon className="h-6 w-6" />
            </span>
            <h1 className="mt-4 max-w-xl text-[26px] font-extrabold leading-tight tracking-tight text-white sm:text-[32px]">
              {meta.title}
            </h1>
            <p className="mt-2 max-w-xl text-xs leading-6 text-white/50 sm:text-sm">
              {meta.description}
            </p>

            <div className="mt-7 max-w-md">
              <div className="flex items-center gap-1.5">
                {STAGE_LABELS.map((stage, index) => (
                  <div key={stage} className="flex-1">
                    <div
                      className={`h-1.5 rounded-full transition-colors ${
                        index + 1 <= stageNumber
                          ? 'bg-brand-500'
                          : 'bg-white/10'
                      }`}
                    />
                    <p
                      className={`mt-1.5 hidden text-[9px] font-medium sm:block ${
                        index + 1 === stageNumber
                          ? 'text-brand-300'
                          : 'text-white/25'
                      }`}
                    >
                      {stage}
                    </p>
                  </div>
                ))}
              </div>
              <p className="mt-2.5 text-[10px] text-white/35">
                Halaman ini dirilis pada {meta.stage}. Tahap 1–3 sudah aktif,
                termasuk setoran warga, penimbangan BSU, harga, dan buku kas.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 p-5 sm:p-8 lg:grid-cols-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                <LockKeyhole className="h-4 w-4" />
              </span>
              <h2 className="text-sm font-bold text-ink">
                Halaman ini belum aktif
              </h2>
            </div>
            <p className="mt-2 text-xs leading-5 text-muted">
              Fitur ini membutuhkan alur data yang akan dibangun pada{' '}
              {meta.stage}. Kami merilis per tahap agar setiap proses setoran,
              stok, dan transaksi dapat diuji dengan aman.
            </p>

            <div className="mt-4 space-y-2">
              {[
                'Terhubung langsung ke database dengan aturan akses per peran',
                'Status dan riwayat transaksi yang dapat dilacak',
                'Aksi sesuai tugas warga, mitra, atau admin',
              ].map((feature) => (
                <div
                  key={feature}
                  className="flex items-start gap-2.5 text-[11px] leading-5 text-muted"
                >
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" />
                  {feature}
                </div>
              ))}
            </div>

            {allowedRoles.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-1.5">
                <UsersRound className="h-3.5 w-3.5 text-muted" />
                <span className="text-[10px] font-medium text-muted">
                  Akses:
                </span>
                {allowedRoles.map((role) => (
                  <Badge key={role} tone="neutral" className="px-2 py-0.5 text-[9px]">
                    {ROLE_LABELS[role]}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-[22px] bg-[#f8faf7] p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
              Sementara itu
            </p>
            <div className="mt-3 space-y-1.5">
              <Link
                to="/dashboard"
                className="group flex items-center gap-3 rounded-xl bg-white px-3 py-2.5 text-[12px] font-semibold text-ink shadow-sm transition-colors hover:bg-brand-50"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                  <LayoutDashboard className="h-3.5 w-3.5" />
                </span>
                Dashboard & peta mitra
                <ArrowRight className="ml-auto h-3.5 w-3.5 text-black/15 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/profile"
                className="group flex items-center gap-3 rounded-xl bg-white px-3 py-2.5 text-[12px] font-semibold text-ink shadow-sm transition-colors hover:bg-brand-50"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                  <Settings2 className="h-3.5 w-3.5" />
                </span>
                Profil & pengaturan
                <ArrowRight className="ml-auto h-3.5 w-3.5 text-black/15 transition-transform group-hover:translate-x-0.5" />
              </Link>
              {primaryAction && primaryAction.to !== path && (
                <Link
                  to={primaryAction.to}
                  className="group flex items-center gap-3 rounded-xl bg-brand-600 px-3 py-2.5 text-[12px] font-semibold text-white transition-colors hover:bg-brand-700"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/15 text-white">
                    <primaryAction.icon className="h-3.5 w-3.5" />
                  </span>
                  {primaryAction.label}
                  <ArrowRight className="ml-auto h-3.5 w-3.5 text-white/60 transition-transform group-hover:translate-x-0.5" />
                </Link>
              )}
            </div>

            <div className="mt-4 flex items-start gap-2 rounded-xl bg-white/70 px-3 py-2.5 text-[10px] leading-4 text-muted">
              <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-brand-600" />
              Ikuti rilis tahap berikutnya agar semua alur bisa dipakai tanpa
              mengulang data.
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

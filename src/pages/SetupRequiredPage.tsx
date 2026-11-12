import { useState } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { withBase } from '@/lib/paths';
import {
  ArrowUpRight,
  Check,
  ClipboardCheck,
  Copy,
  Database,
  KeyRound,
  Link2,
  Play,
  ShieldAlert,
  Terminal,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

const ENV_EXAMPLE = `VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key`;

export function SetupRequiredPage() {
  const [copied, setCopied] = useState(false);
  usePageTitle('Setup Supabase');

  const copyEnv = async () => {
    try {
      await navigator.clipboard.writeText(ENV_EXAMPLE);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="relative min-h-svh overflow-hidden bg-[#0e1710] px-4 py-8 sm:px-6 lg:py-12">
      <div className="auth-grid absolute inset-0 opacity-60" />
      <div className="auth-orb absolute -right-40 -top-52 h-[560px] w-[560px] rounded-full opacity-60" />
      <div
        aria-hidden="true"
        className="absolute -bottom-56 -left-40 h-[520px] w-[520px] rounded-full border border-white/[0.06]"
      />

      <div className="relative mx-auto grid max-w-6xl grid-cols-1 gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div className="min-w-0 lg:sticky lg:top-12">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-2xl bg-white px-4 py-3 shadow-2xl shadow-black/30">
              <img
                src={withBase('upcycle-logo.svg')}
                alt="Upcycle"
                className="h-9 w-auto"
              />
            </div>

            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-300">
              <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
              Konfigurasi diperlukan
            </div>
          </div>

          <h1 className="mt-4 text-[34px] font-extrabold leading-[1.12] tracking-tight text-white sm:text-[40px]">
            Hubungkan Supabase
            <br />
            <span className="text-brand-400">untuk menyalakan UPCYCLE.</span>
          </h1>
          <p className="mt-3 max-w-md text-sm leading-6 text-white/50">
            Frontend sudah siap. Tambahkan dua environment variable berikut,
            jalankan migrasi database, lalu masuk dengan akun demo atau akun
            milikmu.
          </p>

          <div className="mt-6 space-y-2">
            {[
              '.env dengan URL dan anon key Supabase',
              'Seluruh migrasi + seed Tahap 1',
              'Dev server dijalankan ulang',
            ].map((item) => (
              <div
                key={item}
                className="flex items-center gap-2.5 text-[11px] text-white/55"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-brand-400">
                  <Check className="h-3 w-3" />
                </span>
                {item}
              </div>
            ))}
          </div>

          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noreferrer"
            className="mt-8 inline-flex items-center gap-2 text-xs font-semibold text-brand-400 transition-colors hover:text-brand-300"
          >
            Buka Supabase Dashboard
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>

        <div className="min-w-0 rounded-[28px] border border-white/10 bg-white p-5 shadow-float sm:p-7">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
                Langkah setup
              </p>
              <h2 className="mt-1 text-xl font-extrabold tracking-tight text-ink">
                Siapkan koneksi database
              </h2>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
              <Database className="h-5 w-5" />
            </span>
          </div>

          <div className="mt-6 space-y-5">
            <div className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink text-[11px] font-bold text-white">
                1
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-brand-600" />
                  <p className="text-[13px] font-bold text-ink">
                    Buat file <code className="rounded bg-black/[0.05] px-1.5 py-0.5 text-[11px]">.env</code>
                  </p>
                </div>
                <p className="mt-1 text-xs leading-5 text-muted">
                  Salin <code className="text-[11px]">.env.example</code> menjadi{' '}
                  <code className="text-[11px]">.env</code> di folder utama
                  proyek, lalu isi nilainya.
                </p>
                <div className="mt-2.5 overflow-hidden rounded-2xl bg-[#111511]">
                  <div className="flex items-center justify-between border-b border-white/10 px-3.5 py-2">
                    <span className="text-[10px] font-semibold text-white/40">
                      .env
                    </span>
                    <button
                      type="button"
                      onClick={() => void copyEnv()}
                      className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-white/60 transition-colors hover:text-white"
                    >
                      {copied ? (
                        <ClipboardCheck className="h-3 w-3 text-brand-400" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                      {copied ? 'Tersalin' : 'Salin'}
                    </button>
                  </div>
                  <pre className="max-w-full overflow-x-auto px-3.5 py-3 text-[10px] leading-5 text-brand-300">
                    <code>{ENV_EXAMPLE}</code>
                  </pre>
                </div>
                <p className="mt-2 flex items-start gap-1.5 text-[10px] leading-4 text-muted">
                  <Link2 className="mt-0.5 h-3 w-3 shrink-0 text-brand-600" />
                  Ambil dari Project Settings → API. Jangan pernah memakai
                  service role key di frontend.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink text-[11px] font-bold text-white">
                2
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-brand-600" />
                  <p className="text-[13px] font-bold text-ink">
                    Jalankan migrasi database
                  </p>
                </div>
                <p className="mt-1 text-xs leading-5 text-muted">
                  Buka SQL Editor Supabase, lalu jalankan file di{' '}
                  <code className="text-[11px]">supabase/migrations</code> sesuai
                  urutan nama. Setelah itu jalankan{' '}
                  <code className="text-[11px]">supabase/seed.sql</code> untuk
                  data contoh.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink text-[11px] font-bold text-white">
                3
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Play className="h-4 w-4 text-brand-600" />
                  <p className="text-[13px] font-bold text-ink">
                    Jalankan ulang aplikasi
                  </p>
                </div>
                <p className="mt-1 text-xs leading-5 text-muted">
                  Hentikan lalu jalankan kembali{' '}
                  <code className="text-[11px]">npm run dev</code>. Vite membaca
                  environment variable saat proses dimulai.
                </p>
                <div className="mt-2 rounded-xl bg-[#f5f7f3] px-3.5 py-2.5 text-[11px] text-muted">
                  Panduan lengkap tersedia di{' '}
                  <code className="font-semibold text-ink">README.md</code>.
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-black/[0.06] pt-5">
            <div className="flex items-center gap-2 text-[10px] font-medium text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              Menunggu kredensial Supabase
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => window.location.reload()}
            >
              Muat ulang halaman
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

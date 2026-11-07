import { Link } from 'react-router-dom';
import { ArrowLeft, Compass } from 'lucide-react';
import { useAuth } from '@/auth/AuthProvider';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Logo } from '@/components/ui/Logo';

export function NotFoundPage() {
  const { session } = useAuth();
  usePageTitle('Halaman tidak ditemukan');

  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-[#0e1710] px-5 py-10">
      <div className="auth-grid absolute inset-0 opacity-60" />
      <div className="auth-orb absolute -right-40 -top-52 h-[520px] w-[520px] rounded-full opacity-55" />

      <div className="relative w-full max-w-md rounded-[28px] border border-white/10 bg-white p-7 text-center shadow-float sm:p-8">
        <div className="flex justify-center">
          <Logo imageClassName="h-9" />
        </div>
        <span className="mx-auto mt-7 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
          <Compass className="h-7 w-7" />
        </span>
        <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.18em] text-muted">
          Error 404
        </p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink">
          Halaman tidak ditemukan
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Alamat yang kamu buka mungkin sudah berubah atau belum tersedia pada
          tahap ini.
        </p>
        <Link
          to={session ? '/dashboard' : '/masuk'}
          className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-brand-600 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
        >
          <ArrowLeft className="h-4 w-4" />
          {session ? 'Kembali ke dashboard' : 'Ke halaman masuk'}
        </Link>
      </div>
    </div>
  );
}

import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ChevronDown,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { useAuth } from '@/auth/AuthProvider';
import { authErrorMessage } from '@/lib/auth-errors';
import { AuthLayout } from '@/pages/auth/AuthLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const DEMO_ACCOUNTS = [
  { label: 'Warga', email: 'warga1@upcycle.id' },
  { label: 'BSU', email: 'bsu1@upcycle.id' },
  { label: 'BSI', email: 'bsi@upcycle.id' },
  { label: 'Industri', email: 'industri@upcycle.id' },
  { label: 'Admin', email: 'admin@upcycle.id' },
];

const DEMO_PASSWORD = 'Upcycle123!';

// Panel akun demo tampil default (termasuk di build produksi/GitHub Pages).
// Set VITE_SHOW_DEMO_ACCOUNTS=false saat build untuk menyembunyikannya.
const SHOW_DEMO_ACCOUNTS =
  import.meta.env.VITE_SHOW_DEMO_ACCOUNTS !== 'false';

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as { from?: string } | null)?.from;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Isi email dan password terlebih dahulu.');
      return;
    }

    setSubmitting(true);
    const result = await signIn(email, password);

    if (result.error) {
      setSubmitting(false);
      setError(authErrorMessage(result.error));
      return;
    }

    const destination =
      from && from.startsWith('/') && !['/masuk', '/daftar'].includes(from)
        ? from
        : '/dashboard';
    navigate(destination, { replace: true });
  };

  const fillDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);
    setError(null);
  };

  return (
    <AuthLayout
      title="Masuk ke UPCYCLE"
      description="Lanjutkan pengelolaan setoran, stok, dan transaksi daur ulangmu."
      footer={
        <>
          Belum punya akun?{' '}
          <Link
            to="/daftar"
            className="font-bold text-brand-700 transition-colors hover:text-brand-800"
          >
            Daftar gratis
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs leading-5 text-red-700"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="nama@email.com"
          icon={Mail}
          autoComplete="email"
          inputMode="email"
          required
        />

        <Input
          label="Password"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Masukkan password"
          icon={LockKeyhole}
          autoComplete="current-password"
          required
          labelAction={
            <Link
              to="/lupa-password"
              className="text-[11px] font-semibold text-brand-700 transition-colors hover:text-brand-800"
            >
              Lupa password?
            </Link>
          }
          trailing={
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={
                showPassword ? 'Sembunyikan password' : 'Tampilkan password'
              }
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-black/[0.05] hover:text-ink"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          }
        />

        <Button
          type="submit"
          size="lg"
          loading={submitting}
          className="mt-1 w-full"
        >
          Masuk ke dashboard
        </Button>
      </form>

      {SHOW_DEMO_ACCOUNTS && (
        <details className="group mt-5 rounded-2xl border border-dashed border-black/10 bg-[#fafbf8] px-4 py-3">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-[11px] font-semibold text-muted marker:hidden">
            <span className="inline-flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-brand-600" />
              Akun demo untuk pengujian
            </span>
            <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
          </summary>
          <p className="mt-2 text-[10px] leading-4 text-muted">
            Isi otomatis akun seed Supabase. Semua memakai password{' '}
            <code className="rounded bg-black/[0.05] px-1 py-0.5 font-semibold text-ink">
              {DEMO_PASSWORD}
            </code>
            .
          </p>
          <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => fillDemo(account.email)}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-black/[0.06] bg-white px-2 py-2 text-[10px] font-semibold text-ink transition-colors hover:border-brand-200 hover:bg-brand-50"
              >
                <UserRound className="h-3 w-3 text-brand-600" />
                {account.label}
              </button>
            ))}
          </div>
        </details>
      )}
    </AuthLayout>
  );
}

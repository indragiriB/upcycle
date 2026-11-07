import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
} from 'lucide-react';
import { useAuth } from '@/auth/AuthProvider';
import { supabase } from '@/lib/supabase';
import { authErrorMessage } from '@/lib/auth-errors';
import { AuthLayout } from '@/pages/auth/AuthLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PageLoader } from '@/components/ui/PageLoader';

export function ResetPasswordPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  if (loading) {
    return <PageLoader label="Menyiapkan pemulihan akun…" />;
  }

  if (!session) {
    return (
      <AuthLayout
        title="Tautan tidak valid"
        description="Tautan reset password sudah kedaluwarsa atau belum dibuka dengan benar."
        footer={
          <>
            Butuh tautan baru?{' '}
            <Link
              to="/lupa-password"
              className="font-bold text-brand-700 transition-colors hover:text-brand-800"
            >
              Kirim ulang
            </Link>
          </>
        }
      >
        <div className="rounded-[24px] border border-amber-100 bg-amber-50 p-5 text-sm leading-6 text-amber-800">
          Buka tautan terbaru dari email reset password. Jika sudah kedaluwarsa,
          minta tautan baru dari halaman lupa password.
        </div>
      </AuthLayout>
    );
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password minimal 8 karakter.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Konfirmasi password belum sama.');
      return;
    }

    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (updateError) {
      setError(authErrorMessage(updateError.message));
      return;
    }

    setSuccess(true);
  };

  if (success) {
    return (
      <AuthLayout
        title="Password berhasil diubah"
        description="Password baru sudah aktif untuk akunmu."
        footer={
          <>
            Siap melanjutkan?{' '}
            <Link
              to="/dashboard"
              className="font-bold text-brand-700 transition-colors hover:text-brand-800"
            >
              Ke dashboard
            </Link>
          </>
        }
      >
        <div className="rounded-[24px] border border-brand-100 bg-brand-50 p-6 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-brand-700 shadow-sm">
            <CheckCircle2 className="h-7 w-7" />
          </span>
          <h2 className="mt-4 text-lg font-bold text-ink">
            Password tersimpan
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Gunakan password baru saat masuk berikutnya. Sesi ini tetap aktif.
          </p>
          <Button
            type="button"
            onClick={() => navigate('/dashboard', { replace: true })}
            className="mt-5 w-full"
          >
            Lanjut ke dashboard
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Buat password baru"
      description={`Atur password baru untuk ${session.user.email ?? 'akunmu'}.`}
      footer={
        <>
          Tidak ingin mengubah?{' '}
          <Link
            to="/masuk"
            className="font-bold text-brand-700 transition-colors hover:text-brand-800"
          >
            Kembali masuk
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
          label="Password baru"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Minimal 8 karakter"
          icon={LockKeyhole}
          autoComplete="new-password"
          required
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

        <Input
          label="Konfirmasi password baru"
          type={showPassword ? 'text' : 'password'}
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Ulangi password baru"
          icon={LockKeyhole}
          autoComplete="new-password"
          required
        />

        <Button
          type="submit"
          size="lg"
          loading={submitting}
          className="mt-1 w-full"
        >
          Simpan password baru
        </Button>
      </form>
    </AuthLayout>
  );
}

import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Eye,
  EyeOff,
  Info,
  LockKeyhole,
  Mail,
  MailCheck,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { useAuth } from '@/auth/AuthProvider';
import { authErrorMessage } from '@/lib/auth-errors';
import { supabase } from '@/lib/supabase';
import { AuthLayout } from '@/pages/auth/AuthLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function RegisterPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [terms, setTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(
    null,
  );
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (nama.trim().length < 2) {
      setError('Nama lengkap minimal 2 karakter.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Masukkan alamat email yang valid.');
      return;
    }
    if (password.length < 8) {
      setError('Password minimal 8 karakter.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Konfirmasi password belum sama.');
      return;
    }
    if (!terms) {
      setError('Centang persetujuan ketentuan layanan untuk melanjutkan.');
      return;
    }

    setSubmitting(true);
    const result = await signUp({
      nama,
      email,
      password,
    });

    if (result.error) {
      setSubmitting(false);
      setError(authErrorMessage(result.error));
      return;
    }

    if (result.needsConfirmation) {
      setSubmitting(false);
      setConfirmationEmail(email.trim());
      return;
    }

    navigate('/dashboard', { replace: true });
  };

  const handleResend = async () => {
    if (!confirmationEmail) return;
    setResending(true);
    setResendMessage(null);
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email: confirmationEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/masuk`,
      },
    });
    setResending(false);
    setResendMessage(
      resendError
        ? authErrorMessage(resendError.message)
        : 'Email konfirmasi sudah dikirim ulang. Periksa kotak masuk dan folder spam.',
    );
  };

  if (confirmationEmail) {
    return (
      <AuthLayout
        title="Cek email kamu"
        description="Satu langkah lagi untuk mengaktifkan akun UPCYCLE."
        footer={
          <>
            Sudah mengonfirmasi email?{' '}
            <Link
              to="/masuk"
              className="font-bold text-brand-700 transition-colors hover:text-brand-800"
            >
              Masuk sekarang
            </Link>
          </>
        }
      >
        <div className="rounded-[24px] border border-black/[0.06] bg-[#fafcf9] p-6 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
            <MailCheck className="h-7 w-7" />
          </span>
          <h2 className="mt-4 text-lg font-bold text-ink">
            Tautan konfirmasi sudah dikirim
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Kami mengirim tautan aktivasi ke{' '}
            <span className="font-semibold text-ink">{confirmationEmail}</span>.
            Buka email tersebut lalu klik tautan untuk mengaktifkan akun.
          </p>

          {resendMessage && (
            <div className="mt-4 rounded-xl border border-brand-100 bg-brand-50 px-3.5 py-2.5 text-left text-[11px] leading-5 text-brand-800">
              {resendMessage}
            </div>
          )}

          <Button
            type="button"
            variant="secondary"
            onClick={() => void handleResend()}
            loading={resending}
            className="mt-5 w-full"
          >
            Kirim ulang email konfirmasi
          </Button>
        </div>

        <div className="mt-4 flex items-start gap-2.5 rounded-2xl bg-[#f5f7f3] px-4 py-3 text-[11px] leading-5 text-muted">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
          <p>
            Email bisa membutuhkan beberapa menit. Jika tidak menemukannya,
            periksa folder spam atau promosi sebelum mengirim ulang.
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Buat akun UPCYCLE"
      description="Buat akun warga untuk setor sampah, belanja, dan berjualan di marketplace. Peran mitra ditetapkan admin setelah verifikasi."
      footer={
        <>
          Sudah punya akun?{' '}
          <Link
            to="/masuk"
            className="font-bold text-brand-700 transition-colors hover:text-brand-800"
          >
            Masuk
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
          label="Nama lengkap"
          value={nama}
          onChange={(event) => setNama(event.target.value)}
          placeholder="Nama sesuai identitas"
          icon={UserRound}
          autoComplete="name"
          required
        />

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

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Password"
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
            label="Konfirmasi password"
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Ulangi password"
            icon={LockKeyhole}
            autoComplete="new-password"
            required
          />
        </div>

        <div className="flex items-start gap-2.5 rounded-2xl bg-[#f5f7f3] px-4 py-3 text-[11px] leading-5 text-muted">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
          <p>
            Akun BSU, BSI, dan industri hanya dibuat oleh admin melalui proses
            verifikasi organisasi.
          </p>
        </div>

        <label className="flex cursor-pointer items-start gap-2.5 text-[11px] leading-5 text-muted">
          <input
            type="checkbox"
            checked={terms}
            onChange={(event) => setTerms(event.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-brand-600"
          />
          <span>
            Saya menyetujui Ketentuan Layanan dan Kebijakan Privasi UPCYCLE,
            termasuk penggunaan data untuk keperluan operasional layanan.
          </span>
        </label>

        <Button
          type="submit"
          size="lg"
          loading={submitting}
          className="mt-1 w-full"
        >
          Buat akun sekarang
        </Button>
      </form>
    </AuthLayout>
  );
}

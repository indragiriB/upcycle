import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Mail, MailCheck } from 'lucide-react';
import { absoluteAppUrl } from '@/lib/paths';
import { supabase } from '@/lib/supabase';
import { authErrorMessage } from '@/lib/auth-errors';
import { AuthLayout } from '@/pages/auth/AuthLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Masukkan alamat email yang valid.');
      return;
    }

    setSubmitting(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      {
        redirectTo: absoluteAppUrl('/atur-ulang-password'),
      },
    );
    setSubmitting(false);

    if (resetError) {
      setError(authErrorMessage(resetError.message));
      return;
    }

    setSentTo(email.trim());
  };

  if (sentTo) {
    return (
      <AuthLayout
        title="Periksa email kamu"
        description="Kami mengirim tautan untuk membuat password baru."
        footer={
          <>
            Ingat password?{' '}
            <Link
              to="/masuk"
              className="font-bold text-brand-700 transition-colors hover:text-brand-800"
            >
              Kembali masuk
            </Link>
          </>
        }
      >
        <div className="rounded-[24px] border border-black/[0.06] bg-[#fafcf9] p-6 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
            <MailCheck className="h-7 w-7" />
          </span>
          <h2 className="mt-4 text-lg font-bold text-ink">
            Tautan reset sudah dikirim
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Buka email di{' '}
            <span className="font-semibold text-ink">{sentTo}</span> lalu ikuti
            tautan untuk membuat password baru. Tautan berlaku terbatas.
          </p>
          <Link
            to="/masuk"
            className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            Kembali ke halaman masuk
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Lupa password?"
      description="Masukkan email akunmu. Kami akan mengirim tautan untuk membuat password baru."
      footer={
        <>
          Ingat password?{' '}
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
          label="Email akun"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="nama@email.com"
          icon={Mail}
          autoComplete="email"
          inputMode="email"
          required
        />

        <Button
          type="submit"
          size="lg"
          loading={submitting}
          className="mt-1 w-full"
        >
          Kirim tautan reset
        </Button>
      </form>
    </AuthLayout>
  );
}

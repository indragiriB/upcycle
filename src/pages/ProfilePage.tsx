import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BadgeCheck,
  Building2,
  CalendarDays,
  Camera,
  CheckCircle2,
  ExternalLink,
  Leaf,
  LockKeyhole,
  LogOut,
  Mail,
  MapPin,
  Package,
  Phone,
  Recycle,
  Save,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/auth/AuthProvider';
import { usePageTitle } from '@/hooks/usePageTitle';
import { supabase } from '@/lib/supabase';
import { authErrorMessage } from '@/lib/auth-errors';
import { cn, formatDateShort, mapsUrl } from '@/lib/utils';
import { ROLE_DESCRIPTIONS, ROLE_LABELS, ORG_TYPE_LABELS } from '@/lib/roles';
import {
  VERIFICATION_LABELS,
  VERIFICATION_TONES,
  statusLabel,
  statusTone,
} from '@/lib/status';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import type { AppRole, OrganizationType } from '@/types/database';

const ROLE_ICONS: Record<AppRole, LucideIcon> = {
  warga: Recycle,
  bsu: Building2,
  bsi: Building2,
  industri: Package,
  admin: ShieldCheck,
};

const ORG_ICONS: Record<OrganizationType, LucideIcon> = {
  bsu: Leaf,
  bsi: Building2,
  industri: Package,
};

const MAX_AVATAR_SIZE = 2 * 1024 * 1024;

export function ProfilePage() {
  const { profile, session, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [nama, setNama] = useState(profile?.nama ?? '');
  const [savingName, setSavingName] = useState(false);
  const [nameMessage, setNameMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const [uploading, setUploading] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const [resetSending, setResetSending] = useState(false);
  const [resetMessage, setResetMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  usePageTitle('Profil & pengaturan');

  useEffect(() => {
    if (profile?.nama) setNama(profile.nama);
  }, [profile?.nama]);

  if (!profile) return null;

  const email = session?.user.email ?? '';
  const organization = profile.organizations;
  const RoleIcon = ROLE_ICONS[profile.role];
  const OrgIcon = organization ? ORG_ICONS[organization.tipe] : Building2;
  const nameChanged = nama.trim() !== profile.nama && nama.trim().length >= 2;
  const emailVerified = Boolean(session?.user.email_confirmed_at);

  const handleSaveName = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNameMessage(null);

    if (nama.trim().length < 2) {
      setNameMessage({
        type: 'error',
        text: 'Nama lengkap minimal 2 karakter.',
      });
      return;
    }

    setSavingName(true);
    const { error } = await supabase
      .from('profiles')
      .update({ nama: nama.trim() })
      .eq('id', profile.id);
    setSavingName(false);

    if (error) {
      setNameMessage({
        type: 'error',
        text: 'Nama belum bisa disimpan. Coba lagi beberapa saat lagi.',
      });
      return;
    }

    await refreshProfile();
    setNameMessage({
      type: 'success',
      text: 'Nama profil berhasil diperbarui.',
    });
    window.setTimeout(() => setNameMessage(null), 4000);
  };

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setAvatarMessage(null);

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setAvatarMessage({
        type: 'error',
        text: 'Gunakan foto JPG, PNG, atau WebP.',
      });
      return;
    }

    if (file.size > MAX_AVATAR_SIZE) {
      setAvatarMessage({
        type: 'error',
        text: 'Ukuran foto maksimal 2 MB.',
      });
      return;
    }

    setUploading(true);
    try {
      const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${profile.id}/avatar-${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, {
          cacheControl: '3600',
          contentType: file.type,
          upsert: true,
        });

      if (uploadError) {
        throw new Error(
          uploadError.message.toLowerCase().includes('bucket not found')
            ? 'Bucket avatar belum tersedia. Jalankan migrasi storage Supabase terlebih dahulu.'
            : 'Foto gagal diunggah. Periksa koneksi lalu coba lagi.',
        );
      }

      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(path);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrlData.publicUrl })
        .eq('id', profile.id);

      if (updateError) {
        throw new Error(
          'Foto terunggah tetapi profil belum bisa diperbarui. Coba lagi.',
        );
      }

      await refreshProfile();
      setAvatarMessage({
        type: 'success',
        text: 'Foto profil berhasil diperbarui.',
      });
      window.setTimeout(() => setAvatarMessage(null), 4000);
    } catch (uploadFailure) {
      setAvatarMessage({
        type: 'error',
        text:
          uploadFailure instanceof Error
            ? uploadFailure.message
            : 'Foto gagal diunggah. Coba lagi.',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSendReset = async () => {
    if (!email) return;
    setResetSending(true);
    setResetMessage(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/atur-ulang-password`,
    });
    setResetSending(false);

    if (error) {
      setResetMessage({
        type: 'error',
        text: authErrorMessage(error.message),
      });
      return;
    }

    setResetMessage({
      type: 'success',
      text: 'Tautan reset password sudah dikirim ke email akunmu.',
    });
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    navigate('/masuk', { replace: true });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4 pt-2">
      <header className="px-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
          Akun
        </p>
        <h1 className="mt-1 text-[24px] font-extrabold tracking-tight text-ink sm:text-[28px]">
          Profil & pengaturan
        </h1>
        <p className="mt-1 text-xs leading-5 text-muted sm:text-[13px]">
          Kelola identitas, foto, dan keamanan akun UPCYCLE-mu.
        </p>
      </header>

      <Card className="overflow-hidden">
        <div className="relative h-24 overflow-hidden bg-[#101a12] sm:h-28">
          <div className="auth-grid absolute inset-0 opacity-70" />
          <div className="auth-orb absolute -right-20 -top-24 h-64 w-64 rounded-full opacity-65" />
          <div className="absolute -bottom-20 left-1/3 h-48 w-48 rounded-full border border-white/[0.07]" />
          <span className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-white/45">
            <ShieldCheck className="h-3 w-3 text-brand-400" />
            Akun UPCYCLE
          </span>
        </div>

        <div className="relative px-4 pb-5 sm:px-6">
          <div className="absolute left-4 top-0 z-10 -translate-y-1/2 sm:left-6">
            <div className="relative shrink-0">
              <Avatar
                name={profile.nama}
                src={profile.avatar_url}
                size="xl"
                className="h-[84px] w-[84px] text-2xl ring-4 ring-white shadow-lg sm:h-24 sm:w-24"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                aria-label="Ubah foto profil"
                title="Ubah foto profil"
                className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-brand-600 text-white shadow-md transition-colors hover:bg-brand-700 disabled:opacity-70"
              >
                {uploading ? (
                  <Spinner className="h-3.5 w-3.5" />
                ) : (
                  <Camera className="h-3.5 w-3.5" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => void handleAvatarChange(event)}
                className="hidden"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex min-w-0 items-end gap-3.5 sm:gap-4">
              <div aria-hidden="true" className="w-[84px] shrink-0 sm:w-24" />

              <div className="min-w-0 pb-1">
                <h2 className="truncate text-lg font-extrabold tracking-tight text-ink sm:text-xl">
                  {profile.nama}
                </h2>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <Badge tone="green" dot>
                    {ROLE_LABELS[profile.role]}
                  </Badge>
                  {organization && (
                    <Badge tone="neutral">{organization.nama}</Badge>
                  )}
                </div>
                <p className="mt-1.5 truncate text-[11px] text-muted">
                  {email}
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="mb-1"
            >
              <Camera className="h-3.5 w-3.5" />
              {uploading ? 'Mengunggah…' : 'Ganti foto'}
            </Button>
          </div>

          {avatarMessage && (
            <p
              className={cn(
                'mt-3 rounded-xl px-3.5 py-2.5 text-[11px] leading-5',
                avatarMessage.type === 'success'
                  ? 'bg-brand-50 text-brand-800'
                  : 'bg-red-50 text-red-700',
              )}
            >
              {avatarMessage.text}
            </p>
          )}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="space-y-4">
          <Card className="p-4 md:p-5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <UserRound className="h-[18px] w-[18px]" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-ink">
                  Informasi profil
                </h2>
                <p className="text-[11px] text-muted">
                  Nama ini tampil untuk mitra dan pengguna lain.
                </p>
              </div>
            </div>

            <form
              onSubmit={(event) => void handleSaveName(event)}
              className="mt-4 space-y-4"
              noValidate
            >
              <Input
                label="Nama lengkap"
                value={nama}
                onChange={(event) => setNama(event.target.value)}
                icon={UserRound}
                autoComplete="name"
                hint="Minimal 2 karakter. Perubahan langsung tersinkron ke profil."
                required
              />

              <Input
                label="Email akun"
                value={email}
                icon={Mail}
                readOnly
                disabled
                hint="Email login tidak dapat diubah dari halaman ini."
                trailing={
                  emailVerified ? (
                    <Badge tone="green" className="shrink-0">
                      Terverifikasi
                    </Badge>
                  ) : (
                    <Badge tone="amber" className="shrink-0">
                      Belum aktif
                    </Badge>
                  )
                }
              />

              {nameMessage && (
                <p
                  className={cn(
                    'rounded-xl px-3.5 py-2.5 text-[11px] leading-5',
                    nameMessage.type === 'success'
                      ? 'bg-brand-50 text-brand-800'
                      : 'bg-red-50 text-red-700',
                  )}
                >
                  {nameMessage.text}
                </p>
              )}

              <div className="flex justify-end">
                <Button
                  type="submit"
                  size="sm"
                  loading={savingName}
                  disabled={!nameChanged}
                >
                  <Save className="h-3.5 w-3.5" />
                  Simpan perubahan
                </Button>
              </div>
            </form>
          </Card>

          <Card className="p-4 md:p-5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f2f5f1] text-ink">
                <LockKeyhole className="h-[18px] w-[18px]" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-ink">
                  Keamanan akun
                </h2>
                <p className="text-[11px] text-muted">
                  Kelola password dan sesi perangkat ini.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#f8faf7] px-4 py-3.5">
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-ink">
                    Password
                  </p>
                  <p className="mt-0.5 text-[10px] leading-4 text-muted">
                    Kirim tautan reset ke {email || 'email akun'}.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => void handleSendReset()}
                  loading={resetSending}
                  disabled={!email}
                >
                  Kirim tautan reset
                </Button>
              </div>

              {resetMessage && (
                <p
                  className={cn(
                    'rounded-xl px-3.5 py-2.5 text-[11px] leading-5',
                    resetMessage.type === 'success'
                      ? 'bg-brand-50 text-brand-800'
                      : 'bg-red-50 text-red-700',
                  )}
                >
                  {resetMessage.text}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#f8faf7] px-4 py-3.5">
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-ink">
                    Sesi aktif
                  </p>
                  <p className="mt-0.5 text-[10px] leading-4 text-muted">
                    Keluar dari perangkat ini setelah selesai menggunakan
                    UPCYCLE.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() => void handleSignOut()}
                  loading={signingOut}
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Keluar
                </Button>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-4 md:p-5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <RoleIcon className="h-[18px] w-[18px]" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-ink">
                  Peran & akses
                </h2>
                <p className="text-[11px] text-muted">Hak akses akunmu</p>
              </div>
            </div>

            <div className="mt-3 rounded-2xl bg-[#f8faf7] px-4 py-3.5">
              <p className="text-[13px] font-bold text-ink">
                {ROLE_LABELS[profile.role]}
              </p>
              <p className="mt-1 text-[11px] leading-5 text-muted">
                {ROLE_DESCRIPTIONS[profile.role]}
              </p>
            </div>

            {organization ? (
              <div className="mt-3 border-t border-black/[0.06] pt-3">
                <div className="flex items-start gap-2.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-brand-700 ring-1 ring-black/[0.05]">
                    <OrgIcon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="truncate text-[12px] font-bold text-ink">
                        {organization.nama}
                      </p>
                      <Badge
                        tone={statusTone(
                          organization.status,
                          VERIFICATION_TONES,
                        )}
                        className="px-1.5 py-0.5 text-[8px]"
                      >
                        {statusLabel(
                          organization.status,
                          VERIFICATION_LABELS,
                        )}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-[10px] font-medium text-muted">
                      {ORG_TYPE_LABELS[organization.tipe]}
                    </p>
                    <div className="mt-2 space-y-1.5 text-[10px] leading-4 text-muted">
                      {organization.alamat && (
                        <p className="flex items-start gap-1.5">
                          <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-brand-600" />
                          <span>
                            {organization.alamat}
                            {organization.kota
                              ? `, ${organization.kota}`
                              : ''}
                          </span>
                        </p>
                      )}
                      {organization.telepon && (
                        <p className="flex items-center gap-1.5">
                          <Phone className="h-3 w-3 shrink-0 text-brand-600" />
                          {organization.telepon}
                        </p>
                      )}
                    </div>
                    {mapsUrl(
                      organization.lat,
                      organization.lng,
                      organization.alamat,
                    ) && (
                      <a
                        href={
                          mapsUrl(
                            organization.lat,
                            organization.lng,
                            organization.alamat,
                          ) as string
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2.5 inline-flex items-center gap-1.5 text-[10px] font-semibold text-brand-700 transition-colors hover:text-brand-800"
                      >
                        Buka lokasi di peta
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-3 border-t border-black/[0.06] pt-3 text-[10px] leading-4 text-muted">
                Akun ini tidak terhubung ke organisasi usaha. Peran mitra
                hanya dapat ditetapkan oleh admin.
              </p>
            )}
          </Card>

          <Card className="p-4 md:p-5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f2f5f1] text-ink">
                <BadgeCheck className="h-[18px] w-[18px]" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-ink">
                  Tentang akun
                </h2>
                <p className="text-[11px] text-muted">Detail keanggotaan</p>
              </div>
            </div>

            <dl className="mt-3 divide-y divide-black/[0.05]">
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="flex items-center gap-2 text-[11px] text-muted">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Bergabung
                </dt>
                <dd className="text-[11px] font-semibold text-ink">
                  {formatDateShort(profile.created_at)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="flex items-center gap-2 text-[11px] text-muted">
                  <Mail className="h-3.5 w-3.5" />
                  Status email
                </dt>
                <dd>
                  {emailVerified ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Terverifikasi
                    </span>
                  ) : (
                    <Badge tone="amber">Belum aktif</Badge>
                  )}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="flex items-center gap-2 text-[11px] text-muted">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Peran
                </dt>
                <dd>
                  <Badge tone="green">{ROLE_LABELS[profile.role]}</Badge>
                </dd>
              </div>
            </dl>

            <p className="mt-2 text-[10px] leading-4 text-muted">
              Peran dan organisasi hanya dapat diubah oleh admin UPCYCLE untuk
              menjaga keamanan data.
            </p>

            <Link
              to="/dashboard"
              className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold text-brand-700 transition-colors hover:text-brand-800"
            >
              Kembali ke dashboard
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}

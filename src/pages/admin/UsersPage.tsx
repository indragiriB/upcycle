import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BadgeCheck,
  Building2,
  CheckCircle2,
  RefreshCw,
  Search,
  UserCog,
  Users,
} from 'lucide-react';
import { useAuth } from '@/auth/AuthProvider';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useAdminProfiles } from '@/hooks/useAdmin';
import { ROLE_LABELS, ROLE_SHORT_LABELS } from '@/lib/roles';
import { formatDateShort } from '@/lib/utils';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatCard, StatCardSkeleton } from '@/components/dashboard/StatCard';
import { UserAccessDialog } from '@/components/admin/UserAccessDialog';
import type { AdminProfileRecord, AppRole, DashboardStat } from '@/types/database';

type RoleFilter = AppRole | 'semua';

const ROLE_FILTERS: Array<{ key: RoleFilter; label: string }> = [
  { key: 'semua', label: 'Semua' },
  { key: 'warga', label: 'Warga' },
  { key: 'bsu', label: 'BSU' },
  { key: 'bsi', label: 'BSI' },
  { key: 'industri', label: 'Industri' },
  { key: 'admin', label: 'Admin' },
];

const ROLE_TONES: Record<AppRole, 'green' | 'neutral' | 'amber' | 'red' | 'dark'> = {
  warga: 'neutral',
  bsu: 'green',
  bsi: 'green',
  industri: 'amber',
  admin: 'dark',
};

export function UsersPage() {
  const { profile } = useAuth();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('semua');
  const [editing, setEditing] = useState<AdminProfileRecord | null>(null);

  usePageTitle('Kelola pengguna');

  const usersQuery = useAdminProfiles();
  const users = usersQuery.data ?? [];

  const [notice, setNotice] = useState<{
    tone: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 6000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const stats: DashboardStat[] = useMemo(() => {
    const count = (role: AppRole) =>
      users.filter((user) => user.role === role).length;

    return [
      {
        key: 'total',
        label: 'Total pengguna',
        value: users.length,
        format: 'number',
        hint: 'Akun terdaftar',
      },
      {
        key: 'warga',
        label: 'Warga',
        value: count('warga'),
        format: 'number',
        hint: 'Penyetor sampah',
      },
      {
        key: 'mitra',
        label: 'Petugas & mitra',
        value: count('bsu') + count('bsi') + count('industri'),
        format: 'number',
        hint: 'BSU, BSI, industri',
      },
      {
        key: 'admin',
        label: 'Administrator',
        value: count('admin'),
        format: 'number',
        hint: 'Pengelola sistem',
      },
    ];
  }, [users]);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return users.filter((user) => {
      if (roleFilter !== 'semua' && user.role !== roleFilter) return false;
      if (!keyword) return true;
      return `${user.nama} ${user.organizations?.nama ?? ''}`
        .toLowerCase()
        .includes(keyword);
    });
  }, [roleFilter, search, users]);

  return (
    <div className="mx-auto max-w-5xl space-y-4 pb-4">
      <PageHeader
        eyebrow="Admin & pengguna"
        title="Kelola pengguna"
        description="Naikkan peran akun yang sudah mendaftar menjadi petugas BSU, BSI, industri, atau admin. Warga tidak perlu mendaftar ulang."
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
        {usersQuery.isLoading
          ? [0, 1, 2, 3].map((item) => <StatCardSkeleton key={item} />)
          : stats.map((stat) => <StatCard key={stat.key} stat={stat} />)}
      </div>

      <Card className="p-4 md:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="w-full max-w-sm">
            <Input
              label="Cari pengguna"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nama pengguna atau organisasi"
              icon={Search}
            />
          </div>
          <div className="flex flex-wrap gap-1.5 md:justify-end">
            {ROLE_FILTERS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setRoleFilter(item.key)}
                className={`rounded-full px-3 py-1.5 text-[10px] font-semibold transition-colors ${
                  roleFilter === item.key
                    ? 'bg-brand-600 text-white'
                    : 'bg-[#f2f5f1] text-muted hover:bg-[#e9eee6] hover:text-ink'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          {usersQuery.isLoading && (
            <div className="space-y-2.5">
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className="rounded-[22px] border border-black/[0.04] p-4"
                >
                  <div className="flex items-start gap-3">
                    <Skeleton className="h-11 w-11 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3.5 w-48" />
                      <Skeleton className="h-2.5 w-64" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {usersQuery.isError && (
            <EmptyState
              icon={Users}
              title="Pengguna belum bisa dimuat"
              description="Periksa koneksi Supabase lalu coba lagi."
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void usersQuery.refetch()}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Coba lagi
                </Button>
              }
            />
          )}

          {!usersQuery.isLoading &&
            !usersQuery.isError &&
            users.length === 0 && (
              <EmptyState
                icon={Users}
                title="Belum ada pengguna"
                description="Akun yang mendaftar akan muncul di sini untuk diatur perannya."
              />
            )}

          {!usersQuery.isLoading &&
            !usersQuery.isError &&
            users.length > 0 &&
            filtered.length === 0 && (
              <EmptyState
                icon={Search}
                title="Tidak ada pengguna pada filter ini"
                description="Ubah kata kunci atau pilih peran lain."
              />
            )}

          {!usersQuery.isLoading &&
            !usersQuery.isError &&
            filtered.length > 0 && (
              <div className="space-y-2.5">
                {filtered.map((user) => {
                  const isSelf = user.id === profile?.id;
                  const organization = user.organizations;

                  return (
                    <article
                      key={user.id}
                      className="rounded-[22px] border border-black/[0.05] bg-white p-3.5 sm:p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <Avatar
                            name={user.nama}
                            src={user.avatar_url}
                            size="md"
                          />
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p className="truncate text-[13px] font-bold text-ink sm:text-sm">
                                {user.nama}
                              </p>
                              <Badge
                                tone={ROLE_TONES[user.role]}
                                className="px-2 py-0.5 text-[9px]"
                              >
                                {ROLE_SHORT_LABELS[user.role]}
                              </Badge>
                              {isSelf && (
                                <Badge
                                  tone="neutral"
                                  className="px-2 py-0.5 text-[9px]"
                                >
                                  Akun Anda
                                </Badge>
                              )}
                            </div>
                            <p className="mt-0.5 text-[10px] text-muted">
                              {ROLE_LABELS[user.role]} · terdaftar{' '}
                              {formatDateShort(user.created_at)}
                            </p>
                            <p className="mt-1 flex items-start gap-1.5 text-[10px] leading-4 text-muted">
                              <Building2 className="mt-0.5 h-3 w-3 shrink-0" />
                              {organization
                                ? `${organization.nama} · ${ROLE_SHORT_LABELS[organization.tipe]}`
                                : 'Tanpa organisasi'}
                            </p>
                          </div>
                        </div>

                        <Button
                          size="sm"
                          variant={isSelf ? 'secondary' : 'primary'}
                          disabled={isSelf}
                          onClick={() => setEditing(user)}
                        >
                          {user.role === 'warga' ? (
                            <BadgeCheck className="h-3.5 w-3.5" />
                          ) : (
                            <UserCog className="h-3.5 w-3.5" />
                          )}
                          {isSelf ? 'Akun sendiri' : 'Atur peran'}
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
        </div>
      </Card>

      {!usersQuery.isLoading && !usersQuery.isError && (
        <p className="px-1 text-[10px] text-muted">
          Menampilkan {filtered.length} dari {users.length} pengguna. Perubahan
          peran langsung berlaku; pengguna perlu memuat ulang halaman.
        </p>
      )}

      <UserAccessDialog
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        user={editing}
        currentUserId={profile?.id ?? null}
        onSuccess={(user) => {
          setNotice({
            tone: 'success',
            text: `${user.nama} sekarang berperan sebagai ${ROLE_LABELS[user.role]}.`,
          });
        }}
      />
    </div>
  );
}

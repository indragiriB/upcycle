import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, LogOut, RefreshCw } from 'lucide-react';
import { useAuth } from '@/auth/AuthProvider';
import { getAllowedRolesForPath } from '@/config/navigation';
import { PageLoader } from '@/components/ui/PageLoader';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';

export function ProtectedRoute() {
  const { session, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader label="Memeriksa sesi dan profil…" />;

  if (!session) {
    return (
      <Navigate
        to="/masuk"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  if (!profile) return <ProfileUnavailable />;

  return <Outlet />;
}

export function PublicOnlyRoute() {
  const { session, loading } = useAuth();

  if (loading) return <PageLoader label="Memeriksa sesi…" />;
  if (session) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}

export function RootRedirect() {
  const { session, loading } = useAuth();

  if (loading) return <PageLoader label="Membuka UPCYCLE…" />;
  return <Navigate to={session ? '/dashboard' : '/masuk'} replace />;
}

export function RoleGate({
  path,
  children,
}: {
  path: string;
  children: ReactNode;
}) {
  const { profile } = useAuth();

  if (!profile) return null;

  const allowedRoles = getAllowedRolesForPath(path);
  if (allowedRoles.length > 0 && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function ProfileUnavailable() {
  const { profileError, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/masuk', { replace: true });
  };

  return (
    <div className="flex min-h-svh items-center justify-center bg-canvas px-5 py-10">
      <div className="w-full max-w-md rounded-[28px] border border-black/[0.04] bg-white p-6 text-center shadow-card sm:p-8">
        <div className="flex justify-center">
          <Logo imageClassName="h-9" />
        </div>
        <span className="mx-auto mt-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
          <AlertTriangle className="h-5 w-5" />
        </span>
        <h1 className="mt-3 text-xl font-extrabold tracking-tight text-ink">
          Profil belum bisa dimuat
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Sesi login aktif, tetapi data profil tidak ditemukan. Hal ini biasanya
          terjadi jika migrasi atau trigger profil belum diterapkan.
        </p>
        {profileError && (
          <p className="mt-3 rounded-xl bg-[#f5f7f3] px-3.5 py-2.5 text-[10px] leading-5 text-muted">
            {profileError}
          </p>
        )}
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => void refreshProfile()}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Muat ulang profil
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={() => void handleSignOut()}
          >
            <LogOut className="h-3.5 w-3.5" />
            Keluar
          </Button>
        </div>
      </div>
    </div>
  );
}

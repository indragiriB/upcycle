import { Suspense, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';
import { TopNavbar } from '@/components/layout/TopNavbar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { OfflineQueueBanner } from '@/components/layout/OfflineQueueBanner';
import { PageLoader } from '@/components/ui/PageLoader';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

export function AppShell() {
  const { profile, session } = useAuth();
  const location = useLocation();

  if (!profile) return <PageLoader />;

  return (
    <div className="min-h-svh bg-canvas">
      <ScrollToTop />
      <TopNavbar profile={profile} email={session?.user.email} />
      <OfflineQueueBanner />
      <main
        key={location.pathname}
        className="app-container animate-fade-up pb-28 pt-1 lg:pb-10"
      >
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
      <MobileBottomNav role={profile.role} />
    </div>
  );
}

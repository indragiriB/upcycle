import { Link, NavLink } from 'react-router-dom';
import { Settings2 } from 'lucide-react';
import { NAVIGATION } from '@/config/navigation';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/ui/Logo';
import { NotificationsPopover } from '@/components/layout/NotificationsPopover';
import { ProfileMenu } from '@/components/layout/ProfileMenu';
import type { ProfileWithOrganization } from '@/types/database';

export function TopNavbar({
  profile,
  email,
}: {
  profile: ProfileWithOrganization;
  email: string | undefined;
}) {
  const navItems = NAVIGATION[profile.role].filter((item) => !item.hidden);

  return (
    <header className="sticky top-0 z-40 bg-canvas/85 backdrop-blur-xl">
      <div className="app-container py-3">
        <div className="flex h-[64px] items-center justify-between gap-3 rounded-[22px] border border-white/70 bg-white/95 px-3 shadow-card md:h-[72px] md:px-5 lg:grid lg:grid-cols-[1fr_auto_1fr]">
          <div className="flex min-w-0 items-center gap-3">
            <Logo imageClassName="h-8 md:h-9" />
          </div>

          <nav
            aria-label="Navigasi utama"
            className="hidden items-center gap-1 rounded-full bg-[#f1f4ef] p-1.5 lg:flex"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  title={item.label}
                  aria-label={item.label}
                  className={({ isActive }) =>
                    cn(
                      'group relative flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/20',
                      isActive
                        ? 'bg-brand-600 text-white shadow-[0_8px_20px_-8px_rgba(22,163,74,0.85)]'
                        : 'text-[#858d86] hover:bg-white hover:text-ink',
                    )
                  }
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={2.1} />
                  <span className="pointer-events-none absolute -bottom-8 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink px-2 py-1 text-[10px] font-semibold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                    {item.label}
                  </span>
                </NavLink>
              );
            })}
          </nav>

          <div className="flex items-center justify-end gap-2">
            <NotificationsPopover userId={profile.id} />
            <Link
              to="/profile"
              aria-label="Pengaturan akun"
              title="Pengaturan akun"
              className="hidden h-10 w-10 items-center justify-center rounded-full border border-black/[0.06] bg-white text-ink transition-colors hover:bg-[#f7f9f6] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/20 md:flex md:h-11 md:w-11"
            >
              <Settings2 className="h-[18px] w-[18px]" strokeWidth={2} />
            </Link>
            <ProfileMenu profile={profile} email={email} />
          </div>
        </div>
      </div>
    </header>
  );
}

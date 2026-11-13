import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  LayoutDashboard,
  LogOut,
  UserRound,
} from 'lucide-react';
import { useClickOutside } from '@/hooks/useClickOutside';
import { useAuth } from '@/auth/AuthProvider';
import { ROLE_LABELS, ROLE_SHORT_LABELS } from '@/lib/roles';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import type { ProfileWithOrganization } from '@/types/database';

export function ProfileMenu({
  profile,
  email,
}: {
  profile: ProfileWithOrganization;
  email: string | undefined;
}) {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { signOut } = useAuth();

  useClickOutside(containerRef, () => setOpen(false), open);

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    navigate('/masuk', { replace: true });
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Menu profil"
        className="flex items-center gap-2 rounded-full border border-black/[0.06] bg-white p-1 pr-1 transition-colors hover:bg-[#f8faf7] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/20 md:pr-2.5"
      >
        <Avatar name={profile.nama} src={profile.avatar_url} size="sm" />
        <span className="hidden min-w-0 text-left xl:block">
          <span className="block max-w-[130px] truncate text-xs font-bold text-ink">
            {profile.nama}
          </span>
          <span className="block text-[10px] font-medium text-muted">
            {ROLE_SHORT_LABELS[profile.role]}
            {profile.organizations ? ` · ${profile.organizations.nama}` : ''}
          </span>
        </span>
        <ChevronDown
          className={`hidden h-3.5 w-3.5 text-muted transition-transform xl:block ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+10px)] z-50 w-[min(90vw,290px)] overflow-hidden rounded-[22px] border border-black/[0.06] bg-white shadow-float"
        >
          <div className="border-b border-black/[0.05] px-4 py-4">
            <div className="flex items-center gap-3">
              <Avatar
                name={profile.nama}
                src={profile.avatar_url}
                size="md"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-ink">
                  {profile.nama}
                </p>
                <p className="truncate text-[11px] text-muted">{email}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <Badge tone="green">{ROLE_LABELS[profile.role]}</Badge>
              {profile.organizations && (
                <Badge tone="neutral">{profile.organizations.nama}</Badge>
              )}
            </div>
          </div>

          <div className="p-2">
            <Link
              to="/dashboard"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-ink transition-colors hover:bg-[#f6f8f5]"
            >
              <LayoutDashboard className="h-4 w-4 text-muted" />
              Dashboard
            </Link>
            <Link
              to="/profile"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-ink transition-colors hover:bg-[#f6f8f5]"
            >
              <UserRound className="h-4 w-4 text-muted" />
              Akun saya
            </Link>
          </div>

          <div className="border-t border-black/[0.05] p-2">
            <button
              type="button"
              role="menuitem"
              onClick={() => void handleSignOut()}
              disabled={signingOut}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
            >
              {signingOut ? (
                <Spinner className="h-4 w-4" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
              {signingOut ? 'Keluar…' : 'Keluar dari akun'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

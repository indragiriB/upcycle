import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BadgeCheck,
  Bell,
  BellOff,
  CheckCheck,
  Info,
  Package,
  Recycle,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { useClickOutside } from '@/hooks/useClickOutside';
import { useNotifications } from '@/hooks/useNotifications';
import { timeAgo, cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/Spinner';
import { Skeleton } from '@/components/ui/Skeleton';

function notificationVisual(tipe: string): {
  icon: LucideIcon;
  className: string;
} {
  const normalized = tipe.toLowerCase();
  if (normalized.includes('setoran') || normalized.includes('sampah')) {
    return { icon: Recycle, className: 'bg-brand-50 text-brand-700' };
  }
  if (normalized.includes('bayar') || normalized.includes('kas')) {
    return { icon: Wallet, className: 'bg-emerald-50 text-emerald-700' };
  }
  if (normalized.includes('pesanan') || normalized.includes('produk')) {
    return { icon: Package, className: 'bg-sky-50 text-sky-700' };
  }
  if (normalized.includes('verifikasi') || normalized.includes('akun')) {
    return { icon: BadgeCheck, className: 'bg-amber-50 text-amber-700' };
  }
  return { icon: Info, className: 'bg-[#f2f5f1] text-[#5d665e]' };
}

export function NotificationsPopover({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const {
    notifications,
    unreadCount,
    isLoading,
    isError,
    markRead,
    markAllRead,
  } = useNotifications(userId);

  useClickOutside(containerRef, () => setOpen(false), open);

  const handleItemClick = (id: string, link: string | null) => {
    markRead.mutate(id);
    setOpen(false);
    if (link) navigate(link);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={
          unreadCount > 0
            ? `Notifikasi, ${unreadCount} belum dibaca`
            : 'Notifikasi'
        }
        aria-expanded={open}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-black/[0.06] bg-white text-ink transition-colors hover:bg-[#f7f9f6] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/20 md:h-11 md:w-11"
      >
        <Bell className="h-[18px] w-[18px]" strokeWidth={2} />
        {unreadCount > 0 && (
          <span className="absolute right-[9px] top-[9px] flex h-2 w-2">
            <span className="notification-dot absolute inline-flex h-full w-full rounded-full bg-brand-500 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500 ring-2 ring-white" />
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-[min(92vw,380px)] overflow-hidden rounded-[22px] border border-black/[0.06] bg-white shadow-float">
          <div className="flex items-center justify-between gap-3 border-b border-black/[0.05] px-4 py-3.5">
            <div>
              <p className="text-sm font-bold text-ink">Notifikasi</p>
              <p className="text-[11px] text-muted">
                {unreadCount > 0
                  ? `${unreadCount} belum dibaca`
                  : 'Semua sudah dibaca'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => markAllRead.mutate()}
              disabled={unreadCount === 0 || markAllRead.isPending}
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-semibold text-brand-700 transition-colors hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {markAllRead.isPending ? (
                <Spinner className="h-3.5 w-3.5" />
              ) : (
                <CheckCheck className="h-3.5 w-3.5" />
              )}
              Tandai dibaca
            </button>
          </div>

          <div className="max-h-[min(60vh,380px)] overflow-y-auto">
            {isLoading && (
              <div className="space-y-3 p-4">
                {[0, 1, 2].map((item) => (
                  <div key={item} className="flex gap-3">
                    <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3 w-2/3" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!isLoading && isError && (
              <div className="px-5 py-8 text-center">
                <p className="text-sm font-semibold text-ink">
                  Notifikasi belum bisa dimuat
                </p>
                <p className="mt-1 text-xs leading-5 text-muted">
                  Periksa koneksi lalu buka kembali panel ini.
                </p>
              </div>
            )}

            {!isLoading && !isError && notifications.length === 0 && (
              <div className="flex flex-col items-center gap-2.5 px-6 py-10 text-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f2f5f1] text-muted">
                  <BellOff className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold text-ink">
                  Belum ada notifikasi
                </p>
                <p className="text-xs leading-5 text-muted">
                  Kabar tentang setoran, pembayaran, dan pesanan akan muncul di
                  sini.
                </p>
              </div>
            )}

            {!isLoading &&
              !isError &&
              notifications.map((item) => {
                const visual = notificationVisual(item.tipe);
                const Icon = visual.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleItemClick(item.id, item.link)}
                    className={cn(
                      'flex w-full items-start gap-3 border-b border-black/[0.04] px-4 py-3.5 text-left transition-colors last:border-0 hover:bg-[#fafcf9]',
                      !item.dibaca && 'bg-brand-50/40',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                        visual.className,
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span className="line-clamp-1 text-[13px] font-semibold text-ink">
                          {item.judul}
                        </span>
                        {!item.dibaca && (
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                        )}
                      </span>
                      <span className="mt-0.5 line-clamp-2 text-xs leading-5 text-muted">
                        {item.pesan}
                      </span>
                      <span className="mt-1 block text-[10px] font-medium text-muted/80">
                        {timeAgo(item.created_at)}
                      </span>
                    </span>
                  </button>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

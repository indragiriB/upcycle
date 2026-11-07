import { NavLink } from 'react-router-dom';
import { NAVIGATION } from '@/config/navigation';
import { cn } from '@/lib/utils';
import type { AppRole } from '@/types/database';

export function MobileBottomNav({ role }: { role: AppRole }) {
  const items = NAVIGATION[role].slice(0, 5);

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 px-3 lg:hidden"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      <nav
        aria-label="Navigasi bawah"
        className="mx-auto max-w-lg rounded-[24px] border border-black/[0.06] bg-white/95 p-1.5 shadow-float backdrop-blur-xl"
      >
        <div
          className="grid gap-0.5"
          style={{
            gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
          }}
        >
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'group flex min-w-0 flex-col items-center gap-1 rounded-[18px] px-1 py-1.5 transition-colors',
                    isActive ? 'text-brand-800' : 'text-[#858d86]',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200',
                        isActive
                          ? 'bg-brand-600 text-white shadow-[0_6px_16px_-6px_rgba(22,163,74,0.9)]'
                          : 'bg-transparent group-hover:bg-[#f2f5f1]',
                      )}
                    >
                      <Icon className="h-[18px] w-[18px]" strokeWidth={2.1} />
                    </span>
                    <span
                      className={cn(
                        'max-w-full truncate text-[10px] leading-none tracking-tight',
                        isActive ? 'font-bold' : 'font-medium',
                      )}
                    >
                      {item.shortLabel ?? item.label}
                    </span>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';

const TABS = [
  { to: '/warga/setor', label: 'Setor baru', end: true },
  { to: '/warga/riwayat', label: 'Riwayat' },
  { to: '/warga/harga', label: 'Harga BSU' },
];

/** Tab pengganti menu "Harga" dan "Riwayat" di navigasi utama. */
export function SetorTabs() {
  return (
    <nav
      aria-label="Menu setoran"
      className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 py-0.5"
    >
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            cn(
              'shrink-0 rounded-full border px-3.5 py-2 text-[11px] font-semibold transition-colors',
              isActive
                ? 'border-brand-600 bg-brand-600 text-white'
                : 'border-black/[0.06] bg-white text-muted hover:text-ink',
            )
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}

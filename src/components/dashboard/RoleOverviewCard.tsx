import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  Building2,
  ChevronRight,
  Leaf,
  Package,
  Recycle,
  ShieldCheck,
  ShoppingBag,
  UserRound,
  Warehouse,
  type LucideIcon,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  NAVIGATION,
  PRIMARY_ACTIONS,
  type PrimaryAction,
} from '@/config/navigation';
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from '@/lib/roles';
import {
  VERIFICATION_LABELS,
  VERIFICATION_TONES,
  statusLabel,
  statusTone,
} from '@/lib/status';
import type { AppRole, ProfileWithOrganization } from '@/types/database';

const ROLE_ICONS: Record<AppRole, LucideIcon> = {
  warga: Recycle,
  bsu: Building2,
  bsi: Warehouse,
  pengepul: Package,
  pembeli: ShoppingBag,
  admin: ShieldCheck,
};

const TYPE_ICONS: Record<string, LucideIcon> = {
  bsu: Leaf,
  bsi: Building2,
  pengepul: Package,
};

export function RoleOverviewCard({
  profile,
}: {
  profile: ProfileWithOrganization;
}) {
  const organization = profile.organizations;
  const RoleIcon = ROLE_ICONS[profile.role];

  const candidates: Array<PrimaryAction & { short?: string }> = [
    PRIMARY_ACTIONS[profile.role],
    ...NAVIGATION[profile.role]
      .filter((item) => item.to !== '/dashboard')
      .map((item) => ({
        label: item.label,
        to: item.to,
        icon: item.icon,
      })),
    { label: 'Profil saya', to: '/profile', icon: UserRound },
  ];

  const seen = new Set<string>();
  const actions = candidates
    .filter((action) => {
      if (seen.has(action.to)) return false;
      seen.add(action.to);
      return true;
    })
    .slice(0, 3);

  const OrgIcon = organization ? TYPE_ICONS[organization.tipe] ?? Building2 : RoleIcon;

  return (
    <Card className="p-4 md:p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
          <OrgIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
            Ruang kerja
          </p>
          <h2 className="mt-0.5 truncate text-[17px] font-bold text-ink">
            {organization?.nama ?? ROLE_LABELS[profile.role]}
          </h2>
          <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-muted">
            {ROLE_DESCRIPTIONS[profile.role]}
          </p>
        </div>
        <Badge
          tone={
            organization
              ? statusTone(organization.status, VERIFICATION_TONES)
              : 'green'
          }
          dot
          className="shrink-0"
        >
          {organization
            ? statusLabel(organization.status, VERIFICATION_LABELS)
            : ROLE_LABELS[profile.role]}
        </Badge>
      </div>

      <div className="mt-4 space-y-1.5">
        {actions.map((action, index) => {
          const Icon = action.icon;
          const primary = index === 0;
          return (
            <Link
              key={action.to}
              to={action.to}
              className={`group flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors ${
                primary
                  ? 'bg-brand-600 text-white shadow-[0_10px_24px_-14px_rgba(22,163,74,0.9)] hover:bg-brand-700'
                  : 'bg-[#f7f9f6] text-ink hover:bg-[#eef3ec]'
              }`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                  primary
                    ? 'bg-white/15 text-white'
                    : 'bg-white text-brand-700 shadow-sm'
                }`}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">
                {action.label}
              </span>
              {primary ? (
                <ArrowUpRight className="h-4 w-4 shrink-0 text-white/70 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-black/20 transition-transform group-hover:translate-x-0.5" />
              )}
            </Link>
          );
        })}
      </div>
    </Card>
  );
}

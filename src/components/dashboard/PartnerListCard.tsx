import { useMemo } from 'react';
import {
  ArrowUpRight,
  Building2,
  Leaf,
  MapPin,
  MapPinned,
  Package,
  type LucideIcon,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { haversineKm, formatDistance } from '@/lib/geo';
import { mapsUrl } from '@/lib/utils';
import { ORG_TYPE_SHORT_LABELS } from '@/lib/roles';
import type { OrganizationSummary } from '@/types/database';

const TYPE_ICONS: Record<string, LucideIcon> = {
  bsu: Leaf,
  bsi: Building2,
  industri: Package,
};

export function PartnerListCard({
  organizations,
  center,
  loading,
}: {
  organizations: OrganizationSummary[];
  center: [number, number];
  loading: boolean;
}) {
  const partners = useMemo(
    () =>
      organizations
        .filter(
          (organization) =>
            organization.lat !== null && organization.lng !== null,
        )
        .map((organization) => ({
          ...organization,
          distance: haversineKm(
            center[0],
            center[1],
            organization.lat as number,
            organization.lng as number,
          ),
        }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 4),
    [center, organizations],
  );

  return (
    <Card className="p-4 md:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f2f5f1] text-ink">
            <MapPinned className="h-[18px] w-[18px]" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-ink">Mitra di sekitar</h2>
            <p className="text-[11px] text-muted">
              {loading ? 'Memuat mitra…' : `${organizations.length} mitra di peta`}
            </p>
          </div>
        </div>
        <a
          href="#peta-mitra"
          className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-semibold text-brand-700 transition-colors hover:bg-brand-50"
        >
          Lihat peta
        </a>
      </div>

      <div className="mt-3">
        {loading && (
          <div className="space-y-3 py-1">
            {[0, 1, 2].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-2.5 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && partners.length === 0 && (
          <EmptyState
            icon={MapPin}
            title="Belum ada mitra di peta"
            description="Mitra terverifikasi yang memiliki lokasi akan tampil di sini."
            compact
          />
        )}

        {!loading && partners.length > 0 && (
          <div className="-mx-1">
            {partners.map((partner) => {
              const Icon = TYPE_ICONS[partner.tipe] ?? MapPin;
              const url = mapsUrl(partner.lat, partner.lng, partner.alamat);
              return (
                <a
                  key={partner.id}
                  href={url ?? '#'}
                  target={url ? '_blank' : undefined}
                  rel="noreferrer"
                  className="group flex items-center gap-3 rounded-2xl px-1 py-2.5 transition-colors hover:bg-[#fafcf9]"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-ink">
                      {partner.nama}
                    </span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted">
                      <Badge
                        tone="neutral"
                        className="px-1.5 py-0.5 text-[9px]"
                      >
                        {ORG_TYPE_SHORT_LABELS[partner.tipe]}
                      </Badge>
                      <span className="truncate">
                        {partner.kota ?? partner.provinsi ?? 'Lokasi mitra'}
                      </span>
                      <span className="shrink-0 text-muted/50">·</span>
                      <span className="shrink-0 font-medium text-brand-700">
                        {formatDistance(partner.distance)}
                      </span>
                    </span>
                  </span>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-black/15 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-600" />
                </a>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}

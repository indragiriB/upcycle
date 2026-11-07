import { CalendarClock, CheckCircle2, MapPin, MessageCircle, Truck } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  PICKUP_STATUS_LABELS,
  PICKUP_STATUS_TONES,
  PICKUP_TYPE_LABELS,
  statusLabel,
  statusTone,
} from '@/lib/status';
import { formatDateTime, mapsUrl, whatsappUrl } from '@/lib/utils';
import type { PickupRecord } from '@/types/database';

export function PickupList({
  pickups,
  viewer,
  onComplete,
  pendingId,
}: {
  pickups: PickupRecord[];
  viewer: 'bsi' | 'bsu' | 'pengepul';
  onComplete?: (pickup: PickupRecord) => void;
  pendingId?: string | null;
}) {
  const canViewerComplete = (pickup: PickupRecord) => {
    if (viewer === 'bsi') return true;
    if (viewer === 'bsu') return pickup.tipe === 'bsi_ke_bsu';
    return pickup.tipe === 'pengepul_ke_bsi';
  };
  if (pickups.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-black/10 bg-[#fafbf8] px-4 py-3 text-[10px] leading-4 text-muted">
        Belum ada jadwal pengambilan.
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      {pickups.map((pickup) => {
        const canComplete =
          Boolean(onComplete) &&
          (pickup.status === 'dijadwalkan' ||
            pickup.status === 'dalam_perjalanan') &&
          canViewerComplete(pickup);
        const target =
          pickup.tipe === 'bsi_ke_bsu'
            ? viewer === 'bsu'
              ? pickup.bsi?.nama
                ? `Diambil BSI ${pickup.bsi.nama}`
                : 'Diambil BSI'
              : pickup.bsu?.nama
                ? `BSU ${pickup.bsu.nama}`
                : 'BSU asal'
            : pickup.bsi?.nama
              ? `Di ${pickup.bsi.nama}`
              : 'Di BSI';

        const contactParty =
          pickup.tipe === 'bsi_ke_bsu'
            ? viewer === 'bsi'
              ? pickup.bsu
              : null
            : viewer === 'pengepul'
              ? pickup.bsi
              : null;
        const address = contactParty
          ? [contactParty.alamat, contactParty.kota]
              .filter((value): value is string => Boolean(value))
              .join(', ')
          : '';
        const mapLink = contactParty
          ? mapsUrl(
              contactParty.lat ?? null,
              contactParty.lng ?? null,
              address || null,
            )
          : null;
        const waLink = contactParty
          ? whatsappUrl(
              contactParty.telepon ?? null,
              viewer === 'bsi'
                ? 'Halo, saya dari BSI terkait jadwal pengambilan stok.'
                : 'Halo, saya dari pengepul terkait jadwal pengambilan pesanan.',
            )
          : null;

        return (
          <div
            key={pickup.id}
            className="rounded-2xl bg-[#f8faf7] px-3.5 py-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-[10px] font-bold text-ink">
                  <Truck className="h-3 w-3 text-brand-700" />
                  {PICKUP_TYPE_LABELS[pickup.tipe] ?? pickup.tipe}
                </p>
                <p className="mt-0.5 text-[9px] text-muted">
                  {target}
                  {pickup.order?.nomor ? ` · ${pickup.order.nomor}` : ''}
                  {' · '}
                  <CalendarClock className="inline h-2.5 w-2.5" />{' '}
                  {formatDateTime(pickup.jadwal)}
                </p>
                {contactParty && (address || mapLink || waLink) && (
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] text-muted">
                    {address && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-2.5 w-2.5" />
                        {address}
                      </span>
                    )}
                    {mapLink && (
                      <a
                        href={mapLink}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-brand-700 hover:text-brand-800"
                      >
                        Peta
                      </a>
                    )}
                    {waLink && (
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:text-brand-800"
                      >
                        <MessageCircle className="h-2.5 w-2.5" />
                        WhatsApp
                      </a>
                    )}
                  </p>
                )}
              </div>
              <Badge
                tone={statusTone(pickup.status, PICKUP_STATUS_TONES)}
                className="px-2 py-0.5 text-[8px]"
              >
                {statusLabel(pickup.status, PICKUP_STATUS_LABELS)}
              </Badge>
            </div>

            {pickup.status === 'selesai' && pickup.selesai_at && (
              <p className="mt-1.5 text-[9px] text-muted">
                Selesai {formatDateTime(pickup.selesai_at)}
              </p>
            )}

            {canComplete && (
              <div className="mt-2 flex justify-end border-t border-black/[0.04] pt-2">
                <Button
                  size="sm"
                  variant="soft"
                  loading={pendingId === pickup.id}
                  onClick={() => onComplete?.(pickup)}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Tandai selesai
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

import { Recycle } from 'lucide-react';
import { formatCurrency, formatWeight, toNumber } from '@/lib/utils';
import type { OrderItemRecord } from '@/types/database';

export function OrderItemsTable({
  items,
  subtotal,
  total,
}: {
  items: OrderItemRecord[];
  subtotal: number;
  total: number;
}) {
  if (items.length === 0) {
    return (
      <p className="rounded-2xl bg-[#f8faf7] px-4 py-3 text-[11px] text-muted">
        Rincian item belum tersedia.
      </p>
    );
  }

  return (
    <div>
      <div className="space-y-1.5">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 rounded-2xl bg-[#f8faf7] px-3.5 py-2.5"
          >
            <span
              aria-hidden="true"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-white"
              style={{ backgroundColor: item.waste_types?.warna ?? '#22C55E' }}
            >
              <Recycle className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-bold text-ink">
                {item.waste_types?.nama ?? 'Jenis sampah'}
              </p>
              <p className="mt-0.5 text-[9px] text-muted">
                {formatWeight(toNumber(item.berat_kg))} ×{' '}
                {formatCurrency(toNumber(item.harga_per_kg))}/kg
              </p>
            </div>
            <p className="shrink-0 text-[11px] font-extrabold text-ink">
              {formatCurrency(toNumber(item.subtotal))}
            </p>
          </div>
        ))}
      </div>

      <dl className="mt-3 divide-y divide-black/[0.05]">
        <div className="flex items-center justify-between gap-3 py-2">
          <dt className="text-[10px] text-muted">Subtotal item</dt>
          <dd className="text-[11px] font-semibold text-ink">
            {formatCurrency(toNumber(subtotal))}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3 py-2.5">
          <dt className="text-[11px] font-bold text-ink">
            Total pesanan
            <span className="ml-1.5 text-[9px] font-normal text-muted">
              dibulatkan Rp100
            </span>
          </dt>
          <dd className="text-sm font-extrabold tracking-tight text-brand-800">
            {formatCurrency(toNumber(total))}
          </dd>
        </div>
      </dl>
    </div>
  );
}

import { Scale } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatCurrency, formatNumber, toNumber } from '@/lib/utils';
import type { DepositRecord } from '@/types/database';

export function DepositItemsTable({ deposit }: { deposit: DepositRecord }) {
  const items = deposit.deposit_items ?? [];

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Scale}
        title="Belum ada hasil timbang"
        description="Rincian item, berat final, dan harga akan muncul setelah BSU menyelesaikan penimbangan."
        compact
      />
    );
  }

  const rawTotal = items.reduce(
    (total, item) => total + toNumber(item.subtotal),
    0,
  );

  return (
    <div className="space-y-3">
      <div className="-mx-1 overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-[11px]">
          <thead>
            <tr className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted">
              <th className="px-2 py-2 font-bold">Jenis sampah</th>
              <th className="px-2 py-2 text-right font-bold">Berat</th>
              <th className="px-2 py-2 text-right font-bold">Harga/kg</th>
              <th className="px-2 py-2 text-right font-bold">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[0.05]">
            {items.map((item) => {
              const waste = item.waste_types;
              return (
                <tr key={item.id} className="align-top">
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: waste?.warna ?? '#22C55E' }}
                      />
                      <div>
                        <p className="font-semibold text-ink">
                          {waste?.nama ?? 'Jenis sampah'}
                        </p>
                        {item.alasan_penyesuaian && (
                          <p className="mt-0.5 max-w-[220px] text-[9px] leading-4 text-amber-700">
                            Penyesuaian: {item.alasan_penyesuaian}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-3 text-right font-semibold text-ink">
                    {formatNumber(toNumber(item.berat_final_kg), 2)} kg
                  </td>
                  <td className="px-2 py-3 text-right text-muted">
                    {formatCurrency(toNumber(item.harga_per_kg))}
                    {toNumber(item.harga_per_kg) !==
                      toNumber(item.harga_acuan_per_kg) && (
                      <span className="block text-[9px] text-amber-700">
                        acuan{' '}
                        {formatCurrency(toNumber(item.harga_acuan_per_kg))}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-3 text-right font-bold text-ink">
                    {formatCurrency(toNumber(item.subtotal))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="rounded-2xl bg-[#f8faf7] px-4 py-3">
        <dl className="space-y-1.5 text-[11px]">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted">Subtotal timbangan</dt>
            <dd className="font-semibold text-ink">
              {formatCurrency(rawTotal)}
            </dd>
          </div>
          {toNumber(deposit.potongan) > 0 && (
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">
                Potongan
                {deposit.alasan_potongan
                  ? ` · ${deposit.alasan_potongan}`
                  : ''}
              </dt>
              <dd className="font-semibold text-red-600">
                −{formatCurrency(toNumber(deposit.potongan))}
              </dd>
            </div>
          )}
          <div className="flex items-center justify-between gap-3 border-t border-black/[0.06] pt-2">
            <dt className="font-bold text-ink">Total dibayarkan</dt>
            <dd className="text-[15px] font-extrabold tracking-tight text-brand-800">
              {formatCurrency(toNumber(deposit.total))}
            </dd>
          </div>
        </dl>
        <p className="mt-1.5 text-[9px] leading-4 text-muted">
          Total dibulatkan ke Rp100 terdekat sesuai aturan pembayaran BSU.
        </p>
      </div>
    </div>
  );
}

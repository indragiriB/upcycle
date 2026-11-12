import { BadgeCheck, Package, ShoppingBag, Store } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PRODUCT_CONDITION_LABELS } from '@/lib/products';
import { formatCurrency } from '@/lib/utils';
import type { ProductRecord } from '@/types/database';

export function ProductCard({
  product,
  canBuy,
  isOwner = false,
  onBuy,
}: {
  product: ProductRecord;
  canBuy: boolean;
  /** Produk milik pengguna yang sedang melihat; tidak boleh dibeli sendiri. */
  isOwner?: boolean;
  onBuy?: (product: ProductRecord) => void;
}) {
  const image = product.foto_urls[0] ?? null;
  const sellerName = product.org?.nama ?? product.penjual?.nama ?? 'Penjual';
  const sellerLabel = product.org ? 'Industri' : 'Warga';
  const soldOut = product.stok <= 0;

  return (
    <article className="group flex flex-col overflow-hidden rounded-[22px] border border-black/[0.05] bg-white shadow-[0_1px_2px_rgba(17,21,17,0.02)] transition-shadow hover:shadow-card">
      <div className="relative aspect-[4/3] overflow-hidden bg-[#eef3ec]">
        {image ? (
          <img
            src={image}
            alt={product.nama}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-3xl border border-brand-900/10 bg-white/70 text-brand-700">
              <Package className="h-7 w-7" />
            </span>
          </div>
        )}

        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <Badge tone="white" className="px-2.5 py-1 text-[10px]">
            {product.kategori || 'Lainnya'}
          </Badge>
          <Badge
            tone={product.kondisi === 'upcycle' ? 'green' : 'neutral'}
            className="px-2.5 py-1 text-[10px]"
          >
            {PRODUCT_CONDITION_LABELS[product.kondisi]}
          </Badge>
          {soldOut && (
            <Badge tone="red" className="px-2.5 py-1 text-[10px]">
              Stok habis
            </Badge>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 text-sm font-extrabold leading-snug text-ink">
          {product.nama}
        </h3>

        <p className="mt-1.5 flex items-center gap-1.5 text-[10px] font-medium text-muted">
          {product.org ? (
            <BadgeCheck className="h-3 w-3 text-brand-600" />
          ) : (
            <Store className="h-3 w-3" />
          )}
          <span className="truncate">
            {sellerName} · {sellerLabel}
          </span>
        </p>

        {product.deskripsi && (
          <p className="mt-2 line-clamp-2 text-[10px] leading-4 text-muted">
            {product.deskripsi}
          </p>
        )}

        <div className="mt-auto flex items-end justify-between gap-3 pt-3">
          <div>
            <p className="text-[15px] font-extrabold tracking-tight text-brand-800">
              {formatCurrency(product.harga)}
              <span className="text-[9px] font-medium text-muted">
                /{product.satuan}
              </span>
            </p>
            <p className="mt-0.5 text-[9px] text-muted">
              Sisa {product.stok} {product.satuan}
            </p>
          </div>

          {isOwner ? (
            <Badge tone="neutral" className="px-2.5 py-1 text-[9px]">
              Produk Anda
            </Badge>
          ) : canBuy ? (
            <Button
              size="sm"
              disabled={soldOut}
              onClick={() => onBuy?.(product)}
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              Beli
            </Button>
          ) : (
            <Badge tone="neutral" className="px-2.5 py-1 text-[9px]">
              Khusus warga
            </Badge>
          )}
        </div>
      </div>
    </article>
  );
}

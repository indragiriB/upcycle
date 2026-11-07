import { Badge } from '@/components/ui/Badge';
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TONES,
  statusLabel,
  statusTone,
} from '@/lib/status';
import type { OrderStatus } from '@/types/database';

export function OrderStatusBadge({
  status,
  className,
}: {
  status: OrderStatus;
  className?: string;
}) {
  return (
    <Badge
      tone={statusTone(status, ORDER_STATUS_TONES)}
      className={className}
      dot
    >
      {statusLabel(status, ORDER_STATUS_LABELS)}
    </Badge>
  );
}

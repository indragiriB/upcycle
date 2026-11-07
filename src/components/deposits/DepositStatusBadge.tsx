import { Badge } from '@/components/ui/Badge';
import {
  DEPOSIT_STATUS_LABELS,
  DEPOSIT_STATUS_TONES,
  statusLabel,
  statusTone,
} from '@/lib/status';
import { cn } from '@/lib/utils';

export function DepositStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return (
    <Badge
      tone={statusTone(status, DEPOSIT_STATUS_TONES)}
      dot
      className={cn(className)}
    >
      {statusLabel(status, DEPOSIT_STATUS_LABELS)}
    </Badge>
  );
}

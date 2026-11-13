import { Badge } from '@/components/ui/Badge';
import {
  DEPOSIT_STAGE_LABELS,
  DEPOSIT_STAGE_TONES,
  DEPOSIT_STATUS_LABELS,
  DEPOSIT_STATUS_TONES,
  depositStage,
  statusLabel,
  statusTone,
} from '@/lib/status';
import { cn } from '@/lib/utils';

export function DepositStatusBadge({
  status,
  simplified = false,
  className,
}: {
  status: string;
  /** Tampilkan tiga tahap warga, bukan status internal 9 tahap. */
  simplified?: boolean;
  className?: string;
}) {
  if (simplified) {
    const stage = depositStage(status);
    return (
      <Badge
        tone={DEPOSIT_STAGE_TONES[stage]}
        dot
        className={cn(className)}
      >
        {DEPOSIT_STAGE_LABELS[stage]}
      </Badge>
    );
  }

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

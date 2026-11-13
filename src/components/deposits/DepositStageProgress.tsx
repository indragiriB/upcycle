import { Check, Recycle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DEPOSIT_STAGE_HINTS,
  DEPOSIT_STAGE_LABELS,
  DEPOSIT_STAGE_TONES,
  depositStage,
  type DepositStage,
} from '@/lib/status';
import { Badge } from '@/components/ui/Badge';

const STEPS: DepositStage[] = ['diajukan', 'ditimbang', 'selesai'];

export function DepositStageProgress({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const current = depositStage(status);
  const currentIndex = STEPS.indexOf(current);

  return (
    <div
      className={cn(
        'rounded-[22px] border border-black/[0.05] bg-white p-4 shadow-[0_1px_2px_rgba(17,21,17,0.02)] md:p-5',
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <Recycle className="h-[18px] w-[18px]" />
          </span>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted">
              Tahap setoran
            </p>
            <p className="text-sm font-bold text-ink">
              {DEPOSIT_STAGE_LABELS[current]}
            </p>
          </div>
        </div>
        <Badge tone={DEPOSIT_STAGE_TONES[current]} dot>
          {DEPOSIT_STAGE_LABELS[current]}
        </Badge>
      </div>

      <ol className="mt-4 grid grid-cols-3 gap-2.5">
        {STEPS.map((step, index) => {
          const reached = index <= currentIndex;
          return (
            <li key={step}>
              <div
                aria-hidden="true"
                className={cn(
                  'h-1.5 rounded-full transition-colors',
                  reached ? 'bg-brand-500' : 'bg-black/[0.07]',
                )}
              />
              <div className="mt-2 flex items-center gap-1.5">
                <span
                  className={cn(
                    'flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[8px] font-bold',
                    reached
                      ? 'bg-brand-600 text-white'
                      : 'bg-[#eef1ec] text-muted',
                  )}
                >
                  {index < currentIndex ? (
                    <Check className="h-2.5 w-2.5" />
                  ) : (
                    index + 1
                  )}
                </span>
                <span
                  className={cn(
                    'truncate text-[10px] font-semibold',
                    index === currentIndex
                      ? 'text-brand-800'
                      : reached
                        ? 'text-ink'
                        : 'text-muted',
                  )}
                >
                  {DEPOSIT_STAGE_LABELS[step]}
                </span>
              </div>
            </li>
          );
        })}
      </ol>

      <p className="mt-3 text-[10px] leading-4 text-muted">
        {DEPOSIT_STAGE_HINTS[current]}
      </p>
    </div>
  );
}

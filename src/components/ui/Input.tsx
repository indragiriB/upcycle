import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import { AlertCircle, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  icon?: LucideIcon;
  trailing?: ReactNode;
  labelAction?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    hint,
    error,
    icon: Icon,
    trailing,
    labelAction,
    className,
    id,
    ...props
  },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const descriptionId = `${inputId}-description`;

  return (
    <div className="w-full">
      {(label || labelAction) && (
        <div className="mb-2 flex items-center justify-between gap-3">
          {label && (
            <label htmlFor={inputId} className="text-[13px] font-semibold text-ink">
              {label}
            </label>
          )}
          {labelAction}
        </div>
      )}
      <div
        className={cn(
          'group flex h-12 items-center gap-3 rounded-2xl border bg-[#f7f9f6] px-4 transition-colors focus-within:border-brand-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-brand-500/10',
          error ? 'border-red-300' : 'border-black/[0.07]',
          props.disabled && 'opacity-60',
        )}
      >
        {Icon && (
          <Icon
            aria-hidden="true"
            className={cn(
              'h-[18px] w-[18px] shrink-0 transition-colors',
              error ? 'text-red-500' : 'text-muted group-focus-within:text-brand-600',
            )}
          />
        )}
        <input
          id={inputId}
          ref={ref}
          aria-invalid={Boolean(error)}
          aria-describedby={hint || error ? descriptionId : undefined}
          className={cn(
            'h-full min-w-0 flex-1 bg-transparent text-sm font-medium text-ink outline-none placeholder:font-normal placeholder:text-muted/70',
            className,
          )}
          {...props}
        />
        {trailing}
      </div>
      {(error || hint) && (
        <p
          id={descriptionId}
          className={cn(
            'mt-2 flex items-start gap-1.5 text-xs leading-5',
            error ? 'text-red-600' : 'text-muted',
          )}
        >
          {error && <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
          {error || hint}
        </p>
      )}
    </div>
  );
});

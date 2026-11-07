import {
  forwardRef,
  useId,
  type TextareaHTMLAttributes,
} from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea(
    { label, hint, error, className, id, ...props },
    ref,
  ) {
    const generatedId = useId();
    const textareaId = id ?? generatedId;
    const descriptionId = `${textareaId}-description`;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="mb-2 block text-[13px] font-semibold text-ink"
          >
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          aria-invalid={Boolean(error)}
          aria-describedby={hint || error ? descriptionId : undefined}
          className={cn(
            'min-h-[96px] w-full resize-y rounded-2xl border bg-[#f7f9f6] px-4 py-3 text-sm font-medium text-ink outline-none transition-colors placeholder:font-normal placeholder:text-muted/70 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10',
            error ? 'border-red-300' : 'border-black/[0.07]',
            props.disabled && 'opacity-60',
            className,
          )}
          {...props}
        />
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
  },
);

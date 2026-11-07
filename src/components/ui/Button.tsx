import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/Spinner';

type Variant = 'primary' | 'secondary' | 'soft' | 'ghost' | 'danger' | 'dark';
type Size = 'sm' | 'md' | 'lg' | 'icon';

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-brand-600 text-white shadow-[0_8px_24px_-10px_rgba(22,163,74,0.75)] hover:bg-brand-700 active:bg-brand-700',
  secondary:
    'border border-black/8 bg-white text-ink shadow-[0_1px_2px_rgba(15,23,18,0.04)] hover:border-black/15 hover:bg-[#fafcf9]',
  soft: 'bg-brand-50 text-brand-800 hover:bg-brand-100',
  ghost: 'text-muted hover:bg-black/[0.045] hover:text-ink',
  danger: 'bg-red-50 text-red-700 hover:bg-red-100',
  dark: 'bg-ink text-white hover:bg-[#243026]',
};

const sizeClasses: Record<Size, string> = {
  sm: 'h-9 gap-2 px-3.5 text-[13px]',
  md: 'h-11 gap-2 px-5 text-sm',
  lg: 'h-13 gap-2.5 px-6 text-[15px]',
  icon: 'h-11 w-11',
};

export function buttonStyles({
  variant = 'primary',
  size = 'md',
  className,
}: {
  variant?: Variant;
  size?: Size;
  className?: string;
} = {}) {
  return cn(
    'inline-flex shrink-0 items-center justify-center rounded-full font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/25 disabled:pointer-events-none disabled:opacity-50',
    variantClasses[variant],
    sizeClasses[size],
    className,
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    children,
    className,
    variant = 'primary',
    size = 'md',
    loading = false,
    leftIcon,
    rightIcon,
    disabled,
    type = 'button',
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={buttonStyles({ variant, size, className })}
      {...props}
    >
      {loading ? <Spinner className="h-4 w-4" /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
});

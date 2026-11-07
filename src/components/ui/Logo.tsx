import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  imageClassName?: string;
  to?: string;
}

export function Logo({ className, imageClassName, to = '/dashboard' }: LogoProps) {
  const image = (
    <img
      src="/upcycle-logo.svg"
      alt="Upcycle"
      className={cn('h-10 w-auto', imageClassName)}
    />
  );

  if (!to) return <div className={className}>{image}</div>;

  return (
    <Link
      to={to}
      aria-label="UPCYCLE — ke dashboard"
      className={cn('inline-flex shrink-0 items-center rounded-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200', className)}
    >
      {image}
    </Link>
  );
}

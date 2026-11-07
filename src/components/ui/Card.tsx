import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-[24px] border border-black/[0.04] bg-white shadow-card',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

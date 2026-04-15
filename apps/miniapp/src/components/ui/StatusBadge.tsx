'use client';

import { cn } from '@/lib/utils';

type StatusVariant = 'success' | 'warning' | 'error' | 'pending' | 'info' | 'neutral';

const variantStyles: Record<StatusVariant, string> = {
  success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  warning: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  error: 'bg-red-500/15 text-red-400 border-red-500/25',
  pending: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  info: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/25',
  neutral: 'bg-white/5 text-slate-400 border-white/10',
};

interface StatusBadgeProps {
  label: string;
  variant?: StatusVariant;
  className?: string;
  dot?: boolean;
}

export function StatusBadge({ label, variant = 'neutral', className, dot = false }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
        variantStyles[variant],
        className,
      )}
    >
      {dot && (
        <span className={cn('w-1.5 h-1.5 rounded-full', {
          'bg-emerald-400': variant === 'success',
          'bg-amber-400': variant === 'warning',
          'bg-red-400': variant === 'error',
          'bg-blue-400': variant === 'pending',
          'bg-indigo-400': variant === 'info',
          'bg-slate-400': variant === 'neutral',
        })} />
      )}
      {label}
    </span>
  );
}

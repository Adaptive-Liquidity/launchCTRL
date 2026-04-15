'use client';

import type { ExecutionMode } from '@launchctrl/types';
import { cn } from '@/lib/utils';
import { Zap, MousePointer, Copy, AlertCircle } from 'lucide-react';

const MODE_CONFIG: Record<ExecutionMode, {
  label: string;
  bg: string;
  text: string;
  icon: React.ComponentType<{ size?: number }>;
  description: string;
}> = {
  AUTO: {
    label: 'AUTO',
    bg: 'bg-emerald-500/15 border-emerald-500/25',
    text: 'text-emerald-400',
    icon: Zap,
    description: 'Executed automatically',
  },
  ONE_CLICK: {
    label: 'ONE CLICK',
    bg: 'bg-blue-500/15 border-blue-500/25',
    text: 'text-blue-400',
    icon: MousePointer,
    description: 'One click to execute',
  },
  COPY_PASTE: {
    label: 'COPY PASTE',
    bg: 'bg-amber-500/15 border-amber-500/25',
    text: 'text-amber-400',
    icon: Copy,
    description: 'Copy and paste command',
  },
  MANUAL_CONFIRMATION_REQUIRED: {
    label: 'MANUAL',
    bg: 'bg-slate-500/15 border-slate-500/25',
    text: 'text-slate-400',
    icon: AlertCircle,
    description: 'Manual action required',
  },
};

interface ExecutionModeTagProps {
  mode: ExecutionMode;
  className?: string;
  showDescription?: boolean;
}

export function ExecutionModeTag({ mode, className, showDescription }: ExecutionModeTagProps) {
  const config = MODE_CONFIG[mode];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border',
        config.bg,
        config.text,
        className,
      )}
      title={config.description}
    >
      <Icon size={10} />
      {config.label}
    </span>
  );
}

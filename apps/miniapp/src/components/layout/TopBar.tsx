'use client';

import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { haptic } from '@/lib/telegram';
import { cn } from '@/lib/utils';

interface TopBarProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  className?: string;
}

export function TopBar({ title, showBack, onBack, rightAction, className }: TopBarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-obsidian-950/80 backdrop-blur-glass z-10',
        className,
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        {showBack && (
          <button
            onClick={() => {
              haptic('light');
              onBack?.();
            }}
            className="p-1.5 -ml-1.5 rounded-xl glass-hover text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
        )}
        {title && (
          <h1 className="text-sm font-semibold text-slate-100 truncate">{title}</h1>
        )}
      </div>
      {rightAction && <div className="flex items-center">{rightAction}</div>}
    </motion.div>
  );
}

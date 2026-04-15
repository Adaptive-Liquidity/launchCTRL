'use client';

import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptic } from '@/lib/telegram';

interface WorkspaceCardProps {
  workspace: {
    id: string;
    name: string;
    description?: string | null;
    role?: string;
  };
  onClick: () => void;
  delay?: number;
  isActive?: boolean;
}

export function WorkspaceCard({ workspace, onClick, delay = 0, isActive }: WorkspaceCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
      onClick={() => {
        haptic('light');
        onClick();
      }}
      className={cn(
        'glass rounded-2xl p-4 cursor-pointer active:scale-[0.98] transition-all duration-150',
        isActive ? 'border-indigo-500/30 shadow-accent' : 'glass-hover',
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold',
            isActive ? 'bg-accent-gradient text-white' : 'bg-white/5 text-slate-400',
          )}>
            {workspace.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-100 truncate">{workspace.name}</div>
            {workspace.description && (
              <div className="text-xs text-slate-500 truncate mt-0.5">{workspace.description}</div>
            )}
            {workspace.role && (
              <div className="text-[10px] text-indigo-400 font-medium mt-1 uppercase tracking-wide">{workspace.role}</div>
            )}
          </div>
        </div>
        <ChevronRight size={16} className="text-slate-600 flex-shrink-0" />
      </div>
    </motion.div>
  );
}

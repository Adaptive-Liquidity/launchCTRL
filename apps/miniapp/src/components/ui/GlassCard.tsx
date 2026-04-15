'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  animate?: boolean;
  delay?: number;
  hoverable?: boolean;
}

export function GlassCard({
  children,
  className,
  onClick,
  animate = true,
  delay = 0,
  hoverable = false,
}: GlassCardProps) {
  const base = (
    <div
      onClick={onClick}
      className={cn(
        'glass rounded-2xl p-4',
        hoverable && 'glass-hover cursor-pointer active:scale-[0.98] transition-transform duration-150',
        onClick && 'cursor-pointer',
        className,
      )}
    >
      {children}
    </div>
  );

  if (!animate) return base;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
      onClick={onClick}
      className={cn(
        'glass rounded-2xl p-4',
        hoverable && 'glass-hover cursor-pointer active:scale-[0.98] transition-transform duration-150',
        className,
      )}
    >
      {children}
    </motion.div>
  );
}

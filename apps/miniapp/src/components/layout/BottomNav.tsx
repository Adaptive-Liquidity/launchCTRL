'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Zap, BookOpen, History, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptic } from '@/lib/telegram';

const NAV_ITEMS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { href: '/runs', icon: Zap, label: 'Runs' },
  { href: '/skills', icon: BookOpen, label: 'Skills' },
  { href: '/audit', icon: History, label: 'History' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <motion.nav
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="flex items-center justify-around px-2 py-2 border-t border-white/[0.06] bg-obsidian-950/90 backdrop-blur-glass safe-bottom"
    >
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => haptic('light')}
            className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all duration-200"
          >
            <div
              className={cn(
                'p-1.5 rounded-lg transition-all duration-200',
                isActive
                  ? 'bg-indigo-500/20 text-indigo-400'
                  : 'text-slate-600 hover:text-slate-400',
              )}
            >
              <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
            </div>
            <span
              className={cn(
                'text-[10px] font-medium transition-colors duration-200',
                isActive ? 'text-indigo-400' : 'text-slate-600',
              )}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </motion.nav>
  );
}

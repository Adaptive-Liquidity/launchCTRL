'use client';

import { useEffect } from 'react';
import { initTelegramApp } from '@/lib/telegram';
import { BottomNav } from './BottomNav';
import { TopBar } from './TopBar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

interface AppShellProps {
  children: React.ReactNode;
  showNav?: boolean;
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

export function AppShell({
  children,
  showNav = true,
  title,
  showBack = false,
  onBack,
  rightAction,
}: AppShellProps) {
  useEffect(() => {
    initTelegramApp();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex flex-col h-full bg-obsidian-950 safe-top">
        {(title || showBack || rightAction) && (
          <TopBar title={title} showBack={showBack} onBack={onBack} rightAction={rightAction} />
        )}
        <main className="flex-1 overflow-y-auto no-scrollbar">
          {children}
        </main>
        {showNav && <BottomNav />}
      </div>
    </QueryClientProvider>
  );
}

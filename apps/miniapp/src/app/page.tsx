'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTelegram } from '@/hooks/useTelegram';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { api } from '@/lib/api';
import { OnboardingSplash } from '@/components/onboarding/OnboardingSplash';
import { motion } from 'framer-motion';

export default function RootPage() {
  const router = useRouter();
  const { isReady, user, initData } = useTelegram();
  const { token, setToken, setUser } = useWorkspaceStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSplash, setShowSplash] = useState(false);

  useEffect(() => {
    if (!isReady) return;

    if (token) {
      router.push('/dashboard');
      return;
    }

    if (initData) {
      // Auto-authenticate
      handleAuth();
    } else {
      // Development mode / no Telegram context
      setShowSplash(true);
    }
  }, [isReady, initData, token]);

  const handleAuth = async () => {
    if (!initData) {
      setError('No Telegram session data available. Open this app inside Telegram.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await api.auth.telegram(initData);
      if (result.success) {
        setToken(result.data.token);
        setUser({
          id: result.data.user.id,
          telegramFirstName: result.data.user.telegramFirstName,
          telegramUsername: result.data.user.telegramUsername,
        });
        router.push('/dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
      setShowSplash(true);
    } finally {
      setLoading(false);
    }
  };

  if (!isReady || loading) {
    return (
      <div className="flex items-center justify-center h-full bg-obsidian-950">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-16 h-16 rounded-2xl bg-accent-gradient flex items-center justify-center shadow-accent">
            <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
              <path d="M14 20L18 24L26 16" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        </motion.div>
      </div>
    );
  }

  if (showSplash) {
    return (
      <OnboardingSplash
        userName={user?.first_name}
        onContinue={handleAuth}
      />
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-obsidian-950 px-6 text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <h2 className="text-base font-semibold text-slate-200 mb-2">Authentication Failed</h2>
        <p className="text-sm text-slate-500 mb-6">{error}</p>
        <button
          onClick={handleAuth}
          className="px-6 py-3 rounded-2xl bg-accent-gradient text-white text-sm font-semibold"
        >
          Try Again
        </button>
      </div>
    );
  }

  return null;
}

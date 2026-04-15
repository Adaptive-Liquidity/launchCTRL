'use client';

import { useEffect, useState } from 'react';
import { getTelegramWebApp, getTelegramUser, isTelegramWebApp, initTelegramApp, type TelegramWebAppUser } from '@/lib/telegram';

export function useTelegram() {
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState<TelegramWebAppUser | null>(null);
  const [initData, setInitData] = useState<string>('');

  useEffect(() => {
    const twa = getTelegramWebApp();
    if (twa) {
      initTelegramApp();
      setUser(getTelegramUser());
      setInitData(twa.initData);
    }
    setIsReady(true);
  }, []);

  return {
    isReady,
    isTelegramApp: isTelegramWebApp(),
    user,
    initData,
    webApp: getTelegramWebApp(),
  };
}

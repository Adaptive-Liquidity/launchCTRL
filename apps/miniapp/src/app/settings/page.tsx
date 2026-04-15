'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { LogOut, Shield, Beaker, ChevronRight, User } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { api } from '@/lib/api';
import { haptic } from '@/lib/telegram';

export default function SettingsPage() {
  const router = useRouter();
  const { token, user, setToken, setUser } = useWorkspaceStore();

  const handleLogout = async () => {
    haptic('medium');
    if (token) {
      await api.auth.logout(token).catch(() => {});
    }
    setToken(null);
    setUser(null);
    router.push('/');
  };

  const settingsGroups = [
    {
      title: 'Account',
      items: [
        {
          icon: User,
          label: user?.telegramFirstName ?? 'Profile',
          sublabel: user?.telegramUsername ? `@${user.telegramUsername}` : undefined,
          action: undefined as (() => void) | undefined,
        },
      ],
    },
    {
      title: 'Security',
      items: [
        {
          icon: Shield,
          label: 'Security & Privacy',
          sublabel: 'View trust boundaries and data policy',
          action: undefined as (() => void) | undefined,
        },
      ],
    },
    {
      title: 'Labs',
      items: [
        {
          icon: Beaker,
          label: 'WILD Phase',
          sublabel: 'Experimental features — not enabled',
          action: () => router.push('/labs'),
        },
      ],
    },
  ];

  return (
    <AppShell title="Settings">
      <div className="px-4 pt-4 pb-24 space-y-6">
        {settingsGroups.map(({ title, items }) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">{title}</div>
            <div className="glass rounded-2xl overflow-hidden divide-y divide-white/[0.06]">
              {items.map(({ icon: Icon, label, sublabel, action }) => (
                <button
                  key={label}
                  onClick={() => { haptic('light'); action?.(); }}
                  disabled={!action}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-white/[0.04] transition-colors disabled:opacity-60"
                >
                  <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                    <Icon size={15} className="text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-200">{label}</div>
                    {sublabel && <div className="text-xs text-slate-500 mt-0.5">{sublabel}</div>}
                  </div>
                  {action && <ChevronRight size={15} className="text-slate-600" />}
                </button>
              ))}
            </div>
          </motion.div>
        ))}

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl glass border border-red-500/20 text-red-400 text-sm font-semibold active:scale-[0.97] transition-transform"
        >
          <LogOut size={16} />
          Sign Out
        </motion.button>

        <div className="text-center text-[10px] text-slate-700 pb-4">
          LaunchCtrl v0.1.0 — SHARP Release
        </div>
      </div>
    </AppShell>
  );
}

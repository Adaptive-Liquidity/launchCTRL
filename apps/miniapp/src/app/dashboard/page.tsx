'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Plus, Zap, BookOpen, ArrowRight, Users } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { WorkspaceCard } from '@/components/workspace/WorkspaceCard';
import { SkeletonList } from '@/components/ui/SkeletonCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { api } from '@/lib/api';
import { haptic } from '@/lib/telegram';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

function DashboardContent() {
  const router = useRouter();
  const { token, user, activeWorkspaceId, setActiveWorkspace } = useWorkspaceStore();

  useEffect(() => {
    if (!token) router.push('/');
  }, [token]);

  const { data: workspacesData, isLoading } = useQuery({
    queryKey: ['workspaces'],
    queryFn: () => api.workspaces.list(token!),
    enabled: !!token,
  });

  const workspaces = (workspacesData?.data ?? []) as Array<{
    id: string; name: string; description?: string | null; role?: string;
  }>;

  const headerRight = (
    <button
      onClick={() => { haptic('light'); router.push('/workspace/new'); }}
      className="p-2 rounded-xl glass text-indigo-400 hover:text-indigo-300 transition-colors"
    >
      <Plus size={18} />
    </button>
  );

  return (
    <AppShell
      title="LaunchCtrl"
      rightAction={headerRight}
    >
      <div className="px-4 pt-4 pb-24">
        {/* Welcome */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h2 className="text-xl font-bold text-slate-100">
            {user ? `Hey, ${user.telegramFirstName}` : 'Dashboard'}
          </h2>
          <p className="text-sm text-slate-500 mt-1">Your Telegram launch control plane.</p>
        </motion.div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {[
            { label: 'New Setup', icon: Zap, color: 'text-indigo-400', bg: 'bg-indigo-500/10', href: '/workspace/new' },
            { label: 'Skills', icon: BookOpen, color: 'text-violet-400', bg: 'bg-violet-500/10', href: '/skills' },
          ].map(({ label, icon: Icon, color, bg, href }, i) => (
            <motion.button
              key={label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => { haptic('light'); router.push(href); }}
              className="glass rounded-2xl p-4 flex flex-col gap-3 active:scale-[0.97] transition-transform text-left glass-hover"
            >
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
                <Icon size={18} className={color} />
              </div>
              <span className="text-sm font-semibold text-slate-200">{label}</span>
            </motion.button>
          ))}
        </div>

        {/* Workspaces */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-300">Workspaces</h3>
            <button
              onClick={() => { haptic('light'); router.push('/workspace/new'); }}
              className="text-xs text-indigo-400 font-medium flex items-center gap-1"
            >
              New <Plus size={12} />
            </button>
          </div>

          {isLoading ? (
            <SkeletonList count={2} />
          ) : workspaces.length === 0 ? (
            <EmptyState
              icon={<Users size={24} />}
              title="No workspaces yet"
              description="Create your first workspace to start setting up a community."
              action={
                <button
                  onClick={() => { haptic('medium'); router.push('/workspace/new'); }}
                  className="px-5 py-2.5 rounded-2xl bg-accent-gradient text-white text-sm font-semibold flex items-center gap-2"
                >
                  Create Workspace <ArrowRight size={14} />
                </button>
              }
            />
          ) : (
            <div className="space-y-2.5">
              {workspaces.map((ws, i) => (
                <WorkspaceCard
                  key={ws.id}
                  workspace={ws}
                  isActive={ws.id === activeWorkspaceId}
                  delay={i * 0.08}
                  onClick={() => {
                    setActiveWorkspace(ws.id);
                    router.push(`/workspace/${ws.id}`);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

export default function DashboardPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <DashboardContent />
    </QueryClientProvider>
  );
}

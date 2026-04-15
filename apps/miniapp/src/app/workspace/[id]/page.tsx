'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Zap, Plus, ArrowRight } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { SkeletonList } from '@/components/ui/SkeletonCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { api } from '@/lib/api';
import { haptic } from '@/lib/telegram';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

function WorkspaceContent({ id }: { id: string }) {
  const router = useRouter();
  const { token } = useWorkspaceStore();

  const { data: wsData } = useQuery({
    queryKey: ['workspace', id],
    queryFn: () => api.workspaces.get(token!, id),
    enabled: !!token,
  });

  const { data: entitiesData, isLoading } = useQuery({
    queryKey: ['entities', id],
    queryFn: () => api.workspaces.entities(token!, id),
    enabled: !!token,
  });

  const workspace = wsData?.data as { name: string; description?: string } | undefined;
  const entities = (entitiesData?.data ?? []) as Array<{
    id: string; displayName: string; entityType: string; memberCount?: number;
  }>;

  const entityTypeEmoji: Record<string, string> = {
    group: '💬',
    supergroup: '💬',
    channel: '📣',
    bot: '🤖',
  };

  return (
    <AppShell
      title={workspace?.name ?? 'Workspace'}
      showBack
      onBack={() => router.push('/dashboard')}
      rightAction={
        <button
          onClick={() => { haptic('medium'); router.push(`/workspace/${id}/setup`); }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-500/15 border border-indigo-500/25 text-indigo-400 text-xs font-semibold"
        >
          <Zap size={13} />
          Setup
        </button>
      }
    >
      <div className="px-4 pt-4 pb-24">
        {workspace?.description && (
          <p className="text-sm text-slate-500 mb-5 leading-relaxed">{workspace.description}</p>
        )}

        {/* Entities */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-300">Groups & Channels</h3>
            <button className="text-xs text-indigo-400 font-medium flex items-center gap-1">
              Add <Plus size={12} />
            </button>
          </div>

          {isLoading ? (
            <SkeletonList count={2} />
          ) : entities.length === 0 ? (
            <EmptyState
              icon={<span className="text-2xl">💬</span>}
              title="No entities added"
              description="Add your group or channel to start the setup wizard."
            />
          ) : (
            <div className="space-y-2.5">
              {entities.map((entity, i) => (
                <motion.div
                  key={entity.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="glass rounded-xl p-3.5 flex items-center gap-3"
                >
                  <span className="text-xl">{entityTypeEmoji[entity.entityType] ?? '💬'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-100 truncate">{entity.displayName}</div>
                    <div className="text-xs text-slate-500 capitalize mt-0.5">
                      {entity.entityType}
                      {entity.memberCount !== undefined && entity.memberCount > 0 && ` · ${entity.memberCount.toLocaleString()} members`}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Start setup CTA */}
        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          onClick={() => { haptic('medium'); router.push(`/workspace/${id}/setup`); }}
          className="w-full mt-6 py-4 rounded-2xl bg-accent-gradient text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-accent active:scale-[0.97] transition-transform"
        >
          <Zap size={16} />
          Launch Setup Wizard
          <ArrowRight size={16} />
        </motion.button>
      </div>
    </AppShell>
  );
}

export default function WorkspacePage({ params }: { params: { id: string } }) {
  return (
    <QueryClientProvider client={queryClient}>
      <WorkspaceContent id={params.id} />
    </QueryClientProvider>
  );
}

'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Zap, ChevronRight, CheckCircle, AlertCircle, Clock, Loader2 } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { SkeletonList } from '@/components/ui/SkeletonCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { haptic } from '@/lib/telegram';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; variant: 'success' | 'warning' | 'error' | 'pending' | 'neutral' }> = {
  completed: { icon: <CheckCircle size={14} className="text-emerald-400" />, variant: 'success' },
  failed: { icon: <AlertCircle size={14} className="text-red-400" />, variant: 'error' },
  running: { icon: <Loader2 size={14} className="text-indigo-400 animate-spin" />, variant: 'pending' },
  dry_run: { icon: <Clock size={14} className="text-amber-400" />, variant: 'warning' },
  idle: { icon: <Clock size={14} className="text-slate-400" />, variant: 'neutral' },
};

function RunsContent() {
  const router = useRouter();
  const { token, activeWorkspaceId } = useWorkspaceStore();

  const { data, isLoading } = useQuery({
    queryKey: ['runs', activeWorkspaceId],
    queryFn: () => api.workspaces.runs(token!, activeWorkspaceId!),
    enabled: !!token && !!activeWorkspaceId,
  });

  const runs = (data?.data ?? []) as Array<{
    id: string; status: string; isDryRun: boolean; startedAt: string | null;
    completedAt: string | null; stepResults: unknown[];
  }>;

  return (
    <AppShell title="Execution Runs">
      <div className="px-4 pt-4 pb-24">
        {!activeWorkspaceId ? (
          <EmptyState
            icon={<Zap size={24} />}
            title="No workspace selected"
            description="Select a workspace to view its execution runs."
          />
        ) : isLoading ? (
          <SkeletonList count={3} />
        ) : runs.length === 0 ? (
          <EmptyState
            icon={<Zap size={24} />}
            title="No runs yet"
            description="Execution runs will appear here after you run a setup plan."
          />
        ) : (
          <div className="space-y-2.5">
            {runs.map((run, i) => {
              const config = STATUS_CONFIG[run.status] ?? STATUS_CONFIG.idle;
              const results = run.stepResults as Array<{ status: string }>;
              const doneCount = results.filter((r) => r.status === 'completed').length;

              return (
                <motion.div
                  key={run.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  onClick={() => { haptic('light'); router.push(`/runs/${run.id}`); }}
                  className="glass rounded-2xl p-4 cursor-pointer active:scale-[0.98] transition-transform glass-hover"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {config.icon}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-100 capitalize">
                            {run.status.replace('_', ' ')}
                          </span>
                          {run.isDryRun && (
                            <span className="px-1.5 py-0.5 text-[10px] rounded bg-amber-500/15 text-amber-400 font-medium">
                              Dry Run
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {doneCount}/{results.length} steps · {run.startedAt ? formatDate(run.startedAt) : 'Not started'}
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={15} className="text-slate-600" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function RunsPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <RunsContent />
    </QueryClientProvider>
  );
}

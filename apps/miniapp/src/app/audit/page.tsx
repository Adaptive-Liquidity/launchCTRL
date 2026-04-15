'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { History } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { SkeletonList } from '@/components/ui/SkeletonCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

const RISK_VARIANT: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
  low: 'success',
  medium: 'warning',
  high: 'error',
  critical: 'error',
};

function AuditContent() {
  const { token, activeWorkspaceId } = useWorkspaceStore();

  const { data, isLoading } = useQuery({
    queryKey: ['audit', activeWorkspaceId],
    queryFn: () => api.workspaces.audit(token!, activeWorkspaceId!),
    enabled: !!token && !!activeWorkspaceId,
  });

  const events = (data?.data ?? []) as Array<{
    id: string; action: string; resourceType: string; resourceId: string | null;
    riskLevel: string; metadata: Record<string, unknown>; createdAt: string;
  }>;

  return (
    <AppShell title="Audit Log">
      <div className="px-4 pt-4 pb-24">
        {!activeWorkspaceId ? (
          <EmptyState
            icon={<History size={24} />}
            title="No workspace selected"
            description="Select a workspace to view its audit log."
          />
        ) : isLoading ? (
          <SkeletonList count={5} />
        ) : events.length === 0 ? (
          <EmptyState
            icon={<History size={24} />}
            title="No audit events"
            description="Actions taken in this workspace will appear here."
          />
        ) : (
          <div className="space-y-2">
            {events.map((event, i) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="glass rounded-xl p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-slate-200 font-mono">{event.action}</span>
                      <StatusBadge
                        label={event.riskLevel}
                        variant={RISK_VARIANT[event.riskLevel] ?? 'neutral'}
                      />
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {event.resourceType}
                      {event.resourceId && <span className="ml-1 font-mono text-slate-600">{event.resourceId.slice(0, 12)}…</span>}
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-600 flex-shrink-0">{formatDate(event.createdAt)}</div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function AuditPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuditContent />
    </QueryClientProvider>
  );
}

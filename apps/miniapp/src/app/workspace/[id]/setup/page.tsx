'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, CheckCircle2, WifiOff, X, Loader2 } from 'lucide-react';
import { QueryClient, QueryClientProvider, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/AppShell';
import { SetupWizard } from '@/components/wizard/SetupWizard';
import { UserbotSetup } from '@/components/userbot/UserbotSetup';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { useUserbotStatus } from '@/hooks/useUserbotStatus';
import { api, revokeUserbotSession } from '@/lib/api';
import { haptic } from '@/lib/telegram';
import { cn } from '@/lib/utils';

const queryClient = new QueryClient();

// ---------------------------------------------------------------------------
// Connect Agent card
// ---------------------------------------------------------------------------

function ConnectAgentCard({
  workspaceId,
  onConnect,
}: {
  workspaceId: string;
  onConnect: () => void;
}) {
  const qc = useQueryClient();
  const { data: status, isLoading } = useUserbotStatus(workspaceId);
  const connected = status?.connected ?? false;

  const revokeMutation = useMutation({
    mutationFn: () => revokeUserbotSession(workspaceId),
    onSuccess: () => {
      haptic('medium');
      qc.invalidateQueries({ queryKey: ['userbot-status', workspaceId] });
    },
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="mx-4 mt-4 mb-2 rounded-2xl backdrop-blur-xl bg-white/[0.05] border border-white/10 p-4"
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          {/* Icon */}
          <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
            <Zap size={16} className="text-indigo-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-white/90">Connect Automation Agent</span>
              {/* AUTO mode badge */}
              <span className="text-[10px] font-bold tracking-wide px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/25 text-indigo-300 uppercase">
                Unlocks AUTO mode
              </span>
            </div>
            <p className="text-xs text-white/40 mt-0.5 leading-tight">
              Executes Rose Bot commands automatically on your behalf
            </p>
          </div>
        </div>

        {/* Status dot */}
        <div className="flex items-center gap-1.5 flex-shrink-0 pt-0.5">
          {isLoading ? (
            <Loader2 size={13} className="text-white/30 animate-spin" />
          ) : connected ? (
            <>
              <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
              <span className="text-xs text-emerald-400 font-medium">Connected</span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 rounded-full bg-white/20" />
              <span className="text-xs text-white/35 font-medium">Not connected</span>
            </>
          )}
        </div>
      </div>

      {/* Connected — show username + disconnect */}
      <AnimatePresence>
        {connected && status?.username && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/15 mb-3"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 size={13} className="text-emerald-400" />
              <span className="text-xs text-emerald-300">
                Connected as{' '}
                <span className="font-semibold">@{status.username}</span>
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CTA */}
      <div className="flex gap-2">
        {connected ? (
          <button
            onClick={() => { haptic('light'); revokeMutation.mutate(); }}
            disabled={revokeMutation.isPending}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium',
              'bg-white/[0.05] border border-white/10 text-white/45',
              'hover:bg-white/[0.08] hover:text-white/60 transition-all',
              'active:scale-[0.97]',
              'disabled:opacity-50 disabled:pointer-events-none',
            )}
          >
            {revokeMutation.isPending ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <WifiOff size={12} />
            )}
            Disconnect
          </button>
        ) : (
          <button
            onClick={() => { haptic('medium'); onConnect(); }}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold',
              'bg-gradient-to-r from-indigo-500 to-violet-500 text-white',
              'shadow-md shadow-indigo-500/20',
              'active:scale-[0.97] transition-transform',
            )}
          >
            <Zap size={12} />
            Connect
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Userbot setup modal / sheet
// ---------------------------------------------------------------------------

function UserbotModal({
  workspaceId,
  onClose,
}: {
  workspaceId: string;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md bg-[#0a0a0f] border-t border-white/10 rounded-t-3xl"
        style={{ height: '85vh', maxHeight: '700px' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/15" />
        </div>
        {/* Close button */}
        <div className="flex justify-end px-4">
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full glass flex items-center justify-center text-white/30 hover:text-white/60 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
        <div className="h-[calc(100%-56px)]">
          <UserbotSetup
            workspaceId={workspaceId}
            onComplete={onClose}
            onSkip={onClose}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Page content
// ---------------------------------------------------------------------------

function SetupContent({ id }: { id: string }) {
  const router = useRouter();
  const { token } = useWorkspaceStore();
  const [showUserbotModal, setShowUserbotModal] = useState(false);

  const handleComplete = async (answers: Record<string, unknown>) => {
    if (!token) return;
    haptic('medium');

    try {
      const result = await api.plans.create(token, id, answers);
      if (result.success) {
        const plan = result.data as { plan?: { id: string } };
        if (plan?.plan?.id) {
          router.push(`/workspace/${id}?plan=${plan.plan.id}`);
        } else {
          router.push(`/workspace/${id}`);
        }
      }
    } catch (err) {
      console.error('Failed to create plan:', err);
      router.push(`/workspace/${id}`);
    }
  };

  return (
    <>
      <AppShell
        title="Setup Wizard"
        showBack
        onBack={() => router.push(`/workspace/${id}`)}
        showNav={false}
      >
        {/* Connect Agent card — sits above the wizard */}
        <ConnectAgentCard
          workspaceId={id}
          onConnect={() => setShowUserbotModal(true)}
        />

        {/* Divider */}
        <div className="mx-4 my-2 h-px bg-white/[0.05]" />

        <SetupWizard
          workspaceId={id}
          onComplete={handleComplete}
          onCancel={() => router.push(`/workspace/${id}`)}
        />
      </AppShell>

      {/* Userbot sheet */}
      <AnimatePresence>
        {showUserbotModal && (
          <UserbotModal
            workspaceId={id}
            onClose={() => setShowUserbotModal(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

export default function SetupPage({ params }: { params: { id: string } }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SetupContent id={params.id} />
    </QueryClientProvider>
  );
}

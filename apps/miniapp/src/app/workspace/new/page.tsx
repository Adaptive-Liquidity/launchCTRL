'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, Building2 } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { api } from '@/lib/api';
import { haptic } from '@/lib/telegram';

export default function NewWorkspacePage() {
  const router = useRouter();
  const { token, setActiveWorkspace } = useWorkspaceStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim() || !token) return;
    haptic('medium');
    setLoading(true);
    setError(null);

    try {
      const result = await api.workspaces.create(token, { name: name.trim(), description: description.trim() || undefined });
      if (result.success) {
        const ws = result.data as { id: string };
        setActiveWorkspace(ws.id);
        router.push(`/workspace/${ws.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create workspace');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell title="New Workspace" showBack onBack={() => router.back()} showNav={false}>
      <div className="px-4 pt-6 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center mb-8"
        >
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center">
            <Building2 size={28} className="text-indigo-400" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 text-center"
        >
          <h2 className="text-xl font-bold text-slate-100 mb-2">Create a Workspace</h2>
          <p className="text-sm text-slate-500">A workspace holds your groups, channels, and setup plans.</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="space-y-4 mb-6"
        >
          <div>
            <label className="text-xs font-medium text-slate-400 mb-2 block uppercase tracking-wide">
              Workspace Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. PEPE Community Launch"
              maxLength={128}
              className="w-full px-4 py-3.5 rounded-2xl glass border border-white/[0.08] text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:border-indigo-500/50 transition-all"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-400 mb-2 block uppercase tracking-wide">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={3}
              maxLength={512}
              className="w-full px-4 py-3.5 rounded-2xl glass border border-white/[0.08] text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:border-indigo-500/50 transition-all resize-none"
            />
          </div>
        </motion.div>

        {error && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-red-400 mb-4 text-center">
            {error}
          </motion.p>
        )}

        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onClick={handleCreate}
          disabled={!name.trim() || loading}
          className="w-full py-4 rounded-2xl bg-accent-gradient text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-accent active:scale-[0.97] transition-transform disabled:opacity-50 disabled:pointer-events-none"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              Create Workspace
              <ArrowRight size={16} />
            </>
          )}
        </motion.button>
      </div>
    </AppShell>
  );
}

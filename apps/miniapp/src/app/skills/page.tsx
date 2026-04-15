'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { BookOpen, Check, AlertTriangle } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { SkeletonList } from '@/components/ui/SkeletonCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { api } from '@/lib/api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

const TAG_COLORS: Record<string, string> = {
  rose: 'bg-pink-500/15 text-pink-400',
  combot: 'bg-blue-500/15 text-blue-400',
  pumpfun: 'bg-orange-500/15 text-orange-400',
  solana: 'bg-green-500/15 text-green-400',
  security: 'bg-red-500/15 text-red-400',
  moderation: 'bg-purple-500/15 text-purple-400',
  copy: 'bg-cyan-500/15 text-cyan-400',
  launch: 'bg-yellow-500/15 text-yellow-400',
  core: 'bg-indigo-500/15 text-indigo-400',
};

function SkillsContent() {
  const { token } = useWorkspaceStore();

  const { data, isLoading } = useQuery({
    queryKey: ['skills'],
    queryFn: () => api.skills.list(token!),
    enabled: !!token,
  });

  const skills = (data?.data ?? []) as Array<{
    slug: string; name: string; description: string; version: string; tags: string[]; valid: boolean;
    requiredIntegrations: string[]; errors: string[];
  }>;

  return (
    <AppShell title="Skill Packs">
      <div className="px-4 pt-4 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5"
        >
          <p className="text-sm text-slate-500 leading-relaxed">
            Skill packs define how your community gets configured. Each pack adds specific capabilities and templates to your setup.
          </p>
        </motion.div>

        {isLoading ? (
          <SkeletonList count={4} />
        ) : skills.length === 0 ? (
          <EmptyState
            icon={<BookOpen size={24} />}
            title="No skill packs loaded"
            description="Skill packs will appear here once the system is initialized."
          />
        ) : (
          <div className="space-y-3">
            {skills.map((skill, i) => (
              <motion.div
                key={skill.slug}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="glass rounded-2xl p-4"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-slate-100">{skill.name}</span>
                      <span className="text-[10px] text-slate-600 font-mono">v{skill.version}</span>
                      {skill.valid
                        ? <Check size={12} className="text-emerald-400" />
                        : <AlertTriangle size={12} className="text-amber-400" />
                      }
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">{skill.description}</p>
                  </div>
                </div>

                {skill.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {skill.tags.slice(0, 5).map((tag) => (
                      <span
                        key={tag}
                        className={`px-2 py-0.5 text-[10px] rounded-md font-medium ${TAG_COLORS[tag] ?? 'bg-white/5 text-slate-500'}`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {skill.requiredIntegrations.length > 0 && (
                  <div className="mt-2 text-[10px] text-slate-600">
                    Requires: {skill.requiredIntegrations.join(', ')}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function SkillsPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <SkillsContent />
    </QueryClientProvider>
  );
}

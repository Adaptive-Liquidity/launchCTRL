'use client';

import { motion } from 'framer-motion';
import { Beaker, Lock, AlertTriangle, Zap, Brain, Bot } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { StatusBadge } from '@/components/ui/StatusBadge';

const WILD_FEATURES = [
  {
    icon: Bot,
    title: 'TDLib / Telegram API Integration',
    description: 'Direct Telegram API access for advanced automation. Currently isolated behind strict security boundaries.',
    status: 'Planned',
    risk: 'High',
    featureFlag: 'wild_mode',
  },
  {
    icon: Brain,
    title: 'Recommendation Engine',
    description: 'ML-based community setup recommendations learned from successful past setups.',
    status: 'Research',
    risk: 'Low',
    featureFlag: 'recommendation_engine',
  },
  {
    icon: Zap,
    title: 'Supervised Automation Agents',
    description: 'Semi-autonomous community management agents with human-in-the-loop approval.',
    status: 'Research',
    risk: 'Medium',
    featureFlag: 'supervised_agents',
  },
];

export default function LabsPage() {
  return (
    <AppShell title="Labs — WILD Phase">
      <div className="px-4 pt-4 pb-24">
        {/* Warning banner */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-amber-300 mb-1">Experimental Features</div>
              <p className="text-xs text-amber-500/80 leading-relaxed">
                The WILD phase explores deeper automation capabilities. None of these features are enabled in the current SHARP release. They require additional security review before activation.
              </p>
            </div>
          </div>
        </motion.div>

        <div className="space-y-3">
          {WILD_FEATURES.map(({ icon: Icon, title, description, status, risk, featureFlag }, i) => (
            <motion.div
              key={featureFlag}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass rounded-2xl p-4 opacity-75"
            >
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-white/5 flex-shrink-0">
                  <Icon size={16} className="text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-semibold text-slate-300">{title}</span>
                    <Lock size={12} className="text-slate-600" />
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed mb-2">{description}</p>
                  <div className="flex items-center gap-2">
                    <StatusBadge label={status} variant="neutral" />
                    <StatusBadge
                      label={`Risk: ${risk}`}
                      variant={risk === 'High' ? 'error' : risk === 'Medium' ? 'warning' : 'success'}
                    />
                    <span className="text-[10px] text-slate-700 font-mono">{featureFlag}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-6 p-4 rounded-2xl glass border border-white/[0.06]"
        >
          <div className="flex items-start gap-3">
            <Beaker size={16} className="text-indigo-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-slate-300 mb-1">WILD Phase Architecture</div>
              <p className="text-xs text-slate-500 leading-relaxed">
                WILD features are isolated in separate service boundaries with feature flags, threat model documentation, and explicit "not in MVP" labeling. They cannot affect SHARP functionality. See <span className="text-indigo-400 font-mono text-[10px]">docs/WILD.md</span> for the full architecture.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </AppShell>
  );
}

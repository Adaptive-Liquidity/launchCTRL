'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Copy, Check, CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';
import type { PlanStep, StepStatus } from '@launchctrl/types';
import { ExecutionModeTag } from './ExecutionModeTag';
import { haptic } from '@/lib/telegram';
import { cn } from '@/lib/utils';

interface StepCardProps {
  step: PlanStep;
  status?: StepStatus;
  index: number;
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  completed: <CheckCircle size={16} className="text-emerald-400" />,
  running: <Loader2 size={16} className="text-indigo-400 animate-spin" />,
  failed: <AlertCircle size={16} className="text-red-400" />,
  awaiting_manual: <Clock size={16} className="text-amber-400" />,
  pending: <div className="w-4 h-4 rounded-full border-2 border-white/20" />,
  skipped: <div className="w-4 h-4 rounded-full bg-white/10" />,
};

export function StepCard({ step, status = 'pending', index }: StepCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!step.copyContent) return;
    await navigator.clipboard.writeText(step.copyContent);
    setCopied(true);
    haptic('light');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={cn(
        'glass rounded-2xl overflow-hidden transition-all duration-200',
        status === 'completed' && 'border-emerald-500/15',
        status === 'failed' && 'border-red-500/15',
        status === 'running' && 'border-indigo-500/20',
      )}
    >
      {/* Header */}
      <button
        onClick={() => {
          haptic('light');
          setExpanded(!expanded);
        }}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        <div className="flex-shrink-0">{STATUS_ICONS[status] ?? STATUS_ICONS.pending}</div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn(
              'text-sm font-semibold',
              status === 'completed' ? 'text-slate-300' : 'text-slate-100',
            )}>
              {step.title}
            </span>
            <ExecutionModeTag mode={step.executionMode} />
          </div>
          <p className="text-xs text-slate-500 mt-0.5 truncate">{step.description}</p>
        </div>

        <ChevronDown
          size={16}
          className={cn('text-slate-600 flex-shrink-0 transition-transform duration-200', expanded && 'rotate-180')}
        />
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-white/[0.06] pt-3">
              {step.manualInstructions && (
                <div>
                  <div className="text-xs text-slate-500 font-medium mb-2 uppercase tracking-wide">Instructions</div>
                  <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-line bg-white/[0.03] rounded-xl p-3">
                    {step.manualInstructions}
                  </div>
                </div>
              )}

              {step.copyContent && (
                <div>
                  <div className="text-xs text-slate-500 font-medium mb-2 uppercase tracking-wide">Command</div>
                  <div className="relative bg-white/[0.04] rounded-xl p-3">
                    <pre className="text-xs text-slate-300 font-mono leading-relaxed whitespace-pre-wrap pr-10">{step.copyContent}</pre>
                    <button
                      onClick={handleCopy}
                      className="absolute top-2.5 right-2.5 p-1.5 rounded-lg glass text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    </button>
                  </div>
                </div>
              )}

              {step.risks.length > 0 && (
                <div className="space-y-2">
                  {step.risks.map((risk, i) => (
                    <div key={i} className="flex gap-2 p-3 rounded-xl bg-amber-500/[0.08] border border-amber-500/15">
                      <AlertCircle size={13} className="text-amber-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-semibold text-amber-300">{risk.title}</div>
                        <div className="text-xs text-amber-500/80 mt-0.5 leading-relaxed">{risk.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

'use client';

import { motion } from 'framer-motion';
import { CheckCircle, AlertCircle, Loader2, Clock } from 'lucide-react';
import type { PlanStep, StepResult } from '@launchctrl/types';
import { StepCard } from './StepCard';
import { cn } from '@/lib/utils';

interface ExecutionConsoleProps {
  steps: PlanStep[];
  results: StepResult[];
  isDryRun: boolean;
  status: string;
}

export function ExecutionConsole({ steps, results, isDryRun, status }: ExecutionConsoleProps) {
  const completedCount = results.filter((r) => r.status === 'completed').length;
  const failedCount = results.filter((r) => r.status === 'failed').length;
  const manualCount = results.filter((r) => r.status === 'awaiting_manual').length;

  const getStepStatus = (stepId: string) => {
    return results.find((r) => r.stepId === stepId)?.status ?? 'pending';
  };

  return (
    <div className="space-y-4">
      {/* Status header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'glass rounded-2xl p-4 border',
          status === 'completed' && 'border-emerald-500/20',
          status === 'running' && 'border-indigo-500/20',
          status === 'failed' && 'border-red-500/20',
          status === 'dry_run' && 'border-amber-500/20',
        )}
      >
        <div className="flex items-center gap-3 mb-3">
          {status === 'completed' && <CheckCircle size={18} className="text-emerald-400" />}
          {status === 'running' && <Loader2 size={18} className="text-indigo-400 animate-spin" />}
          {status === 'failed' && <AlertCircle size={18} className="text-red-400" />}
          {status === 'dry_run' && <Clock size={18} className="text-amber-400" />}
          <div>
            <div className="text-sm font-semibold text-slate-100">
              {isDryRun ? 'Dry Run' : 'Execution'} —{' '}
              <span className="capitalize">{status.replace('_', ' ')}</span>
            </div>
            {isDryRun && (
              <div className="text-xs text-amber-400 mt-0.5">No real actions taken</div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="text-lg font-bold text-emerald-400">{completedCount}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wide">Done</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-amber-400">{manualCount}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wide">Manual</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-red-400">{failedCount}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wide">Failed</div>
          </div>
        </div>
      </motion.div>

      {/* Steps */}
      <div className="space-y-2.5">
        {steps.map((step, i) => (
          <StepCard
            key={step.id}
            step={step}
            status={getStepStatus(step.id)}
            index={i}
          />
        ))}
      </div>
    </div>
  );
}

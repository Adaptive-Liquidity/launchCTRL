'use client';

import { motion } from 'framer-motion';
import { Edit2 } from 'lucide-react';
import type { WizardAnswers } from '@launchctrl/types';

interface ReviewScreenProps {
  answers: Partial<WizardAnswers>;
  onEdit: (stepIndex: number) => void;
}

const REVIEW_ITEMS = [
  { label: 'Launch Name', key: 'launchName', stepIndex: 0 },
  { label: 'Platform', key: 'platform', stepIndex: 1 },
  { label: 'Category', key: 'category', stepIndex: 2 },
  { label: 'Security Level', key: 'securityProfile', stepIndex: 3 },
  { label: 'Automation Level', key: 'automationProfile', stepIndex: 4 },
  { label: 'Integrations', key: 'integrations', stepIndex: 5 },
  { label: 'Tone Profile', key: 'toneProfile', stepIndex: 6 },
];

export function ReviewScreen({ answers, onEdit }: ReviewScreenProps) {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-100 mb-2">Review Your Setup</h2>
        <p className="text-sm text-slate-500 leading-relaxed">
          Confirm your choices before we generate the configuration plan.
        </p>
      </div>

      <div className="space-y-2">
        {REVIEW_ITEMS.map(({ label, key, stepIndex }, i) => {
          const rawValue = answers[key as keyof WizardAnswers];
          const displayValue = Array.isArray(rawValue)
            ? rawValue.join(', ') || 'None selected'
            : (rawValue as string) ?? 'Not set';

          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center justify-between p-4 glass rounded-xl"
            >
              <div>
                <div className="text-xs text-slate-500 mb-0.5">{label}</div>
                <div className="text-sm font-medium text-slate-100 capitalize">{displayValue}</div>
              </div>
              <button
                onClick={() => onEdit(stepIndex)}
                className="p-2 rounded-lg glass-hover text-slate-500 hover:text-slate-300 transition-colors"
              >
                <Edit2 size={14} />
              </button>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-4 p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
        <p className="text-xs text-indigo-300 leading-relaxed">
          <span className="font-semibold">What happens next:</span> We'll generate a step-by-step plan with execution modes for each action. You'll review and approve before anything runs.
        </p>
      </div>
    </div>
  );
}

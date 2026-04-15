'use client';

import { motion } from 'framer-motion';
import type { WizardStep as WizardStepType, WizardAnswers } from '@launchctrl/types';
import { cn } from '@/lib/utils';
import { haptic } from '@/lib/telegram';
import { Check } from 'lucide-react';

interface WizardStepProps {
  step: WizardStepType;
  value: unknown;
  onChange: (value: unknown) => void;
  allAnswers: Partial<WizardAnswers>;
}

export function WizardStep({ step, value, onChange, allAnswers }: WizardStepProps) {
  // Don't render if condition fails
  if (step.condition && !step.condition(allAnswers)) {
    return null;
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-100 mb-2 leading-tight">{step.title}</h2>
        <p className="text-sm text-slate-500 leading-relaxed">{step.description}</p>
      </div>

      {step.type === 'single_choice' && step.options && (
        <div className="space-y-2.5">
          {step.options.map((option, i) => {
            const isSelected = value === option.value;
            return (
              <motion.button
                key={option.value}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => {
                  haptic('light');
                  onChange(option.value);
                }}
                className={cn(
                  'w-full flex items-start gap-3 p-4 rounded-2xl border text-left transition-all duration-200 active:scale-[0.98]',
                  isSelected
                    ? 'bg-indigo-500/15 border-indigo-500/40 shadow-accent'
                    : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.1]',
                )}
              >
                <div className={cn(
                  'w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all',
                  isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-white/20',
                )}>
                  {isSelected && <Check size={11} strokeWidth={3} className="text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'text-sm font-semibold',
                      isSelected ? 'text-white' : 'text-slate-200',
                    )}>
                      {option.label}
                    </span>
                    {option.recommended && (
                      <span className="px-1.5 py-0.5 text-[10px] rounded bg-indigo-500/20 text-indigo-400 font-medium">
                        Recommended
                      </span>
                    )}
                  </div>
                  {option.description && (
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{option.description}</p>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      )}

      {step.type === 'multi_choice' && step.options && (
        <div className="space-y-2.5">
          {step.options.map((option, i) => {
            const selected = (value as string[] ?? []).includes(option.value);
            return (
              <motion.button
                key={option.value}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => {
                  haptic('light');
                  const current = (value as string[] ?? []);
                  if (selected) {
                    onChange(current.filter((v) => v !== option.value));
                  } else {
                    onChange([...current, option.value]);
                  }
                }}
                className={cn(
                  'w-full flex items-start gap-3 p-4 rounded-2xl border text-left transition-all duration-200 active:scale-[0.98]',
                  selected
                    ? 'bg-indigo-500/15 border-indigo-500/40'
                    : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06]',
                )}
              >
                <div className={cn(
                  'w-5 h-5 rounded-md border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all',
                  selected ? 'bg-indigo-500 border-indigo-500' : 'border-white/20',
                )}>
                  {selected && <Check size={11} strokeWidth={3} className="text-white" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={cn('text-sm font-semibold', selected ? 'text-white' : 'text-slate-200')}>
                      {option.label}
                    </span>
                    {option.recommended && (
                      <span className="px-1.5 py-0.5 text-[10px] rounded bg-indigo-500/20 text-indigo-400 font-medium">
                        Recommended
                      </span>
                    )}
                  </div>
                  {option.description && (
                    <p className="text-xs text-slate-500 mt-1">{option.description}</p>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      )}

      {step.type === 'text' && (
        <div className="space-y-4">
          <input
            type="text"
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="e.g. PEPE Community"
            className="w-full px-4 py-3.5 rounded-2xl glass border border-white/[0.08] text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.07] transition-all"
          />
        </div>
      )}

      {step.type === 'toggle_group' && (
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { key: 'generateWelcome', label: 'Welcome Msg', icon: '👋' },
            { key: 'generateRules', label: 'Rules', icon: '📋' },
            { key: 'generateFaq', label: 'FAQ', icon: '❓' },
            { key: 'generateCommands', label: 'Commands', icon: '⚡' },
            { key: 'generateAnnouncements', label: 'Announcements', icon: '📣' },
            { key: 'generateCrisisMode', label: 'Crisis Mode', icon: '🛡️' },
            { key: 'generateRaidMode', label: 'Raid Mode', icon: '🔒' },
          ].map((item, i) => {
            const isOn = (allAnswers as Record<string, boolean>)[item.key] !== false;
            return (
              <motion.button
                key={item.key}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => {
                  haptic('light');
                  onChange({ key: item.key, value: !isOn });
                }}
                className={cn(
                  'flex flex-col items-start gap-1.5 p-3.5 rounded-2xl border transition-all duration-200 active:scale-[0.97]',
                  isOn
                    ? 'bg-indigo-500/15 border-indigo-500/35 text-indigo-300'
                    : 'bg-white/[0.03] border-white/[0.06] text-slate-500',
                )}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="text-xs font-semibold">{item.label}</span>
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}

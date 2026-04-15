'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { useWizardStore } from '@/stores/wizard.store';
import { WIZARD_STEPS } from '@launchctrl/types';
import { WizardStep } from './WizardStep';
import { ReviewScreen } from './ReviewScreen';
import { haptic } from '@/lib/telegram';

interface SetupWizardProps {
  workspaceId: string;
  onComplete: (answers: Record<string, unknown>) => void;
  onCancel: () => void;
}

const TOTAL_STEPS = WIZARD_STEPS.filter(s => s.type !== 'review').length;

export function SetupWizard({ workspaceId, onComplete, onCancel }: SetupWizardProps) {
  const { currentStep, answers, nextStep, prevStep, setAnswer, reset } = useWizardStore();
  const [direction, setDirection] = useState<1 | -1>(1);

  const step = WIZARD_STEPS[currentStep];
  const isLastStep = currentStep === WIZARD_STEPS.length - 2; // before review
  const isReview = currentStep === WIZARD_STEPS.length - 1;
  const progress = ((currentStep) / TOTAL_STEPS) * 100;

  const handleNext = () => {
    haptic('light');
    setDirection(1);
    nextStep();
  };

  const handleBack = () => {
    haptic('light');
    setDirection(-1);
    prevStep();
  };

  const handleComplete = () => {
    haptic('medium');
    onComplete(answers);
    reset();
  };

  if (!step) return null;

  return (
    <div className="flex flex-col h-full">
      {/* Progress bar */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-500">Step {currentStep + 1} of {TOTAL_STEPS + 1}</span>
          <span className="text-xs text-indigo-400 font-medium">{Math.round(progress)}%</span>
        </div>
        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-accent-gradient rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-4">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            initial={{ opacity: 0, x: direction * 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -24 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            {isReview ? (
              <ReviewScreen answers={answers} onEdit={(stepIndex) => {
                setDirection(-1);
                useWizardStore.getState().setStep(stepIndex);
              }} />
            ) : (
              <WizardStep
                step={step}
                value={step.fieldKey ? answers[step.fieldKey as keyof typeof answers] : undefined}
                onChange={(value) => {
                  if (step.fieldKey) {
                    setAnswer(step.fieldKey as keyof typeof answers, value as never);
                  }
                }}
                allAnswers={answers}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="px-4 py-4 border-t border-white/[0.06] flex gap-3">
        {currentStep > 0 && (
          <button
            onClick={handleBack}
            className="flex items-center gap-2 px-4 py-3 rounded-2xl glass text-slate-400 text-sm font-medium active:scale-[0.97] transition-transform"
          >
            <ArrowLeft size={16} />
            Back
          </button>
        )}
        {!isReview ? (
          <button
            onClick={handleNext}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-accent-gradient text-white text-sm font-semibold active:scale-[0.97] transition-transform shadow-accent"
          >
            {isLastStep ? 'Review Plan' : 'Continue'}
            <ArrowRight size={16} />
          </button>
        ) : (
          <button
            onClick={handleComplete}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-accent-gradient text-white text-sm font-semibold active:scale-[0.97] transition-transform shadow-accent"
          >
            <Check size={16} />
            Generate Plan
          </button>
        )}
      </div>
    </div>
  );
}

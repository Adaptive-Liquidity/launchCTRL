'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Shield, Sparkles, ArrowRight } from 'lucide-react';
import { haptic } from '@/lib/telegram';

interface OnboardingSplashProps {
  onContinue: () => void;
  userName?: string;
}

export function OnboardingSplash({ onContinue, userName }: OnboardingSplashProps) {
  return (
    <div className="flex flex-col h-full bg-obsidian-950 px-6 pt-12 pb-8">
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex justify-center mb-8"
      >
        <div className="relative">
          <div className="w-20 h-20 rounded-3xl bg-accent-gradient flex items-center justify-center shadow-accent-strong">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-label="LaunchCtrl">
              <path d="M20 4L36 12V28L20 36L4 28V12L20 4Z" stroke="white" strokeWidth="1.5" fill="none" opacity="0.3" />
              <path d="M20 8L32 14V26L20 32L8 26V14L20 8Z" fill="white" fillOpacity="0.15" />
              <path d="M14 20L18 24L26 16" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          {/* Glow */}
          <div className="absolute inset-0 rounded-3xl bg-accent-gradient opacity-30 blur-xl -z-10" />
        </div>
      </motion.div>

      {/* Headline */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="text-center mb-10"
      >
        <h1 className="text-2xl font-bold text-white mb-3 leading-tight">
          {userName ? `Welcome, ${userName}.` : 'Welcome to LaunchCtrl.'}
        </h1>
        <p className="text-sm text-slate-400 leading-relaxed max-w-xs mx-auto">
          The serious Telegram launch control plane for communities that ship.
        </p>
      </motion.div>

      {/* Feature cards */}
      <div className="flex-1 space-y-3 mb-8">
        {[
          {
            icon: Zap,
            color: 'text-indigo-400',
            bg: 'bg-indigo-500/10',
            title: 'Guided Setup Wizard',
            desc: 'Answer 8 questions. Get a complete community configuration plan.',
            delay: 0.2,
          },
          {
            icon: Sparkles,
            color: 'text-violet-400',
            bg: 'bg-violet-500/10',
            title: 'Generated Copy & Assets',
            desc: 'Welcome messages, rules, commands, FAQs — all tuned to your tone.',
            delay: 0.3,
          },
          {
            icon: Shield,
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10',
            title: 'Honest Automation',
            desc: 'Every step is labeled AUTO, ONE_CLICK, COPY_PASTE, or MANUAL. No fake promises.',
            delay: 0.4,
          },
        ].map(({ icon: Icon, color, bg, title, desc, delay }) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-start gap-4 glass rounded-2xl p-4"
          >
            <div className={`p-2.5 rounded-xl ${bg} flex-shrink-0`}>
              <Icon size={18} className={color} />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-100 mb-0.5">{title}</div>
              <div className="text-xs text-slate-500 leading-relaxed">{desc}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* CTA */}
      <motion.button
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        onClick={() => {
          haptic('medium');
          onContinue();
        }}
        className="w-full py-4 rounded-2xl bg-accent-gradient text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-accent active:scale-[0.97] transition-transform"
      >
        Get Started
        <ArrowRight size={16} />
      </motion.button>
    </div>
  );
}

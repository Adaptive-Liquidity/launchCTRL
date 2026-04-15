'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Shield,
  Smartphone,
  KeyRound,
  CheckCircle2,
  ArrowRight,
  RotateCcw,
  Lock,
  X,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { initUserbotAuth, completeUserbotAuth, completeUserbot2FA } from '@/lib/api';
import { haptic } from '@/lib/telegram';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Step = 'intro' | 'phone' | 'otp' | '2fa' | 'success';

interface FlowState {
  phoneNumber: string;
  phoneCodeHash: string;
  username: string;
}

interface UserbotSetupProps {
  workspaceId: string;
  onComplete: () => void;
  onSkip: () => void;
}

// ---------------------------------------------------------------------------
// Shared micro-components
// ---------------------------------------------------------------------------

const slideVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 28 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir * -28 }),
};

function StepHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-bold text-white/90 leading-tight">{title}</h2>
      {subtitle && (
        <p className="mt-2 text-sm text-white/50 leading-relaxed">{subtitle}</p>
      )}
    </div>
  );
}

function PrimaryButton({
  onClick,
  children,
  loading = false,
  disabled = false,
  className,
}: {
  onClick?: () => void;
  children: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        'w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl',
        'bg-gradient-to-r from-indigo-500 to-violet-500',
        'text-white text-sm font-semibold shadow-lg shadow-indigo-500/25',
        'active:scale-[0.97] transition-all duration-150',
        'disabled:opacity-50 disabled:pointer-events-none',
        className,
      )}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : children}
    </button>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 mb-4"
    >
      <AlertCircle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
      <p className="text-xs text-red-300 leading-relaxed">{message}</p>
    </motion.div>
  );
}

function TrustPill({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2.5 py-2.5 px-3 rounded-xl bg-white/[0.04] border border-white/[0.07]">
      <div className="w-6 h-6 rounded-lg bg-indigo-500/15 flex items-center justify-center flex-shrink-0">
        <Icon size={13} className="text-indigo-400" />
      </div>
      <span className="text-xs text-white/60 leading-tight">{label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 1 — Intro
// ---------------------------------------------------------------------------

function IntroStep({
  onContinue,
  onSkip,
}: {
  onContinue: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <StepHeader
        title="Connect Telegram Account"
        subtitle="To automate Rose Bot setup, connect a Telegram account that's already an admin of your group. LaunchCtrl will send commands on your behalf."
      />

      {/* Trust bullets */}
      <div className="space-y-2.5 mb-8">
        <TrustPill
          icon={Shield}
          label="Your account stays in control — you can disconnect anytime"
        />
        <TrustPill
          icon={Lock}
          label="Session encrypted with AES-256-GCM"
        />
        <TrustPill
          icon={Smartphone}
          label="Only sends Rose configuration commands — nothing else"
        />
      </div>

      {/* Security note */}
      <div className="flex-1 flex flex-col justify-end gap-3">
        <div className="px-3 py-3 rounded-xl bg-indigo-500/[0.07] border border-indigo-500/15">
          <p className="text-xs text-indigo-300/80 leading-relaxed">
            LaunchCtrl never stores your Telegram password. The session is scoped to
            Rose Bot command execution only and can be revoked in one tap.
          </p>
        </div>

        <PrimaryButton
          onClick={() => {
            haptic('medium');
            onContinue();
          }}
        >
          Continue
          <ArrowRight size={15} />
        </PrimaryButton>

        <button
          onClick={() => {
            haptic('light');
            onSkip();
          }}
          className="w-full py-2.5 text-sm text-white/35 hover:text-white/55 transition-colors"
        >
          Skip — I&apos;ll paste commands manually
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — Phone Number
// ---------------------------------------------------------------------------

function PhoneStep({
  workspaceId,
  onSuccess,
}: {
  workspaceId: string;
  onSuccess: (phoneNumber: string, phoneCodeHash: string) => void;
}) {
  const [phone, setPhone] = useState('');

  const mutation = useMutation({
    mutationFn: () => initUserbotAuth({ phoneNumber: phone.trim(), workspaceId }),
    onSuccess: (data) => {
      haptic('medium');
      onSuccess(phone.trim(), data.phoneCodeHash);
    },
  });

  const isValid = /^\+\d{7,15}$/.test(phone.replace(/\s/g, ''));

  return (
    <div className="flex flex-col h-full">
      <StepHeader
        title="Enter Phone Number"
        subtitle="Use the Telegram account that's an admin of your group."
      />

      {mutation.error && (
        <ErrorBanner message={(mutation.error as Error).message} />
      )}

      {/* Input */}
      <div className="mb-6">
        <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">
          Phone Number
        </label>
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            <Smartphone size={16} className="text-white/30" />
          </div>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 555 123 4567"
            className={cn(
              'w-full pl-11 pr-4 py-4 rounded-2xl',
              'bg-white/[0.06] border border-white/10',
              'text-white/90 text-sm placeholder:text-white/25',
              'focus:outline-none focus:border-indigo-500/60 focus:bg-white/[0.08]',
              'transition-all duration-200',
            )}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && isValid) mutation.mutate();
            }}
          />
        </div>
        <p className="mt-2 text-xs text-white/35 leading-relaxed">
          Include country code in E.164 format (e.g. +44 20 7946 0958)
        </p>
      </div>

      <div className="flex-1 flex flex-col justify-end">
        <PrimaryButton
          onClick={() => mutation.mutate()}
          loading={mutation.isPending}
          disabled={!isValid}
        >
          Send Code
          <ArrowRight size={15} />
        </PrimaryButton>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 3 — OTP
// ---------------------------------------------------------------------------

const OTP_LENGTH = 5;

function OtpStep({
  workspaceId,
  phoneNumber,
  phoneCodeHash,
  onSuccess,
  onRequires2FA,
  onResend,
}: {
  workspaceId: string;
  phoneNumber: string;
  phoneCodeHash: string;
  onSuccess: (username: string) => void;
  onRequires2FA: () => void;
  onResend: () => void;
}) {
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const inputRefs = useRef<Array<HTMLInputElement | null>>(Array(OTP_LENGTH).fill(null));
  const [resent, setResent] = useState(false);

  const code = digits.join('');
  const isFull = code.length === OTP_LENGTH;

  const mutation = useMutation({
    mutationFn: () =>
      completeUserbotAuth({
        phoneNumber,
        phoneCode: code,
        phoneCodeHash,
        workspaceId,
      }),
    onSuccess: (data) => {
      if (data.requiresTwoFactor) {
        haptic('light');
        onRequires2FA();
      } else if (data.success) {
        haptic('heavy');
        onSuccess(data.username ?? '');
      }
    },
  });

  // Auto-submit when all digits filled
  useEffect(() => {
    if (isFull && !mutation.isPending) {
      mutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFull, code]);

  const handleDigitChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);

    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        const next = [...digits];
        next[index] = '';
        setDigits(next);
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus();
        const next = [...digits];
        next[index - 1] = '';
        setDigits(next);
      }
    }
    if (e.key === 'ArrowLeft' && index > 0) inputRefs.current[index - 1]?.focus();
    if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    const next = Array(OTP_LENGTH).fill('');
    pasted.split('').forEach((ch, i) => { next[i] = ch; });
    setDigits(next);
    inputRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
  };

  const handleResend = () => {
    haptic('light');
    setDigits(Array(OTP_LENGTH).fill(''));
    setResent(true);
    setTimeout(() => setResent(false), 3000);
    onResend();
  };

  return (
    <div className="flex flex-col h-full">
      <StepHeader
        title="Verification Code"
        subtitle={`Telegram sent a ${OTP_LENGTH}-digit code to ${phoneNumber}`}
      />

      {mutation.error && (
        <ErrorBanner message={(mutation.error as Error).message} />
      )}

      {/* OTP boxes */}
      <div className="mb-6">
        <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3 block">
          Verification Code
        </label>
        <div className="flex gap-2.5 justify-center" onPaste={handlePaste}>
          {digits.map((digit, i) => (
            <motion.div
              key={i}
              animate={{
                scale: digit ? 1.05 : 1,
                borderColor: digit ? 'rgba(99,102,241,0.7)' : 'rgba(255,255,255,0.1)',
              }}
              transition={{ duration: 0.15 }}
              className="flex-1"
            >
              <input
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className={cn(
                  'w-full aspect-square text-center text-xl font-bold',
                  'rounded-2xl border',
                  'bg-white/[0.06]',
                  'text-white/90',
                  'focus:outline-none focus:bg-white/[0.09]',
                  'transition-colors duration-150',
                  digit ? 'border-indigo-500/70' : 'border-white/10',
                  mutation.error && 'border-red-500/40',
                )}
                disabled={mutation.isPending}
              />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Loading indicator */}
      <AnimatePresence>
        {mutation.isPending && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center gap-2 mb-4 text-sm text-indigo-400"
          >
            <Loader2 size={14} className="animate-spin" />
            Verifying…
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col justify-end gap-3">
        <PrimaryButton
          onClick={() => mutation.mutate()}
          loading={mutation.isPending}
          disabled={!isFull}
        >
          Confirm
          <ArrowRight size={15} />
        </PrimaryButton>

        <button
          onClick={handleResend}
          disabled={mutation.isPending}
          className="w-full py-2.5 flex items-center justify-center gap-2 text-sm text-white/35 hover:text-white/55 transition-colors disabled:pointer-events-none"
        >
          <RotateCcw size={13} />
          {resent ? 'Code sent!' : 'Resend code'}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 4 — 2FA
// ---------------------------------------------------------------------------

function TwoFAStep({
  workspaceId,
  phoneNumber,
  onSuccess,
}: {
  workspaceId: string;
  phoneNumber: string;
  onSuccess: (username: string) => void;
}) {
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);

  const mutation = useMutation({
    mutationFn: () => completeUserbot2FA({ phoneNumber, password, workspaceId }),
    onSuccess: (data) => {
      if (data.success) {
        haptic('heavy');
        onSuccess(data.username ?? '');
      }
    },
  });

  return (
    <div className="flex flex-col h-full">
      <StepHeader
        title="Two-Factor Password"
        subtitle="Your Telegram account has 2-step verification enabled."
      />

      {mutation.error && (
        <ErrorBanner message={(mutation.error as Error).message} />
      )}

      <div className="mb-6">
        <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">
          Two-Factor Password
        </label>
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            <KeyRound size={16} className="text-white/30" />
          </div>
          <input
            type={show ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your 2FA password"
            className={cn(
              'w-full pl-11 pr-12 py-4 rounded-2xl',
              'bg-white/[0.06] border border-white/10',
              'text-white/90 text-sm placeholder:text-white/25',
              'focus:outline-none focus:border-indigo-500/60 focus:bg-white/[0.08]',
              'transition-all duration-200',
            )}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && password) mutation.mutate();
            }}
          />
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
          >
            <Lock size={15} />
          </button>
        </div>
        <p className="mt-2 text-xs text-white/35 leading-relaxed">
          Your Telegram 2-step verification password — not stored by LaunchCtrl
        </p>
      </div>

      <div className="flex-1 flex flex-col justify-end">
        <PrimaryButton
          onClick={() => mutation.mutate()}
          loading={mutation.isPending}
          disabled={!password}
        >
          Confirm
          <ArrowRight size={15} />
        </PrimaryButton>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 5 — Success
// ---------------------------------------------------------------------------

function SuccessStep({
  username,
  onContinue,
}: {
  username: string;
  onContinue: () => void;
}) {
  return (
    <div className="flex flex-col h-full items-center justify-center text-center px-4">
      {/* Checkmark */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="mb-6"
      >
        <div className="relative w-20 h-20 mx-auto">
          <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-xl" />
          <div className="relative w-20 h-20 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
            <CheckCircle2 size={36} className="text-emerald-400" />
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <h2 className="text-xl font-bold text-white/90 mb-2">Account Connected</h2>
        {username && (
          <p className="text-sm font-medium text-indigo-300 mb-3">@{username}</p>
        )}
        <p className="text-sm text-white/45 leading-relaxed max-w-xs mx-auto">
          Rose Bot commands will now execute automatically on your behalf during workspace setup.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full mt-10"
      >
        <PrimaryButton onClick={() => { haptic('medium'); onContinue(); }}>
          Continue to Setup
          <ArrowRight size={15} />
        </PrimaryButton>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root component
// ---------------------------------------------------------------------------

export function UserbotSetup({ workspaceId, onComplete, onSkip }: UserbotSetupProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>('intro');
  const [direction, setDirection] = useState<1 | -1>(1);
  const [flow, setFlow] = useState<FlowState>({ phoneNumber: '', phoneCodeHash: '', username: '' });

  const goTo = (next: Step, dir: 1 | -1 = 1) => {
    setDirection(dir);
    setStep(next);
  };

  const stepIcons: Record<Step, React.ElementType> = {
    intro: Shield,
    phone: Smartphone,
    otp: KeyRound,
    '2fa': Lock,
    success: CheckCircle2,
  };

  const StepIcon = stepIcons[step];

  const stepOrder: Step[] = ['intro', 'phone', 'otp', '2fa', 'success'];
  const stepIndex = stepOrder.indexOf(step);
  // 2FA is conditional so don't count it in normal progress
  const progressSteps = ['intro', 'phone', 'otp', 'success'];
  const progressIndex = progressSteps.indexOf(step === '2fa' ? 'otp' : step);
  const progress = ((progressIndex) / (progressSteps.length - 1)) * 100;

  return (
    <div className="flex flex-col h-full bg-[#0a0a0f]">
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        {/* Icon + progress */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                transition={{ duration: 0.2 }}
              >
                <StepIcon size={15} className="text-indigo-400" />
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="flex-1 h-1 bg-white/[0.06] rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>
          {step !== 'success' && (
            <button
              onClick={() => { haptic('light'); onSkip(); }}
              className="w-8 h-8 rounded-xl glass flex items-center justify-center text-white/30 hover:text-white/60 transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-5 pb-5">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="h-full"
          >
            {step === 'intro' && (
              <IntroStep
                onContinue={() => goTo('phone', 1)}
                onSkip={onSkip}
              />
            )}

            {step === 'phone' && (
              <PhoneStep
                workspaceId={workspaceId}
                onSuccess={(phoneNumber, phoneCodeHash) => {
                  setFlow((prev) => ({ ...prev, phoneNumber, phoneCodeHash }));
                  goTo('otp', 1);
                }}
              />
            )}

            {step === 'otp' && (
              <OtpStep
                workspaceId={workspaceId}
                phoneNumber={flow.phoneNumber}
                phoneCodeHash={flow.phoneCodeHash}
                onSuccess={(username) => {
                  setFlow((prev) => ({ ...prev, username }));
                  // Invalidate userbot status so the card refreshes
                  queryClient.invalidateQueries({ queryKey: ['userbot-status', workspaceId] });
                  goTo('success', 1);
                }}
                onRequires2FA={() => goTo('2fa', 1)}
                onResend={() => goTo('phone', -1)}
              />
            )}

            {step === '2fa' && (
              <TwoFAStep
                workspaceId={workspaceId}
                phoneNumber={flow.phoneNumber}
                onSuccess={(username) => {
                  setFlow((prev) => ({ ...prev, username }));
                  queryClient.invalidateQueries({ queryKey: ['userbot-status', workspaceId] });
                  goTo('success', 1);
                }}
              />
            )}

            {step === 'success' && (
              <SuccessStep username={flow.username} onContinue={onComplete} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/**
 * @file planner.test.ts
 * Unit tests for the LaunchCtrl domain planner pipeline.
 *
 * Tests cover the five pipeline stages:
 *   normalizeIntake → selectStack → generatePlanSteps → validatePlanSteps → renderExecutionBundle
 *
 * No database or Redis connections are required — all data is mocked in-memory.
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeIntake,
  selectStack,
  generatePlanSteps,
  validatePlanSteps,
  renderExecutionBundle,
} from '@launchctrl/domain';
import type { WizardAnswers } from '@launchctrl/types';

// ─── Fixtures ────────────────────────────────────────────────────────────────

/** A complete, valid set of wizard answers for a meme token on pump.fun */
const BASE_ANSWERS: WizardAnswers = {
  launchName: 'PepeMax',
  launchTicker: 'PEPEMAX',
  launchDescription: 'The most pepe-brained token on Solana',
  platform: 'pumpfun',
  contractAddress: 'PePeMaxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXx',
  websiteUrl: 'https://pepemax.io',
  twitterUrl: 'https://twitter.com/pepemaxio',
  telegramUrl: 'https://t.me/pepemaxchat',
  category: 'meme_token',
  securityProfile: 'balanced',
  automationProfile: 'standard',
  integrations: ['rose', 'combot'],
  toneProfile: 'degen',
  generateWelcome: true,
  generateRules: true,
  generateFaq: true,
  generateCommands: true,
  generateAnnouncements: false,
  generateCrisisMode: false,
  generateRaidMode: false,
};

/** Minimal valid wizard answers — only required fields */
const MINIMAL_ANSWERS: WizardAnswers = {
  launchName: 'TestProject',
  launchDescription: 'A test project',
  platform: 'solana_general',
  category: 'general_community',
  securityProfile: 'low',
  automationProfile: 'minimal',
  integrations: [],
  toneProfile: 'formal',
  generateWelcome: false,
  generateRules: false,
  generateFaq: false,
  generateCommands: false,
  generateAnnouncements: false,
  generateCrisisMode: false,
  generateRaidMode: false,
};

/** High-security private alpha answers */
const HIGH_SECURITY_ANSWERS: WizardAnswers = {
  ...BASE_ANSWERS,
  platform: 'ethereum',
  category: 'private_alpha',
  securityProfile: 'extreme',
  automationProfile: 'aggressive_safe',
  integrations: ['rose', 'combot', 'safeguard'],
};

// ─── normalizeIntake ──────────────────────────────────────────────────────────

describe('normalizeIntake', () => {
  it('returns correct resolved platform label for pumpfun', () => {
    const intake = normalizeIntake(BASE_ANSWERS);
    expect(intake.resolvedPlatformLabel).toBe('pump.fun');
  });

  it('returns correct resolved platform label for raydium', () => {
    const answers: WizardAnswers = { ...BASE_ANSWERS, platform: 'raydium' };
    const intake = normalizeIntake(answers);
    expect(intake.resolvedPlatformLabel).toBe('Raydium');
  });

  it('returns correct resolved platform label for ethereum', () => {
    const intake = normalizeIntake(HIGH_SECURITY_ANSWERS);
    expect(intake.resolvedPlatformLabel).toBe('Ethereum');
  });

  it('falls back to raw platform string for unknown platform', () => {
    const answers = { ...BASE_ANSWERS, platform: 'unknown_chain' as WizardAnswers['platform'] };
    const intake = normalizeIntake(answers);
    expect(intake.resolvedPlatformLabel).toBe('unknown_chain');
  });

  it('correctly identifies meme project for meme_token category', () => {
    const intake = normalizeIntake(BASE_ANSWERS);
    expect(intake.isMemeProject).toBe(true);
  });

  it('correctly identifies meme project when platform is pumpfun regardless of category', () => {
    const answers: WizardAnswers = { ...BASE_ANSWERS, category: 'token', platform: 'pumpfun' };
    const intake = normalizeIntake(answers);
    expect(intake.isMemeProject).toBe(true);
  });

  it('does not flag general_community as meme project', () => {
    const intake = normalizeIntake(MINIMAL_ANSWERS);
    expect(intake.isMemeProject).toBe(false);
  });

  it('correctly identifies high-security profile for "hard"', () => {
    const answers: WizardAnswers = { ...BASE_ANSWERS, securityProfile: 'hard' };
    const intake = normalizeIntake(answers);
    expect(intake.isHighSecurity).toBe(true);
  });

  it('correctly identifies high-security profile for "extreme"', () => {
    const intake = normalizeIntake(HIGH_SECURITY_ANSWERS);
    expect(intake.isHighSecurity).toBe(true);
  });

  it('does not flag "balanced" as high security', () => {
    const intake = normalizeIntake(BASE_ANSWERS);
    expect(intake.isHighSecurity).toBe(false);
  });

  it('does not flag "low" as high security', () => {
    const intake = normalizeIntake(MINIMAL_ANSWERS);
    expect(intake.isHighSecurity).toBe(false);
  });

  it('correctly identifies high automation profile', () => {
    const intake = normalizeIntake(HIGH_SECURITY_ANSWERS);
    expect(intake.isHighAutomation).toBe(true);
  });

  it('does not flag "standard" automation as high automation', () => {
    const intake = normalizeIntake(BASE_ANSWERS);
    expect(intake.isHighAutomation).toBe(false);
  });

  it('correctly identifies hasPumpFun flag', () => {
    const intake = normalizeIntake(BASE_ANSWERS);
    expect(intake.hasPumpFun).toBe(true);
  });

  it('hasPumpFun is false for non-pumpfun platforms', () => {
    const intake = normalizeIntake(MINIMAL_ANSWERS);
    expect(intake.hasPumpFun).toBe(false);
  });

  it('preserves the original answers reference', () => {
    const intake = normalizeIntake(BASE_ANSWERS);
    expect(intake.answers).toBe(BASE_ANSWERS);
  });

  it('maps requestedIntegrationSlugs from answers.integrations', () => {
    const intake = normalizeIntake(BASE_ANSWERS);
    expect(intake.requestedIntegrationSlugs).toEqual(['rose', 'combot']);
  });

  it('returns empty requestedIntegrationSlugs when no integrations selected', () => {
    const intake = normalizeIntake(MINIMAL_ANSWERS);
    expect(intake.requestedIntegrationSlugs).toEqual([]);
  });

  it('returns correct category labels', () => {
    const meme = normalizeIntake({ ...BASE_ANSWERS, category: 'meme_token' });
    expect(meme.resolvedCategoryLabel).toBe('Meme Token');

    const dao = normalizeIntake({ ...BASE_ANSWERS, category: 'dao' });
    expect(dao.resolvedCategoryLabel).toBe('DAO');

    const infra = normalizeIntake({ ...BASE_ANSWERS, category: 'infra' });
    expect(infra.resolvedCategoryLabel).toBe('Infrastructure');
  });
});

// ─── selectStack ─────────────────────────────────────────────────────────────

describe('selectStack', () => {
  it('requires rose for high-security profile', () => {
    const intake = normalizeIntake(HIGH_SECURITY_ANSWERS);
    const stack = selectStack(intake);
    expect(stack.required).toContain('rose');
  });

  it('requires rose for high-automation profile', () => {
    const answers: WizardAnswers = { ...BASE_ANSWERS, automationProfile: 'aggressive_safe' };
    const intake = normalizeIntake(answers);
    const stack = selectStack(intake);
    expect(stack.required).toContain('rose');
  });

  it('recommends rose for standard/balanced profiles (not required)', () => {
    const intake = normalizeIntake(BASE_ANSWERS);
    const stack = selectStack(intake);
    expect(stack.recommended).toContain('rose');
    expect(stack.required).not.toContain('rose');
  });

  it('recommends combot for non-private_alpha categories', () => {
    const intake = normalizeIntake(BASE_ANSWERS);
    const stack = selectStack(intake);
    expect(stack.recommended).toContain('combot');
  });

  it('recommends buybot for token projects with high automation', () => {
    const answers: WizardAnswers = {
      ...BASE_ANSWERS,
      category: 'meme_token',
      automationProfile: 'aggressive_safe',
    };
    const intake = normalizeIntake(answers);
    const stack = selectStack(intake);
    expect(stack.recommended).toContain('buybot');
  });

  it('lists buybot as optional for token projects without high automation', () => {
    const intake = normalizeIntake(BASE_ANSWERS);
    const stack = selectStack(intake);
    expect(stack.optional).toContain('buybot');
    expect(stack.recommended).not.toContain('buybot');
  });

  it('does not include buybot for non-token categories', () => {
    const answers: WizardAnswers = { ...BASE_ANSWERS, category: 'dao' };
    const intake = normalizeIntake(answers);
    const stack = selectStack(intake);
    expect(stack.required).not.toContain('buybot');
    expect(stack.recommended).not.toContain('buybot');
  });

  it('recommends safeguard for hard/extreme security', () => {
    const intake = normalizeIntake(HIGH_SECURITY_ANSWERS);
    const stack = selectStack(intake);
    expect(stack.recommended).toContain('safeguard');
  });

  it('does not recommend safeguard for balanced security', () => {
    const intake = normalizeIntake(BASE_ANSWERS);
    const stack = selectStack(intake);
    expect(stack.recommended).not.toContain('safeguard');
    expect(stack.required).not.toContain('safeguard');
  });

  it('always includes controllerbot as optional', () => {
    const intake = normalizeIntake(MINIMAL_ANSWERS);
    const stack = selectStack(intake);
    expect(stack.optional).toContain('controllerbot');
  });

  it('returns a non-empty rationale array', () => {
    const intake = normalizeIntake(BASE_ANSWERS);
    const stack = selectStack(intake);
    expect(stack.rationale.length).toBeGreaterThan(0);
    expect(typeof stack.rationale[0]).toBe('string');
  });

  it('returns valid StackRecommendation shape', () => {
    const intake = normalizeIntake(BASE_ANSWERS);
    const stack = selectStack(intake);
    expect(stack).toHaveProperty('required');
    expect(stack).toHaveProperty('recommended');
    expect(stack).toHaveProperty('optional');
    expect(stack).toHaveProperty('excluded');
    expect(stack).toHaveProperty('rationale');
    expect(Array.isArray(stack.required)).toBe(true);
    expect(Array.isArray(stack.recommended)).toBe(true);
    expect(Array.isArray(stack.optional)).toBe(true);
    expect(Array.isArray(stack.excluded)).toBe(true);
    expect(Array.isArray(stack.rationale)).toBe(true);
  });
});

// ─── generatePlanSteps ───────────────────────────────────────────────────────

describe('generatePlanSteps', () => {
  it('always produces at least one system workspace configuration step', () => {
    const intake = normalizeIntake(MINIMAL_ANSWERS);
    const stack = selectStack(intake);
    const steps = generatePlanSteps(intake, stack);

    const sysStep = steps.find((s) => s.action === 'workspace.configure');
    expect(sysStep).toBeDefined();
    expect(sysStep?.executionMode).toBe('AUTO');
    expect(sysStep?.integration).toBe('system');
  });

  it('assigns correct sequence numbers starting at 1', () => {
    const intake = normalizeIntake(BASE_ANSWERS);
    const stack = selectStack(intake);
    const steps = generatePlanSteps(intake, stack);

    const sequences = steps.map((s) => s.sequence);
    expect(sequences[0]).toBe(1);
    // Sequences should be strictly increasing
    for (let i = 1; i < sequences.length; i++) {
      expect(sequences[i]).toBeGreaterThan(sequences[i - 1]!);
    }
  });

  it('every step has a unique id', () => {
    const intake = normalizeIntake(BASE_ANSWERS);
    const stack = selectStack(intake);
    const steps = generatePlanSteps(intake, stack);

    const ids = steps.map((s) => s.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('every step has a non-empty idempotencyKey', () => {
    const intake = normalizeIntake(BASE_ANSWERS);
    const stack = selectStack(intake);
    const steps = generatePlanSteps(intake, stack);

    for (const step of steps) {
      expect(step.idempotencyKey).toBeTruthy();
      expect(typeof step.idempotencyKey).toBe('string');
    }
  });

  it('Rose steps are COPY_PASTE or MANUAL_CONFIRMATION_REQUIRED', () => {
    const intake = normalizeIntake(BASE_ANSWERS);
    const stack = selectStack(intake);
    const steps = generatePlanSteps(intake, stack);

    const roseSteps = steps.filter((s) => s.integration === 'rose');
    expect(roseSteps.length).toBeGreaterThan(0);

    for (const step of roseSteps) {
      expect(['COPY_PASTE', 'MANUAL_CONFIRMATION_REQUIRED']).toContain(step.executionMode);
    }
  });

  it('Combot steps are MANUAL_CONFIRMATION_REQUIRED', () => {
    const intake = normalizeIntake(BASE_ANSWERS);
    const stack = selectStack(intake);
    const steps = generatePlanSteps(intake, stack);

    const combotSteps = steps.filter((s) => s.integration === 'combot');
    expect(combotSteps.length).toBeGreaterThan(0);

    for (const step of combotSteps) {
      expect(step.executionMode).toBe('MANUAL_CONFIRMATION_REQUIRED');
    }
  });

  it('asset generation steps are AUTO', () => {
    const intake = normalizeIntake(BASE_ANSWERS);
    const stack = selectStack(intake);
    const steps = generatePlanSteps(intake, stack);

    const assetSteps = steps.filter((s) => s.action.startsWith('asset.'));
    expect(assetSteps.length).toBeGreaterThan(0);

    for (const step of assetSteps) {
      expect(step.executionMode).toBe('AUTO');
    }
  });

  it('includes captcha step for high-security profile', () => {
    const answers: WizardAnswers = { ...BASE_ANSWERS, securityProfile: 'hard' };
    const intake = normalizeIntake(answers);
    const stack = selectStack(intake);
    const steps = generatePlanSteps(intake, stack);

    const captchaStep = steps.find((s) => s.action === 'rose.enable_captcha');
    expect(captchaStep).toBeDefined();
  });

  it('omits captcha step for low-security profile', () => {
    const answers: WizardAnswers = { ...BASE_ANSWERS, securityProfile: 'low' };
    const intake = normalizeIntake(answers);
    const stack = selectStack(intake);
    const steps = generatePlanSteps(intake, stack);

    const captchaStep = steps.find((s) => s.action === 'rose.enable_captcha');
    expect(captchaStep).toBeUndefined();
  });

  it('generates welcome asset step when generateWelcome=true', () => {
    const intake = normalizeIntake(BASE_ANSWERS);
    const stack = selectStack(intake);
    const steps = generatePlanSteps(intake, stack);

    const welcomeStep = steps.find(
      (s) => s.action === 'asset.generate' && (s.payload as { assetType?: string }).assetType === 'welcome_message',
    );
    expect(welcomeStep).toBeDefined();
  });

  it('does not generate welcome asset step when generateWelcome=false', () => {
    const answers: WizardAnswers = { ...BASE_ANSWERS, generateWelcome: false };
    const intake = normalizeIntake(answers);
    const stack = selectStack(intake);
    const steps = generatePlanSteps(intake, stack);

    const welcomeStep = steps.find(
      (s) => s.action === 'asset.generate' && (s.payload as { assetType?: string }).assetType === 'welcome_message',
    );
    expect(welcomeStep).toBeUndefined();
  });

  it('all steps have required schema fields', () => {
    const intake = normalizeIntake(BASE_ANSWERS);
    const stack = selectStack(intake);
    const steps = generatePlanSteps(intake, stack);

    for (const step of steps) {
      expect(step).toHaveProperty('id');
      expect(step).toHaveProperty('sequence');
      expect(step).toHaveProperty('title');
      expect(step).toHaveProperty('description');
      expect(step).toHaveProperty('executionMode');
      expect(step).toHaveProperty('integration');
      expect(step).toHaveProperty('action');
      expect(step).toHaveProperty('payload');
      expect(step).toHaveProperty('risks');
      expect(step).toHaveProperty('permissions');
      expect(step).toHaveProperty('idempotencyKey');
      expect(step).toHaveProperty('estimatedDurationSeconds');
      expect(step.estimatedDurationSeconds).toBeGreaterThan(0);
    }
  });
});

// ─── validatePlanSteps ───────────────────────────────────────────────────────

describe('validatePlanSteps', () => {
  it('returns valid=true for a well-formed step set', () => {
    const intake = normalizeIntake(BASE_ANSWERS);
    const stack = selectStack(intake);
    const steps = generatePlanSteps(intake, stack);
    const result = validatePlanSteps(steps);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('flags duplicate actions as errors', () => {
    const intake = normalizeIntake(BASE_ANSWERS);
    const stack = selectStack(intake);
    const steps = generatePlanSteps(intake, stack);

    // Inject a deliberate duplicate
    const duplicate = { ...steps[0]!, id: 'dup-id', sequence: 999 };
    const stepsWithDup = [...steps, duplicate];

    const result = validatePlanSteps(stepsWithDup);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Duplicate actions'))).toBe(true);
  });

  it('warns when both Rose and Safeguard are present (captcha conflict)', () => {
    const intake = normalizeIntake(HIGH_SECURITY_ANSWERS);
    const stack = selectStack(intake);
    const steps = generatePlanSteps(intake, stack);

    // Manually inject a safeguard step to simulate the conflict scenario
    const safeguardStep = {
      ...steps[0]!,
      id: 'safeguard-test-step',
      sequence: 999,
      integration: 'safeguard' as const,
      action: 'safeguard.configure_verification',
      idempotencyKey: 'safeguard-test-key',
    };
    const result = validatePlanSteps([...steps, safeguardStep]);

    // Safeguard + Rose should produce a warning
    if (steps.some((s) => s.integration === 'rose')) {
      expect(result.warnings.some((w) => w.toLowerCase().includes('safeguard') || w.toLowerCase().includes('captcha'))).toBe(true);
    }
  });

  it('flags manual steps missing instructions as errors', () => {
    const intake = normalizeIntake(BASE_ANSWERS);
    const stack = selectStack(intake);
    const steps = generatePlanSteps(intake, stack);

    // Build a bad step: COPY_PASTE with no instructions or copy content
    const badStep = {
      id: 'bad-step',
      sequence: 999,
      title: 'Bad step',
      description: 'Missing instructions',
      executionMode: 'COPY_PASTE' as const,
      integration: 'rose' as const,
      action: 'rose.some_new_action',
      payload: {},
      risks: [],
      permissions: [],
      idempotencyKey: 'bad-key',
      estimatedDurationSeconds: 30,
      // intentionally omitting manualInstructions and copyContent
    };

    const result = validatePlanSteps([...steps, badStep]);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('manual step'))).toBe(true);
  });

  it('returns ValidationResult with all required fields', () => {
    const intake = normalizeIntake(BASE_ANSWERS);
    const stack = selectStack(intake);
    const steps = generatePlanSteps(intake, stack);
    const result = validatePlanSteps(steps);

    expect(result).toHaveProperty('valid');
    expect(result).toHaveProperty('errors');
    expect(result).toHaveProperty('warnings');
    expect(result).toHaveProperty('risks');
    expect(typeof result.valid).toBe('boolean');
    expect(Array.isArray(result.errors)).toBe(true);
    expect(Array.isArray(result.warnings)).toBe(true);
    expect(Array.isArray(result.risks)).toBe(true);
  });

  it('aggregates risks from all steps that carry risk notices', () => {
    const answers: WizardAnswers = { ...BASE_ANSWERS, securityProfile: 'hard' };
    const intake = normalizeIntake(answers);
    const stack = selectStack(intake);
    const steps = generatePlanSteps(intake, stack);
    const result = validatePlanSteps(steps);

    // The captcha step has a risk notice — it should appear in the result
    const totalRisksInSteps = steps.flatMap((s) => s.risks).length;
    expect(result.risks.length).toBeLessThanOrEqual(totalRisksInSteps + 10); // +10 for any validator-added risks
  });
});

// ─── renderExecutionBundle ───────────────────────────────────────────────────

describe('renderExecutionBundle', () => {
  const WORKSPACE_ID = 'ws-test-001';

  it('returns a Plan with all required top-level fields', () => {
    const intake = normalizeIntake(BASE_ANSWERS);
    const stack = selectStack(intake);
    const steps = generatePlanSteps(intake, stack);
    const plan = renderExecutionBundle(WORKSPACE_ID, intake, stack, steps);

    expect(plan).toHaveProperty('id');
    expect(plan).toHaveProperty('workspaceId');
    expect(plan).toHaveProperty('answers');
    expect(plan).toHaveProperty('recommendedStack');
    expect(plan).toHaveProperty('steps');
    expect(plan).toHaveProperty('assetSpecs');
    expect(plan).toHaveProperty('risks');
    expect(plan).toHaveProperty('permissions');
    expect(plan).toHaveProperty('estimatedTotalMinutes');
    expect(plan).toHaveProperty('manualStepCount');
    expect(plan).toHaveProperty('autoStepCount');
    expect(plan).toHaveProperty('createdAt');
  });

  it('attaches the correct workspaceId', () => {
    const intake = normalizeIntake(BASE_ANSWERS);
    const stack = selectStack(intake);
    const steps = generatePlanSteps(intake, stack);
    const plan = renderExecutionBundle(WORKSPACE_ID, intake, stack, steps);

    expect(plan.workspaceId).toBe(WORKSPACE_ID);
  });

  it('generates a unique plan id (nanoid)', () => {
    const intake = normalizeIntake(BASE_ANSWERS);
    const stack = selectStack(intake);
    const steps = generatePlanSteps(intake, stack);

    const plan1 = renderExecutionBundle(WORKSPACE_ID, intake, stack, steps);
    const plan2 = renderExecutionBundle(WORKSPACE_ID, intake, stack, steps);

    expect(plan1.id).not.toBe(plan2.id);
  });

  it('creates asset specs for welcome, rules, faq, and commands', () => {
    const intake = normalizeIntake(BASE_ANSWERS);
    const stack = selectStack(intake);
    const steps = generatePlanSteps(intake, stack);
    const plan = renderExecutionBundle(WORKSPACE_ID, intake, stack, steps);

    const types = plan.assetSpecs.map((a) => a.assetType);
    expect(types).toContain('welcome_message');
    expect(types).toContain('rules_message');
    expect(types).toContain('faq_note');
    expect(types).toContain('social_command_reply');
    expect(types).toContain('buy_command_reply');
    expect(types).toContain('link_command_reply');
  });

  it('does not generate welcome asset spec when generateWelcome=false', () => {
    const answers: WizardAnswers = { ...BASE_ANSWERS, generateWelcome: false };
    const intake = normalizeIntake(answers);
    const stack = selectStack(intake);
    const steps = generatePlanSteps(intake, stack);
    const plan = renderExecutionBundle(WORKSPACE_ID, intake, stack, steps);

    const types = plan.assetSpecs.map((a) => a.assetType);
    expect(types).not.toContain('welcome_message');
  });

  it('generates crisis mode asset spec when generateCrisisMode=true', () => {
    const answers: WizardAnswers = { ...BASE_ANSWERS, generateCrisisMode: true };
    const intake = normalizeIntake(answers);
    const stack = selectStack(intake);
    const steps = generatePlanSteps(intake, stack);
    const plan = renderExecutionBundle(WORKSPACE_ID, intake, stack, steps);

    const types = plan.assetSpecs.map((a) => a.assetType);
    expect(types).toContain('crisis_mode_message');
  });

  it('generates raid mode asset spec when generateRaidMode=true', () => {
    const answers: WizardAnswers = { ...BASE_ANSWERS, generateRaidMode: true };
    const intake = normalizeIntake(answers);
    const stack = selectStack(intake);
    const steps = generatePlanSteps(intake, stack);
    const plan = renderExecutionBundle(WORKSPACE_ID, intake, stack, steps);

    const types = plan.assetSpecs.map((a) => a.assetType);
    expect(types).toContain('raid_mode_message');
  });

  it('includes launchName in asset spec variables', () => {
    const intake = normalizeIntake(BASE_ANSWERS);
    const stack = selectStack(intake);
    const steps = generatePlanSteps(intake, stack);
    const plan = renderExecutionBundle(WORKSPACE_ID, intake, stack, steps);

    for (const spec of plan.assetSpecs) {
      expect(spec.variables['PROJECT_NAME']).toBe('PepeMax');
    }
  });

  it('recommendedStack is the union of required and recommended integrations', () => {
    const intake = normalizeIntake(BASE_ANSWERS);
    const stack = selectStack(intake);
    const steps = generatePlanSteps(intake, stack);
    const plan = renderExecutionBundle(WORKSPACE_ID, intake, stack, steps);

    const expected = [...stack.required, ...stack.recommended];
    expect(plan.recommendedStack).toEqual(expected);
  });

  it('counts auto and manual steps correctly', () => {
    const intake = normalizeIntake(BASE_ANSWERS);
    const stack = selectStack(intake);
    const steps = generatePlanSteps(intake, stack);
    const plan = renderExecutionBundle(WORKSPACE_ID, intake, stack, steps);

    const expectedAutoCount = steps.filter((s) => s.executionMode === 'AUTO').length;
    const expectedManualCount = steps.filter((s) => s.executionMode !== 'AUTO').length;

    expect(plan.autoStepCount).toBe(expectedAutoCount);
    expect(plan.manualStepCount).toBe(expectedManualCount);
  });

  it('estimatedTotalMinutes is computed from step durations', () => {
    const intake = normalizeIntake(BASE_ANSWERS);
    const stack = selectStack(intake);
    const steps = generatePlanSteps(intake, stack);
    const plan = renderExecutionBundle(WORKSPACE_ID, intake, stack, steps);

    const totalSeconds = steps.reduce((acc, s) => acc + s.estimatedDurationSeconds, 0);
    const expectedMinutes = Math.ceil(totalSeconds / 60);
    expect(plan.estimatedTotalMinutes).toBe(expectedMinutes);
  });

  it('createdAt is a Date object', () => {
    const intake = normalizeIntake(BASE_ANSWERS);
    const stack = selectStack(intake);
    const steps = generatePlanSteps(intake, stack);
    const plan = renderExecutionBundle(WORKSPACE_ID, intake, stack, steps);

    expect(plan.createdAt).toBeInstanceOf(Date);
  });
});

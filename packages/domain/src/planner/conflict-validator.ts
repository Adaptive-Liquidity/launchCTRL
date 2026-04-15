import type { PlanStep, RiskNotice } from '@launchctrl/types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  risks: RiskNotice[];
}

export function validatePlanSteps(steps: PlanStep[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const risks: RiskNotice[] = [];

  // Check for conflicting integrations
  const integrations = new Set(steps.map((s) => s.integration));

  if (integrations.has('rose') && integrations.has('safeguard')) {
    warnings.push(
      'Both Rose and Safeguard are configured. They may conflict on captcha/verification. Ensure only one handles new member verification.',
    );
    risks.push({
      level: 'medium',
      title: 'Captcha/verification conflict',
      description:
        'Rose and Safeguard both offer captcha functionality. Having both enabled can cause double-challenge flows.',
      mitigation: 'Disable captcha in one of them. We recommend keeping Rose for messages, Safeguard for verification.',
    });
  }

  // Check for duplicate action types
  const actions = steps.map((s) => s.action);
  const duplicates = actions.filter((a, i) => actions.indexOf(a) !== i);
  if (duplicates.length > 0) {
    errors.push(`Duplicate actions detected: ${[...new Set(duplicates)].join(', ')}`);
  }

  // Check all manual steps have instructions
  const manualStepsWithoutInstructions = steps.filter(
    (s) =>
      (s.executionMode === 'MANUAL_CONFIRMATION_REQUIRED' || s.executionMode === 'COPY_PASTE') &&
      !s.manualInstructions &&
      !s.copyContent,
  );
  if (manualStepsWithoutInstructions.length > 0) {
    errors.push(
      `${manualStepsWithoutInstructions.length} manual step(s) missing instructions or copy content.`,
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    risks,
  };
}

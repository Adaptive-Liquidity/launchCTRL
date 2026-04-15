import type { IntegrationSlug } from '@launchctrl/types';
import type { NormalizedIntake } from './intake.js';

export interface StackRecommendation {
  required: IntegrationSlug[];
  recommended: IntegrationSlug[];
  optional: IntegrationSlug[];
  excluded: IntegrationSlug[];
  rationale: string[];
}

export function selectStack(intake: NormalizedIntake): StackRecommendation {
  const required: IntegrationSlug[] = [];
  const recommended: IntegrationSlug[] = [];
  const optional: IntegrationSlug[] = [];
  const excluded: IntegrationSlug[] = [];
  const rationale: string[] = [];

  // Rose is almost universally required
  if (intake.isHighSecurity || intake.isHighAutomation) {
    required.push('rose');
    rationale.push('Rose Bot required for your security/automation profile');
  } else {
    recommended.push('rose');
    rationale.push('Rose Bot strongly recommended for group management');
  }

  // Combot for analytics
  if (intake.isHighAutomation || intake.answers.category !== 'private_alpha') {
    recommended.push('combot');
    rationale.push('Combot recommended for analytics and anti-spam');
  }

  // Buy bot for token projects
  if (['token', 'meme_token', 'utility_token'].includes(intake.answers.category)) {
    if (intake.isHighAutomation) {
      recommended.push('buybot');
      rationale.push('Buy Bot recommended for token communities with automation enabled');
    } else {
      optional.push('buybot');
    }
  }

  // Alert bot for high-automation projects
  if (intake.isHighAutomation) {
    optional.push('alertbot');
  }

  // Safeguard for high security
  if (intake.isHighSecurity) {
    recommended.push('safeguard');
    rationale.push('Safeguard recommended for your hard/extreme security profile');
  }

  // ControllerBot for channels
  optional.push('controllerbot');

  // Exclude conflicting tools
  // (In production this would be more sophisticated)

  return {
    required,
    recommended,
    optional,
    excluded,
    rationale,
  };
}

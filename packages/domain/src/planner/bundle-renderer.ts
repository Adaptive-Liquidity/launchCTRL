import { nanoid } from 'nanoid';
import type { Plan, WizardAnswers } from '@launchctrl/types';
import type { NormalizedIntake } from './intake.js';
import type { StackRecommendation } from './stack-selector.js';
import type { PlanStep, GeneratedAssetSpec } from '@launchctrl/types';

export function renderExecutionBundle(
  workspaceId: string,
  intake: NormalizedIntake,
  stack: StackRecommendation,
  steps: PlanStep[],
): Plan {
  const assetSpecs: GeneratedAssetSpec[] = [];
  const answers = intake.answers;

  if (answers.generateWelcome) {
    assetSpecs.push({
      assetType: 'welcome_message',
      name: `${answers.launchName} — Welcome Message`,
      tone: answers.toneProfile,
      variables: {
        PROJECT_NAME: answers.launchName,
        TICKER: answers.launchTicker ?? '',
        PLATFORM: intake.resolvedPlatformLabel,
      },
      skillPackId: 'welcome-copy-studio',
    });
  }

  if (answers.generateRules) {
    assetSpecs.push({
      assetType: 'rules_message',
      name: `${answers.launchName} — Community Rules`,
      tone: answers.toneProfile,
      variables: {
        PROJECT_NAME: answers.launchName,
      },
      skillPackId: 'rose-core',
    });
  }

  if (answers.generateFaq) {
    assetSpecs.push({
      assetType: 'faq_note',
      name: `${answers.launchName} — FAQ`,
      tone: answers.toneProfile,
      variables: {
        PROJECT_NAME: answers.launchName,
        TICKER: answers.launchTicker ?? '',
        WEBSITE: answers.websiteUrl ?? '',
        TWITTER: answers.twitterUrl ?? '',
      },
      skillPackId: 'faq-pack',
    });
  }

  if (answers.generateCommands) {
    const commandTypes: Array<GeneratedAssetSpec['assetType']> = [
      'social_command_reply',
      'buy_command_reply',
      'link_command_reply',
    ];
    for (const assetType of commandTypes) {
      assetSpecs.push({
        assetType,
        name: `${answers.launchName} — ${assetType.replace(/_/g, ' ')}`,
        tone: answers.toneProfile,
        variables: {
          PROJECT_NAME: answers.launchName,
          TICKER: answers.launchTicker ?? '',
          WEBSITE: answers.websiteUrl ?? '',
          TWITTER: answers.twitterUrl ?? '',
          TELEGRAM: answers.telegramUrl ?? '',
        },
        skillPackId: 'command-pack-socials',
      });
    }
  }

  if (answers.generateCrisisMode) {
    assetSpecs.push({
      assetType: 'crisis_mode_message',
      name: `${answers.launchName} — Crisis Mode`,
      tone: answers.toneProfile,
      variables: { PROJECT_NAME: answers.launchName },
      skillPackId: 'crisis-mode',
    });
  }

  if (answers.generateRaidMode) {
    assetSpecs.push({
      assetType: 'raid_mode_message',
      name: `${answers.launchName} — Raid Mode`,
      tone: answers.toneProfile,
      variables: { PROJECT_NAME: answers.launchName },
      skillPackId: 'raid-mode',
    });
  }

  const autoStepCount = steps.filter((s) => s.executionMode === 'AUTO').length;
  const manualStepCount = steps.filter(
    (s) => s.executionMode !== 'AUTO',
  ).length;
  const totalSeconds = steps.reduce((acc, s) => acc + s.estimatedDurationSeconds, 0);

  const allRisks = steps.flatMap((s) => s.risks);
  const allPermissions = steps.flatMap((s) => s.permissions);

  return {
    id: nanoid(),
    workspaceId,
    answers,
    recommendedStack: [...stack.required, ...stack.recommended],
    steps,
    assetSpecs,
    risks: allRisks,
    permissions: allPermissions,
    estimatedTotalMinutes: Math.ceil(totalSeconds / 60),
    manualStepCount,
    autoStepCount,
    createdAt: new Date(),
  };
}

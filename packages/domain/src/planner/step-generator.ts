import { nanoid } from 'nanoid';
import type { PlanStep, ExecutionMode, RiskNotice } from '@launchctrl/types';
import type { NormalizedIntake } from './intake.js';
import type { StackRecommendation } from './stack-selector.js';
import { generateIdempotencyKey } from '@launchctrl/lib';

export function generatePlanSteps(
  intake: NormalizedIntake,
  stack: StackRecommendation,
): PlanStep[] {
  const steps: PlanStep[] = [];
  let sequence = 1;

  function addStep(
    partial: Omit<PlanStep, 'id' | 'sequence' | 'idempotencyKey' | 'risks' | 'permissions'> &
      Partial<Pick<PlanStep, 'risks' | 'permissions'>>,
  ): void {
    steps.push({
      id: nanoid(),
      sequence: sequence++,
      risks: [],
      permissions: [],
      ...partial,
      idempotencyKey: generateIdempotencyKey(
        intake.answers.launchName,
        partial.action,
        partial.integration,
        String(sequence),
      ),
    });
  }

  // === SYSTEM STEPS ===
  addStep({
    title: 'Create workspace configuration',
    description: 'Initialize workspace settings and metadata for this launch.',
    executionMode: 'AUTO',
    integration: 'system',
    action: 'workspace.configure',
    payload: {
      launchName: intake.answers.launchName,
      category: intake.answers.category,
      platform: intake.answers.platform,
      securityProfile: intake.answers.securityProfile,
      automationProfile: intake.answers.automationProfile,
    },
    estimatedDurationSeconds: 2,
  });

  // === ROSE BOT STEPS ===
  if (stack.required.includes('rose') || stack.recommended.includes('rose')) {
    const executionMode: ExecutionMode = 'COPY_PASTE';

    addStep({
      title: 'Add Rose Bot to your group',
      description:
        'Add @MissRose_bot as an administrator to your Telegram group with the required permissions.',
      executionMode: 'MANUAL_CONFIRMATION_REQUIRED',
      integration: 'rose',
      action: 'rose.add_to_group',
      payload: { botUsername: 'MissRose_bot' },
      manualInstructions: [
        '1. Open your Telegram group',
        '2. Tap the group name → Edit → Administrators',
        '3. Add @MissRose_bot',
        '4. Enable: Delete messages, Ban users, Pin messages, Invite users',
        '5. Tap Save',
      ].join('\n'),
      permissions: [
        { resource: 'Telegram Group', required: 'Add Admin', why: 'Rose needs admin rights to function' },
      ],
      estimatedDurationSeconds: 120,
    });

    addStep({
      title: 'Configure Rose Bot welcome message',
      description: 'Set up the welcome message that greets new members.',
      executionMode,
      integration: 'rose',
      action: 'rose.set_welcome',
      payload: {
        tone: intake.answers.toneProfile,
        projectName: intake.answers.launchName,
      },
      copyContent: `/setwelcome Welcome to {first}! 🎉\n\nYou've joined {chat_name}.\n\nPlease read the rules and enjoy the community!`,
      manualInstructions:
        'Send this command in your group chat. Customize the message as desired before sending.',
      estimatedDurationSeconds: 30,
    });

    if (intake.isHighSecurity) {
      addStep({
        title: 'Enable Rose Bot captcha verification',
        description: 'Require new members to complete a captcha before they can send messages.',
        executionMode,
        integration: 'rose',
        action: 'rose.enable_captcha',
        payload: { enabled: true },
        copyContent: `/captcha on`,
        manualInstructions: 'Send this command in your group to enable captcha for new members.',
        risks: [
          {
            level: 'low',
            title: 'Increased join friction',
            description: 'Captcha adds friction to legitimate users. Monitor join rate after enabling.',
          },
        ],
        estimatedDurationSeconds: 10,
      });
    }

    addStep({
      title: 'Configure Rose Bot anti-spam filters',
      description: 'Set up filters to block spam, scam links, and bot accounts.',
      executionMode,
      integration: 'rose',
      action: 'rose.configure_filters',
      payload: {
        antiSpamLevel: intake.answers.securityProfile,
        allowLinks: intake.answers.securityProfile === 'low',
      },
      copyContent: generateRoseAntiSpamCommands(intake.answers.securityProfile),
      manualInstructions: 'Run each command in your group, one at a time.',
      estimatedDurationSeconds: 60,
    });

    if (intake.answers.generateRules) {
      addStep({
        title: 'Set Rose Bot rules',
        description: 'Configure the /rules command with your community rules.',
        executionMode,
        integration: 'rose',
        action: 'rose.set_rules',
        payload: { tone: intake.answers.toneProfile },
        copyContent: `/setrules Rules will be inserted from generated assets. Edit before sending.`,
        manualInstructions: 'Replace the rules content with your generated rules asset, then send.',
        estimatedDurationSeconds: 30,
      });
    }
  }

  // === COMBOT STEPS ===
  if (stack.recommended.includes('combot') || stack.required.includes('combot')) {
    addStep({
      title: 'Add Combot to your group',
      description: 'Add @combot as an administrator to enable analytics and moderation.',
      executionMode: 'MANUAL_CONFIRMATION_REQUIRED',
      integration: 'combot',
      action: 'combot.add_to_group',
      payload: { botUsername: 'combot' },
      manualInstructions: [
        '1. Open your Telegram group',
        '2. Tap group name → Edit → Administrators',
        '3. Add @combot',
        '4. Enable: Delete messages, Ban users',
        '5. Visit https://combot.org and connect your group',
      ].join('\n'),
      permissions: [
        { resource: 'Telegram Group', required: 'Add Admin', why: 'Combot needs admin rights for moderation' },
      ],
      estimatedDurationSeconds: 180,
    });

    addStep({
      title: 'Configure Combot anti-spam settings',
      description:
        'Set up Combot anti-spam rules via the Combot dashboard (manual step — API not available for all settings).',
      executionMode: 'MANUAL_CONFIRMATION_REQUIRED',
      integration: 'combot',
      action: 'combot.configure_antispam',
      payload: { securityProfile: intake.answers.securityProfile },
      manualInstructions: [
        '1. Go to https://combot.org/c/YOUR_CHAT_ID',
        '2. Click "Anti-Spam" tab',
        `3. Set spam level to: ${getComBotSpamLevel(intake.answers.securityProfile)}`,
        '4. Enable: CAS ban, Block forwarded messages from channels',
        intake.isHighSecurity ? '5. Enable: New account restrictions (accounts under 7 days old)' : '',
      ]
        .filter(Boolean)
        .join('\n'),
      estimatedDurationSeconds: 300,
    });
  }

  // === ASSET GENERATION STEPS ===
  if (intake.answers.generateWelcome) {
    addStep({
      title: 'Generate welcome message',
      description: 'Create a customized welcome message for new members.',
      executionMode: 'AUTO',
      integration: 'system',
      action: 'asset.generate',
      payload: {
        assetType: 'welcome_message',
        tone: intake.answers.toneProfile,
        projectName: intake.answers.launchName,
        platform: intake.answers.platform,
      },
      estimatedDurationSeconds: 3,
    });
  }

  if (intake.answers.generateRules) {
    addStep({
      title: 'Generate community rules',
      description: 'Create a comprehensive rules document for your community.',
      executionMode: 'AUTO',
      integration: 'system',
      action: 'asset.generate',
      payload: {
        assetType: 'rules_message',
        tone: intake.answers.toneProfile,
        category: intake.answers.category,
      },
      estimatedDurationSeconds: 3,
    });
  }

  if (intake.answers.generateCommands) {
    addStep({
      title: 'Generate social commands',
      description: 'Create /twitter, /website, /chart, /buy command responses.',
      executionMode: 'AUTO',
      integration: 'system',
      action: 'asset.generate_batch',
      payload: {
        assetTypes: ['social_command_reply', 'buy_command_reply', 'link_command_reply'],
        tone: intake.answers.toneProfile,
        urls: {
          twitter: intake.answers.twitterUrl,
          website: intake.answers.websiteUrl,
          telegram: intake.answers.telegramUrl,
        },
      },
      estimatedDurationSeconds: 5,
    });
  }

  if (intake.answers.generateCrisisMode) {
    addStep({
      title: 'Generate crisis mode templates',
      description: 'Pre-built copy for locking down the group during FUD or attacks.',
      executionMode: 'AUTO',
      integration: 'system',
      action: 'asset.generate',
      payload: {
        assetType: 'crisis_mode_message',
        tone: intake.answers.toneProfile,
      },
      estimatedDurationSeconds: 3,
      risks: [
        {
          level: 'low',
          title: 'Use only when needed',
          description: 'Crisis mode messages are high-visibility. Use sparingly.',
        },
      ],
    });
  }

  if (intake.answers.generateRaidMode) {
    addStep({
      title: 'Generate raid mode templates',
      description: 'Pre-built copy for enabling anti-raid lockdown.',
      executionMode: 'AUTO',
      integration: 'system',
      action: 'asset.generate',
      payload: {
        assetType: 'raid_mode_message',
        tone: intake.answers.toneProfile,
      },
      estimatedDurationSeconds: 3,
    });
  }

  return steps;
}

function generateRoseAntiSpamCommands(securityProfile: string): string {
  const base = [
    '/antiflood 5',
    '/cleanservice on',
    '/welcomemute on',
    '/blacklistdelete on',
  ];

  if (securityProfile === 'balanced' || securityProfile === 'hard' || securityProfile === 'extreme') {
    base.push('/welcomemute on', '/antiarabic off');
  }

  if (securityProfile === 'hard' || securityProfile === 'extreme') {
    base.push('/antiflood 3', '/setfloodaction ban', '/welcome on');
  }

  return base.join('\n');
}

function getComBotSpamLevel(securityProfile: string): string {
  const levels: Record<string, string> = {
    low: 'Low (1)',
    balanced: 'Medium (3)',
    hard: 'High (7)',
    extreme: 'Maximum (10)',
  };
  return levels[securityProfile] ?? 'Medium (3)';
}

import type { PlanStep, ExecutionMode } from '@launchctrl/types';
import type { IntegrationAdapter, AdapterExecuteResult, AdapterActionInput } from '../base/adapter.interface.js';
import { COMBOT_CAPABILITIES } from '../base/capability.types.js';

export class CombotAdapter implements IntegrationAdapter {
  readonly slug = 'combot';
  readonly displayName = 'Combot';
  readonly capabilities = COMBOT_CAPABILITIES;

  getExecutionMode(action: string): ExecutionMode {
    // Combot dashboard config = manual, basic stats may be API-backed
    const manualDashboardActions = [
      'combot.add_to_group',
      'combot.configure_antispam',
      'combot.enable_cas',
    ];

    if (manualDashboardActions.includes(action)) return 'MANUAL_CONFIRMATION_REQUIRED';
    return 'MANUAL_CONFIRMATION_REQUIRED';
  }

  async execute(input: AdapterActionInput): Promise<AdapterExecuteResult> {
    const { action, payload } = input;

    switch (action) {
      case 'combot.add_to_group':
        return {
          success: true,
          output: { mode: 'manual' },
          error: null,
          requiresManualFollowUp: true,
          manualInstructions: [
            '1. Add @combot to your group as administrator',
            '2. Grant: Delete messages, Ban users',
            '3. Visit https://combot.org and log in',
            '4. Connect your group to the Combot dashboard',
            '5. Configure anti-spam in the dashboard',
          ].join('\n'),
        };

      case 'combot.configure_antispam': {
        const spamLevel = payload['spamLevel'] as number;
        const chatId = payload['chatId'] as string;

        return {
          success: true,
          output: { mode: 'manual_dashboard' },
          error: null,
          requiresManualFollowUp: true,
          manualInstructions: [
            `1. Go to https://combot.org/c/${chatId ?? 'YOUR_CHAT_ID'}`,
            '2. Click the "Anti-Spam" tab',
            `3. Set spam sensitivity to ${spamLevel ?? 5}/10`,
            '4. Enable: CAS (Combot Anti-Spam) ban list',
            '5. Enable: Block forwarded channel messages (if high security)',
            '6. Save settings',
          ].join('\n'),
        };
      }

      default:
        return {
          success: false,
          output: {},
          error: `Unknown Combot action: ${action}`,
          requiresManualFollowUp: false,
        };
    }
  }

  canExecute(action: string, _config: Record<string, unknown>): boolean {
    return [
      'combot.add_to_group',
      'combot.configure_antispam',
      'combot.enable_cas',
    ].includes(action);
  }

  describeStep(step: PlanStep): string {
    return `Combot: ${step.title} (Manual Dashboard)`;
  }
}

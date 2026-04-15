import type { PlanStep, ExecutionMode } from '@launchctrl/types';
import type { IntegrationAdapter, AdapterExecuteResult, AdapterActionInput } from '../base/adapter.interface.js';
import { ROSE_CAPABILITIES } from '../base/capability.types.js';
import { RoseCommandGenerator } from './rose.generator.js';

export class RoseAdapter implements IntegrationAdapter {
  readonly slug = 'rose';
  readonly displayName = 'Rose Bot';
  readonly capabilities = ROSE_CAPABILITIES;

  private generator = new RoseCommandGenerator();

  getExecutionMode(action: string): ExecutionMode {
    // Rose Bot has no public API — all actions are COPY_PASTE or MANUAL
    const manualActions = ['rose.add_to_group'];
    const copyPasteActions = [
      'rose.set_welcome',
      'rose.set_rules',
      'rose.enable_captcha',
      'rose.configure_antiflood',
      'rose.configure_filters',
      'rose.save_note',
    ];

    if (manualActions.includes(action)) return 'MANUAL_CONFIRMATION_REQUIRED';
    if (copyPasteActions.includes(action)) return 'COPY_PASTE';

    return 'MANUAL_CONFIRMATION_REQUIRED';
  }

  async execute(input: AdapterActionInput): Promise<AdapterExecuteResult> {
    const { action, payload, dryRun } = input;

    // Rose never actually executes — it generates commands for humans
    // This is honest automation: we know the limitation and design around it

    switch (action) {
      case 'rose.add_to_group':
        return {
          success: true,
          output: { mode: 'manual' },
          error: null,
          requiresManualFollowUp: true,
          manualInstructions: [
            'Open your Telegram group in the app',
            'Tap the group name → Edit → Administrators',
            'Add @MissRose_bot',
            'Grant permissions: Delete messages, Ban users, Pin messages, Invite users',
            'Tap Save',
          ].join('\n'),
        };

      case 'rose.set_welcome': {
        const msg = payload['welcomeMessage'] as string;
        const command = `/setwelcome ${msg}`;
        return {
          success: true,
          output: { command, mode: 'copy_paste' },
          error: null,
          requiresManualFollowUp: true,
          copyContent: command,
          manualInstructions: 'Send this command in your group chat as an administrator.',
        };
      }

      case 'rose.configure_filters': {
        const securityProfile = payload['securityProfile'] as string;
        const commands = this.generator.generateSetupBundle({
          welcomeMessage: 'Welcome {first}!',
          captchaEnabled: securityProfile !== 'low',
          antiFloodThreshold: securityProfile === 'extreme' ? 3 : securityProfile === 'hard' ? 4 : 5,
          blockForwardedMessages: securityProfile !== 'low',
          blockLinks: securityProfile === 'hard' || securityProfile === 'extreme',
        });

        return {
          success: true,
          output: { commands, mode: 'copy_paste' },
          error: null,
          requiresManualFollowUp: true,
          copyContent: this.generator.formatBundle(commands),
          manualInstructions: 'Send each command in your group chat. Run them one at a time.',
        };
      }

      default:
        return {
          success: false,
          output: {},
          error: `Unknown Rose action: ${action}`,
          requiresManualFollowUp: false,
        };
    }
  }

  canExecute(action: string, _config: Record<string, unknown>): boolean {
    // Rose actions can always be "executed" — they produce copy/manual instructions
    const knownActions = [
      'rose.add_to_group',
      'rose.set_welcome',
      'rose.set_rules',
      'rose.enable_captcha',
      'rose.configure_antiflood',
      'rose.configure_filters',
      'rose.save_note',
    ];
    return knownActions.includes(action);
  }

  describeStep(step: PlanStep): string {
    return `Rose Bot: ${step.title} (${this.getExecutionMode(step.action)})`;
  }
}

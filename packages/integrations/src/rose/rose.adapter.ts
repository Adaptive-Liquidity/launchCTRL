import type { PlanStep, ExecutionMode } from '@launchctrl/types';
import type { IntegrationAdapter, AdapterExecuteResult, AdapterActionInput } from '../base/adapter.interface.js';
import { ROSE_CAPABILITIES } from '../base/capability.types.js';
import { RoseCommandGenerator } from './rose.generator.js';

export class RoseAdapter implements IntegrationAdapter {
  readonly slug = 'rose';
  readonly displayName = 'Rose Bot';
  readonly capabilities = ROSE_CAPABILITIES;

  private generator = new RoseCommandGenerator();

  /**
   * Execution mode depends on whether a userbot session is available.
   * - With session: AUTO (agent sends commands directly)
   * - Without session: COPY_PASTE (generate commands for human to paste)
   */
  getExecutionMode(action: string, context?: { hasUserbotSession?: boolean }): ExecutionMode {
    const hasSession = context?.hasUserbotSession ?? false;

    // Adding Rose to a group always requires manual action (Telegram UI)
    if (action === 'rose.add_to_group') return 'MANUAL_CONFIRMATION_REQUIRED';

    // All other Rose actions: AUTO with userbot, COPY_PASTE without
    const automatable = [
      'rose.set_welcome',
      'rose.set_rules',
      'rose.enable_captcha',
      'rose.configure_antiflood',
      'rose.configure_filters',
      'rose.save_note',
      'rose.apply_baseline',
      'rose.apply_hardening',
      'rose.lock_forwards',
      'rose.lock_links',
    ];

    if (automatable.includes(action)) {
      return hasSession ? 'AUTO' : 'COPY_PASTE';
    }

    return 'MANUAL_CONFIRMATION_REQUIRED';
  }

  async execute(input: AdapterActionInput): Promise<AdapterExecuteResult> {
    const { action, payload, dryRun, context } = input;
    const groupId = payload['groupId'] as string | undefined;
    const encryptedSession = context?.['encryptedUserbotSession'] as string | undefined;
    const hasSession = !!encryptedSession && !!groupId;

    // ── Userbot AUTO path ──────────────────────────────────────────────────
    if (hasSession && action !== 'rose.add_to_group') {
      return this.executeViaUserbot(action, payload, encryptedSession!, groupId!, dryRun);
    }

    // ── Fallback: COPY_PASTE / MANUAL path ────────────────────────────────
    return this.executeAsCopyPaste(action, payload);
  }

  private async executeViaUserbot(
    action: string,
    payload: Record<string, unknown>,
    encryptedSession: string,
    groupId: string,
    dryRun: boolean,
  ): Promise<AdapterExecuteResult> {
    // Dynamically import userbot-agent to avoid hard dep when session not available
    const { RoseCommander } = await import('@launchctrl/userbot-agent');
    const commander = new RoseCommander({ encryptedSessionString: encryptedSession, groupId, dryRun });

    try {
      let result;

      switch (action) {
        case 'rose.set_welcome':
          result = await commander.setWelcome(payload['welcomeMessage'] as string);
          break;
        case 'rose.set_rules':
          result = await commander.setRules(payload['rules'] as string);
          break;
        case 'rose.enable_captcha':
          result = await commander.enableCaptcha((payload['captchaMode'] as any) ?? 'button');
          break;
        case 'rose.configure_antiflood':
          result = await commander.setFlood(
            (payload['floodLimit'] as number) ?? 5,
            (payload['floodMode'] as any) ?? 'mute',
          );
          break;
        case 'rose.lock_forwards':
          result = await commander.lockForwards();
          break;
        case 'rose.lock_links':
          result = await commander.lockLinks();
          break;
        case 'rose.save_note':
          result = await commander.saveNote(
            payload['noteName'] as string,
            payload['noteContent'] as string,
          );
          break;
        case 'rose.apply_baseline':
        case 'rose.configure_filters':
          result = await commander.applyBaselineSetup({
            welcomeMessage: (payload['welcomeMessage'] as string) ?? 'Welcome {first}!',
            rules: (payload['rules'] as string) ?? 'Be respectful.',
            captchaMode: (payload['captchaMode'] as any) ?? 'button',
            floodLimit: (payload['floodLimit'] as number) ?? 5,
            floodMode: (payload['floodMode'] as any) ?? 'mute',
            lockForwards: (payload['lockForwards'] as boolean) ?? false,
            lockLinks: (payload['lockLinks'] as boolean) ?? false,
            warnLimit: (payload['warnLimit'] as number) ?? 3,
            warnMode: (payload['warnMode'] as any) ?? 'kick',
          });
          break;
        case 'rose.apply_hardening':
          result = await commander.sendBatch([
            '/lock forward',
            '/lock url',
            '/lock bot',
            `/setflood ${(payload['floodLimit'] as number) ?? 3}`,
            '/floodmode ban',
            '/setwarnlimit 2',
            '/setwarnmode ban',
          ]);
          break;
        default:
          throw new Error(`Unknown Rose action: ${action}`);
      }

      return {
        success: result.success,
        output: { mode: 'auto', messageId: result.messageId, dryRun: result.dryRun },
        error: result.error,
        requiresManualFollowUp: false,
      };
    } catch (error) {
      return {
        success: false,
        output: { mode: 'auto_failed' },
        error: String(error),
        requiresManualFollowUp: true,
        manualInstructions: 'Userbot execution failed. Please send the commands manually.',
      };
    }
  }

  private async executeAsCopyPaste(
    action: string,
    payload: Record<string, unknown>,
  ): Promise<AdapterExecuteResult> {
    switch (action) {
      case 'rose.add_to_group':
        return {
          success: true,
          output: { mode: 'manual' },
          error: null,
          requiresManualFollowUp: true,
          manualInstructions: [
            'Open your Telegram group',
            'Tap the group name → Edit → Administrators',
            'Add @MissRose_bot',
            'Grant: Delete messages, Ban users, Pin messages, Invite users',
            'Tap Save',
          ].join('\n'),
        };

      case 'rose.set_welcome': {
        const command = `/setwelcome ${payload['welcomeMessage']}`;
        return {
          success: true,
          output: { command, mode: 'copy_paste' },
          error: null,
          requiresManualFollowUp: true,
          copyContent: command,
          manualInstructions: 'Send this command in your group chat as an admin.',
        };
      }

      case 'rose.apply_baseline':
      case 'rose.configure_filters': {
        const commands = this.generator.generateSetupBundle({
          welcomeMessage: (payload['welcomeMessage'] as string) ?? 'Welcome {first}!',
          captchaEnabled: true,
          antiFloodThreshold: (payload['floodLimit'] as number) ?? 5,
          blockForwardedMessages: (payload['lockForwards'] as boolean) ?? false,
          blockLinks: (payload['lockLinks'] as boolean) ?? false,
        });

        return {
          success: true,
          output: { commands, mode: 'copy_paste' },
          error: null,
          requiresManualFollowUp: true,
          copyContent: this.generator.formatBundle(commands),
          manualInstructions: 'Send each command in your group chat as an admin, one at a time.',
        };
      }

      default: {
        const command = `/${action.replace('rose.', '')}`;
        return {
          success: true,
          output: { command, mode: 'copy_paste' },
          error: null,
          requiresManualFollowUp: true,
          copyContent: command,
          manualInstructions: 'Send this command in your group chat as an admin.',
        };
      }
    }
  }

  canExecute(action: string, _config: Record<string, unknown>): boolean {
    return [
      'rose.add_to_group',
      'rose.set_welcome',
      'rose.set_rules',
      'rose.enable_captcha',
      'rose.configure_antiflood',
      'rose.configure_filters',
      'rose.save_note',
      'rose.apply_baseline',
      'rose.apply_hardening',
      'rose.lock_forwards',
      'rose.lock_links',
    ].includes(action);
  }

  describeStep(step: PlanStep): string {
    return `Rose Bot: ${step.title}`;
  }
}

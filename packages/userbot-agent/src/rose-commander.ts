import { UserbotClient } from './client.js';
import { decryptSession } from './session-store.js';
import type { CommandResult } from './types.js';
import { getLogger } from '@launchctrl/lib';

const logger = getLogger();

// Get API credentials from environment
function getApiCredentials(): { apiId: number; apiHash: string } {
  const apiId = parseInt(process.env['TELEGRAM_API_ID'] ?? '0', 10);
  const apiHash = process.env['TELEGRAM_API_HASH'] ?? '';
  if (!apiId || !apiHash) {
    throw new Error('TELEGRAM_API_ID and TELEGRAM_API_HASH must be set for userbot automation');
  }
  return { apiId, apiHash };
}

export interface RoseCommanderOptions {
  encryptedSessionString: string;
  groupId: string;
  dryRun?: boolean;
}

export class RoseCommander {
  private opts: RoseCommanderOptions;

  constructor(opts: RoseCommanderOptions) {
    this.opts = opts;
  }

  /**
   * Send a single Rose command to the group.
   * The userbot account must already be an admin of the group.
   */
  async sendCommand(command: string): Promise<CommandResult> {
    return this.sendBatch([command]);
  }

  /**
   * Send multiple Rose commands in sequence with a delay between each.
   * Returns results for all commands. Stops on first failure (unless dryRun).
   */
  async sendBatch(commands: string[]): Promise<CommandResult> {
    const { apiId, apiHash } = getApiCredentials();
    const rawSession = decryptSession(this.opts.encryptedSessionString);

    const client = new UserbotClient({ sessionString: rawSession, apiId, apiHash });

    try {
      if (!this.opts.dryRun) {
        await client.connect();
      }

      const results = await client.sendCommandBatch({
        groupId: this.opts.groupId,
        commands,
        dryRun: this.opts.dryRun ?? false,
        delayBetweenMs: 1500, // Respect Rose's rate limits
      });

      const allSucceeded = results.every(r => r.success);
      const firstFailure = results.find(r => !r.success);

      return {
        success: allSucceeded,
        messageId: results[results.length - 1]?.messageId ?? null,
        error: firstFailure?.error ?? null,
        dryRun: this.opts.dryRun ?? false,
      };
    } finally {
      await client.disconnect();
    }
  }

  // ─── Rose command builders ──────────────────────────────────────────────

  async setWelcome(message: string): Promise<CommandResult> {
    return this.sendCommand(`/setwelcome ${message}`);
  }

  async setRules(rules: string): Promise<CommandResult> {
    return this.sendCommand(`/setrules ${rules}`);
  }

  async enableCaptcha(mode: 'button' | 'math' | 'text' = 'button'): Promise<CommandResult> {
    return this.sendBatch(['/captcha on', `/captchamode ${mode}`]);
  }

  async disableCaptcha(): Promise<CommandResult> {
    return this.sendCommand('/captcha off');
  }

  async setFlood(limit: number, mode: 'ban' | 'mute' | 'kick' = 'mute'): Promise<CommandResult> {
    return this.sendBatch([`/setflood ${limit}`, `/floodmode ${mode}`]);
  }

  async lockForwards(): Promise<CommandResult> {
    return this.sendCommand('/lock forward');
  }

  async lockLinks(): Promise<CommandResult> {
    return this.sendCommand('/lock url');
  }

  async saveNote(name: string, content: string): Promise<CommandResult> {
    return this.sendCommand(`/save ${name} ${content}`);
  }

  async setCleanService(enabled: boolean): Promise<CommandResult> {
    return this.sendCommand(`/cleanservice ${enabled ? 'yes' : 'no'}`);
  }

  async setCleanWelcome(enabled: boolean): Promise<CommandResult> {
    return this.sendCommand(`/cleanwelcome ${enabled ? 'yes' : 'no'}`);
  }

  async setWarnLimit(limit: number): Promise<CommandResult> {
    return this.sendCommand(`/setwarnlimit ${limit}`);
  }

  async setWarnMode(mode: 'ban' | 'mute' | 'kick'): Promise<CommandResult> {
    return this.sendCommand(`/setwarnmode ${mode}`);
  }

  /**
   * Full baseline setup bundle — all core Rose commands in one call.
   */
  async applyBaselineSetup(config: {
    welcomeMessage: string;
    rules: string;
    captchaMode?: 'button' | 'math' | 'text';
    floodLimit?: number;
    floodMode?: 'ban' | 'mute' | 'kick';
    lockForwards?: boolean;
    lockLinks?: boolean;
    warnLimit?: number;
    warnMode?: 'ban' | 'mute' | 'kick';
  }): Promise<CommandResult> {
    const commands: string[] = [
      `/setwelcome ${config.welcomeMessage}`,
      `/setrules ${config.rules}`,
      '/captcha on',
      `/captchamode ${config.captchaMode ?? 'button'}`,
      `/setflood ${config.floodLimit ?? 5}`,
      `/floodmode ${config.floodMode ?? 'mute'}`,
      '/cleanservice yes',
      '/cleanwelcome yes',
      `/setwarnlimit ${config.warnLimit ?? 3}`,
      `/setwarnmode ${config.warnMode ?? 'kick'}`,
      ...(config.lockForwards ? ['/lock forward'] : []),
      ...(config.lockLinks ? ['/lock url'] : []),
    ];

    return this.sendBatch(commands);
  }
}

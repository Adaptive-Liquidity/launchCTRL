import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import type { SendCommandOptions, SendCommandBatchOptions, CommandResult } from './types.js';
import { getLogger } from '@launchctrl/lib';

const logger = getLogger();

export class UserbotClient {
  private client: TelegramClient | null = null;
  private sessionString: string;
  private apiId: number;
  private apiHash: string;

  constructor(opts: { sessionString: string; apiId: number; apiHash: string }) {
    this.sessionString = opts.sessionString;
    this.apiId = opts.apiId;
    this.apiHash = opts.apiHash;
  }

  async connect(): Promise<void> {
    const session = new StringSession(this.sessionString);
    this.client = new TelegramClient(session, this.apiId, this.apiHash, {
      connectionRetries: 3,
      useWSS: false,
    });
    await this.client.connect();
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.disconnect();
      this.client = null;
    }
  }

  async sendCommand(opts: SendCommandOptions): Promise<CommandResult> {
    if (opts.dryRun) {
      logger.info({ command: opts.command, groupId: opts.groupId }, '[DRY_RUN] Would send command');
      return { success: true, messageId: null, error: null, dryRun: true };
    }

    if (!this.client) throw new Error('Client not connected');

    try {
      // Resolve the entity (group/channel)
      const entity = await this.client.getEntity(opts.groupId);

      if (opts.delayMs) {
        await new Promise(resolve => setTimeout(resolve, opts.delayMs));
      }

      const result = await this.client.sendMessage(entity, { message: opts.command });

      logger.info({ command: opts.command, groupId: opts.groupId, messageId: result.id }, 'Command sent via userbot');

      return { success: true, messageId: result.id, error: null, dryRun: false };
    } catch (error) {
      logger.error({ error, command: opts.command, groupId: opts.groupId }, 'Failed to send command via userbot');
      return { success: false, messageId: null, error: String(error), dryRun: false };
    }
  }

  async sendCommandBatch(opts: SendCommandBatchOptions): Promise<CommandResult[]> {
    const delayMs = opts.delayBetweenMs ?? 1500;
    const results: CommandResult[] = [];

    for (const command of opts.commands) {
      const result = await this.sendCommand({
        groupId: opts.groupId,
        command,
        dryRun: opts.dryRun,
        delayMs,
      });
      results.push(result);

      // If a command fails (not dry run), stop the batch
      if (!result.success && !opts.dryRun) {
        logger.warn({ command, results }, 'Batch aborted due to command failure');
        break;
      }
    }

    return results;
  }

  getCurrentSessionString(): string {
    if (!this.client) throw new Error('Client not connected');
    return (this.client.session as StringSession).save();
  }
}

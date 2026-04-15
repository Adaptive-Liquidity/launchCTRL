import type { RoseCommandBundle, RoseNoteConfig } from './rose.types.js';

/**
 * Generates Rose Bot command sequences.
 *
 * IMPORTANT: These commands are generated for human execution, not automated.
 * Rose Bot does not have a public API for external configuration.
 * All commands must be sent in the group chat by an admin.
 */
export class RoseCommandGenerator {
  generateSetupBundle(config: {
    welcomeMessage: string;
    rules?: string;
    captchaEnabled: boolean;
    antiFloodThreshold: number;
    blockForwardedMessages: boolean;
    blockLinks: boolean;
    notes?: RoseNoteConfig[];
  }): RoseCommandBundle {
    const setupCommands: string[] = [
      '/cleanservice on',
      '/antiflood ' + config.antiFloodThreshold,
      '/setfloodaction ban',
    ];

    if (config.blockForwardedMessages) {
      setupCommands.push('/blacklistdelete on');
    }

    if (config.blockLinks) {
      setupCommands.push('/welcomemute on');
    }

    const welcomeCommand = `/setwelcome ${config.welcomeMessage}`;

    const rulesCommand = config.rules ? `/setrules ${config.rules}` : null;

    const captchaCommand = config.captchaEnabled ? '/captcha on' : null;

    const antiFloodCommands = [
      `/antiflood ${config.antiFloodThreshold}`,
      '/setfloodaction ban',
    ];

    const filterCommands: string[] = [];
    if (config.blockLinks) {
      filterCommands.push('/blacklist "http://"');
      filterCommands.push('/blacklist "https://"');
      filterCommands.push('/blacklistdelete on');
    }

    const noteCommands: string[] = (config.notes ?? []).map(
      (note) => `/save ${note.noteName} ${note.content}`,
    );

    return {
      setupCommands,
      welcomeCommand,
      rulesCommand,
      captchaCommand,
      filterCommands,
      noteCommands,
      antiFloodCommands,
    };
  }

  /**
   * Formats a complete command bundle as a copy-pasteable text block
   */
  formatBundle(bundle: RoseCommandBundle): string {
    const sections: string[] = ['# Rose Bot Setup Commands', '# Run these in your group chat, one at a time\n'];

    sections.push('## Initial Setup');
    sections.push(bundle.setupCommands.join('\n'));

    sections.push('\n## Welcome Message');
    sections.push(bundle.welcomeCommand);

    if (bundle.rulesCommand) {
      sections.push('\n## Rules');
      sections.push(bundle.rulesCommand);
    }

    if (bundle.captchaCommand) {
      sections.push('\n## Captcha');
      sections.push(bundle.captchaCommand);
    }

    if (bundle.antiFloodCommands.length > 0) {
      sections.push('\n## Anti-Flood');
      sections.push(bundle.antiFloodCommands.join('\n'));
    }

    if (bundle.filterCommands.length > 0) {
      sections.push('\n## Filters');
      sections.push(bundle.filterCommands.join('\n'));
    }

    if (bundle.noteCommands.length > 0) {
      sections.push('\n## Saved Notes (Commands)');
      sections.push(bundle.noteCommands.join('\n'));
    }

    return sections.join('\n');
  }
}

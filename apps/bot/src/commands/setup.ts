import type { CommandContext, Context } from 'grammy';
import { getEnv } from '@launchctrl/config';

export async function setupCommand(ctx: CommandContext<Context>): Promise<void> {
  const env = getEnv();
  const miniAppUrl = env.TELEGRAM_MINI_APP_URL ?? 'https://t.me/your_bot/app';

  await ctx.reply(
    `⚡️ <b>Setup Wizard</b>\n\n` +
    `Launch the guided setup wizard to configure your Telegram community.\n\n` +
    `The wizard will ask you a few questions and generate a complete configuration plan for your group, including:\n\n` +
    `• Bot configuration commands\n` +
    `• Welcome messages and rules\n` +
    `• Anti-spam and security settings\n` +
    `• Social command responses\n` +
    `• Generated copy for your tone and community type`,
    {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[
          { text: '⚡️ Start Setup Wizard', web_app: { url: `${miniAppUrl}?startapp=setup` } },
        ]],
      },
    },
  );
}

import type { CommandContext, Context } from 'grammy';
import { getEnv } from '@launchctrl/config';

export async function openCommand(ctx: CommandContext<Context>): Promise<void> {
  const env = getEnv();
  const miniAppUrl = env.TELEGRAM_MINI_APP_URL ?? 'https://t.me/your_bot/app';

  await ctx.reply(
    '🚀 Open LaunchCtrl to manage your community setup:',
    {
      reply_markup: {
        inline_keyboard: [[
          { text: '🚀 Open LaunchCtrl', web_app: { url: miniAppUrl } },
        ]],
      },
    },
  );
}

import type { CommandContext, Context } from 'grammy';
import { getEnv } from '@launchctrl/config';

export async function workspacesCommand(ctx: CommandContext<Context>): Promise<void> {
  const env = getEnv();
  const miniAppUrl = env.TELEGRAM_MINI_APP_URL ?? 'https://t.me/your_bot/app';

  await ctx.reply(
    `🗂 <b>Your Workspaces</b>\n\n` +
    `Open LaunchCtrl to view and manage your workspaces.\n\n` +
    `Each workspace holds your groups, channels, and setup plans.`,
    {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[
          { text: '🗂 View Workspaces', web_app: { url: `${miniAppUrl}?startapp=workspaces` } },
        ]],
      },
    },
  );
}

import type { CommandContext, Context } from 'grammy';
import { getEnv } from '@launchctrl/config';

export async function runsCommand(ctx: CommandContext<Context>): Promise<void> {
  const env = getEnv();
  const miniAppUrl = env.TELEGRAM_MINI_APP_URL ?? 'https://t.me/your_bot/app';

  await ctx.reply(
    `⚙️ <b>Execution Runs</b>\n\n` +
    `View the status of your setup runs, including:\n\n` +
    `• Completed auto steps\n` +
    `• Pending manual steps\n` +
    `• Generated assets\n` +
    `• Audit history\n\n` +
    `Open the app to view your runs:`,
    {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[
          { text: '⚙️ View Runs', web_app: { url: `${miniAppUrl}?startapp=runs` } },
        ]],
      },
    },
  );
}

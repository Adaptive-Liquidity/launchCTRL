import type { CommandContext, Context } from 'grammy';
import { getEnv } from '@launchctrl/config';

export async function helpCommand(ctx: CommandContext<Context>): Promise<void> {
  const env = getEnv();
  const miniAppUrl = env.TELEGRAM_MINI_APP_URL ?? 'https://t.me/your_bot/app';

  await ctx.reply(
    `❓ <b>LaunchCtrl Help</b>\n\n` +
    `<b>Commands:</b>\n` +
    `/start — Welcome and open the app\n` +
    `/open — Open LaunchCtrl\n` +
    `/setup — Start the setup wizard\n` +
    `/workspaces — View your workspaces\n` +
    `/skills — Browse skill packs\n` +
    `/runs — View execution runs\n` +
    `/help — Show this message\n\n` +
    `<b>About LaunchCtrl:</b>\n` +
    `LaunchCtrl helps you configure your Telegram community with a guided setup wizard. ` +
    `It generates configuration commands, copy assets, and step-by-step instructions for your bot setup.\n\n` +
    `<b>What LaunchCtrl is NOT:</b>\n` +
    `• It does not control other bots directly\n` +
    `• It does not store your wallet or private keys\n` +
    `• It does not make financial promises\n\n` +
    `For full functionality, use the Mini App:`,
    {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[
          { text: '🚀 Open LaunchCtrl', web_app: { url: miniAppUrl } },
        ]],
      },
    },
  );
}

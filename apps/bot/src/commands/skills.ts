import type { CommandContext, Context } from 'grammy';
import { getEnv } from '@launchctrl/config';

export async function skillsCommand(ctx: CommandContext<Context>): Promise<void> {
  const env = getEnv();
  const miniAppUrl = env.TELEGRAM_MINI_APP_URL ?? 'https://t.me/your_bot/app';

  await ctx.reply(
    `🧠 <b>Skill Packs</b>\n\n` +
    `LaunchCtrl uses skill packs to configure different types of communities.\n\n` +
    `<b>Available packs:</b>\n` +
    `• rose-core — Rose Bot baseline setup\n` +
    `• rose-hardening — Advanced security hardening\n` +
    `• combot-analytics — Analytics & moderation\n` +
    `• pumpfun-launch — pump.fun token launch\n` +
    `• command-pack-socials — Social link commands\n` +
    `• welcome-copy-studio — Welcome message studio\n` +
    `• crisis-mode — Crisis communication templates\n` +
    `• raid-mode — Anti-raid protection\n` +
    `• faq-pack — FAQ documentation\n\n` +
    `Open the app to manage skill packs for your workspace:`,
    {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[
          { text: '🧠 Manage Skills', web_app: { url: `${miniAppUrl}?startapp=skills` } },
        ]],
      },
    },
  );
}

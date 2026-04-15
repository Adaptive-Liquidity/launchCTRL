import type { CommandContext, Context } from 'grammy';
import { getEnv } from '@launchctrl/config';

export async function startCommand(ctx: CommandContext<Context>): Promise<void> {
  const env = getEnv();
  const firstName = ctx.from?.first_name ?? 'there';
  const miniAppUrl = env.TELEGRAM_MINI_APP_URL ?? 'https://t.me/your_bot/app';

  const startParam = ctx.match;

  // Handle deep links (e.g., /start workspace_abc123)
  if (startParam && startParam.startsWith('workspace_')) {
    const workspaceId = startParam.replace('workspace_', '');
    await ctx.reply(
      `👋 Welcome back, ${firstName}!\n\nOpening your workspace...`,
      {
        reply_markup: {
          inline_keyboard: [[
            {
              text: '🚀 Open Workspace',
              web_app: { url: `${miniAppUrl}?startapp=workspace_${workspaceId}` },
            },
          ]],
        },
      },
    );
    return;
  }

  if (startParam && startParam.startsWith('setup_')) {
    await ctx.reply(
      `👋 Hi ${firstName}! Let's set up your community.`,
      {
        reply_markup: {
          inline_keyboard: [[
            {
              text: '⚡️ Start Setup Wizard',
              web_app: { url: `${miniAppUrl}?startapp=${startParam}` },
            },
          ]],
        },
      },
    );
    return;
  }

  // Default start
  await ctx.reply(
    `👋 Welcome to <b>LaunchCtrl</b>, ${firstName}!\n\n` +
    `I'm your Telegram launch operations assistant.\n\n` +
    `<b>What I do:</b>\n` +
    `• Guide you through a setup wizard for your community\n` +
    `• Generate a complete configuration plan\n` +
    `• Create copy, commands, and templates for your bots\n` +
    `• Provide step-by-step execution with clear instructions\n\n` +
    `<b>Open the app to get started:</b>`,
    {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🚀 Open LaunchCtrl', web_app: { url: miniAppUrl } }],
          [{ text: '❓ Help', callback_data: 'help' }],
        ],
      },
    },
  );
}

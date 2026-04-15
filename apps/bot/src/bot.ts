import { Bot, webhookCallback, GrammyError, HttpError } from 'grammy';
import { getEnv } from '@launchctrl/config';
import { getLogger } from '@launchctrl/lib';
import { startCommand } from './commands/start.js';
import { openCommand } from './commands/open.js';
import { setupCommand } from './commands/setup.js';
import { workspacesCommand } from './commands/workspaces.js';
import { skillsCommand } from './commands/skills.js';
import { runsCommand } from './commands/runs.js';
import { helpCommand } from './commands/help.js';
import { loggerMiddleware } from './middleware/logger.js';

const logger = getLogger();

export function createBot() {
  const env = getEnv();
  const bot = new Bot(env.TELEGRAM_BOT_TOKEN);

  // Middleware
  bot.use(loggerMiddleware);

  // Commands
  bot.command('start', startCommand);
  bot.command('open', openCommand);
  bot.command('setup', setupCommand);
  bot.command('workspaces', workspacesCommand);
  bot.command('skills', skillsCommand);
  bot.command('runs', runsCommand);
  bot.command('help', helpCommand);

  // Error handler
  bot.catch((err) => {
    const ctx = err.ctx;
    logger.error({ update: ctx.update.update_id }, `Error while handling update`);
    const e = err.error;
    if (e instanceof GrammyError) {
      logger.error({ description: e.description }, 'Error in request');
    } else if (e instanceof HttpError) {
      logger.error({ error: e }, 'Could not contact Telegram');
    } else {
      logger.error({ error: e }, 'Unknown error');
    }
  });

  return bot;
}

export type AppBot = ReturnType<typeof createBot>;

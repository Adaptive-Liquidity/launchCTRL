import Fastify from 'fastify';
import cors from '@fastify/cors';
import { loadEnv, getEnv } from '@launchctrl/config';
import { createLogger } from '@launchctrl/lib';
import { createBot } from './bot.js';
import { registerWebhookHandler } from './webhooks/handler.js';

loadEnv();
const env = getEnv();
const logger = createLogger({ level: env.LOG_LEVEL });

async function main() {
  const app = Fastify({ logger: { level: env.LOG_LEVEL } });

  await app.register(cors, { origin: true });

  const bot = createBot();

  // Register bot commands menu in Telegram
  await bot.api.setMyCommands([
    { command: 'start', description: 'Welcome — open LaunchCtrl' },
    { command: 'open', description: 'Open the LaunchCtrl app' },
    { command: 'setup', description: 'Start the setup wizard' },
    { command: 'workspaces', description: 'View your workspaces' },
    { command: 'skills', description: 'Browse skill packs' },
    { command: 'runs', description: 'View execution runs' },
    { command: 'help', description: 'Show help' },
  ]);

  // Register webhook handler
  registerWebhookHandler(app, bot);

  // Health check
  app.get('/health', async () => ({ status: 'ok', mode: 'webhook' }));

  // Start server
  await app.listen({ port: env.BOT_PORT, host: '0.0.0.0' });

  // Set webhook with Telegram if URL is configured
  const webhookUrl = process.env['WEBHOOK_URL'];
  if (webhookUrl) {
    await bot.api.setWebhook(webhookUrl, {
      ...(env.TELEGRAM_BOT_WEBHOOK_SECRET && { secret_token: env.TELEGRAM_BOT_WEBHOOK_SECRET }),
      allowed_updates: ['message', 'callback_query', 'inline_query'],
    });
    logger.info({ url: webhookUrl }, 'Webhook registered with Telegram');
  } else {
    logger.warn('WEBHOOK_URL not set — bot will not receive updates in production. Use polling for local dev.');
    // Start polling in development
    if (env.NODE_ENV === 'development') {
      logger.info('Starting long polling for development...');
      void bot.start({
        onStart: (botInfo) => {
          logger.info({ username: botInfo.username }, 'Bot started with long polling');
        },
      });
    }
  }

  logger.info({ port: env.BOT_PORT }, 'LaunchCtrl Bot service started');
}

main().catch((err) => {
  console.error('Bot server failed to start:', err);
  process.exit(1);
});

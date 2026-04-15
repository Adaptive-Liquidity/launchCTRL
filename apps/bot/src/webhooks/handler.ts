import type { FastifyInstance } from 'fastify';
import { webhookCallback } from 'grammy';
import type { AppBot } from '../bot.js';
import { getEnv } from '@launchctrl/config';
import { getLogger } from '@launchctrl/lib';

const logger = getLogger();

export function registerWebhookHandler(app: FastifyInstance, bot: AppBot): void {
  const env = getEnv();

  // Webhook secret is used to verify that requests come from Telegram
  const webhookSecret = env.TELEGRAM_BOT_WEBHOOK_SECRET;

  app.post('/webhook', {
    config: { rawBody: true },
    preHandler: async (request, reply) => {
      // Verify webhook secret if configured
      if (webhookSecret) {
        const headerSecret = request.headers['x-telegram-bot-api-secret-token'];
        if (headerSecret !== webhookSecret) {
          logger.warn({ ip: request.ip }, 'Webhook secret mismatch — rejecting request');
          void reply.status(401).send({ error: 'Unauthorized' });
          return;
        }
      }
    },
    handler: webhookCallback(bot, 'fastify'),
  });

  logger.info('Webhook handler registered at /webhook');
}

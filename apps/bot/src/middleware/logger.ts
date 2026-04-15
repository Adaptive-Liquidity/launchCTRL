import type { Context, NextFunction } from 'grammy';
import { getLogger } from '@launchctrl/lib';

const logger = getLogger();

export async function loggerMiddleware(ctx: Context, next: NextFunction): Promise<void> {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;

  logger.info(
    {
      updateId: ctx.update.update_id,
      userId: ctx.from?.id,
      username: ctx.from?.username,
      chatId: ctx.chat?.id,
      messageType: ctx.message ? 'message' : ctx.callbackQuery ? 'callback' : 'other',
      ms,
    },
    'Update processed',
  );
}

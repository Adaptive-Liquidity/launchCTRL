import type { Context, NextFunction } from 'grammy';
import { getLogger } from '@launchctrl/lib';

const logger = getLogger();

/**
 * Validates that a message comes from a real user (not a bot or service).
 * This is a light auth check — full auth happens via Mini App initData.
 */
export async function userOnlyMiddleware(ctx: Context, next: NextFunction): Promise<void> {
  if (!ctx.from) {
    logger.debug('Ignoring update with no from field');
    return;
  }

  if (ctx.from.is_bot) {
    logger.debug({ userId: ctx.from.id }, 'Ignoring update from bot');
    return;
  }

  await next();
}

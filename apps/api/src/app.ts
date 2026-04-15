import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { loadEnv, getEnv } from '@launchctrl/config';
import { createLogger } from '@launchctrl/lib';

// Load env first
loadEnv();
const env = getEnv();
const logger = createLogger({ level: env.LOG_LEVEL });

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      serializers: {
        req(req) {
          return {
            method: req.method,
            url: req.url,
            hostname: req.hostname,
          };
        },
      },
    },
    trustProxy: true,
  });

  // Security plugins
  await app.register(helmet, {
    contentSecurityPolicy: false, // Handled at nginx level
  });

  await app.register(cors, {
    origin: env.NODE_ENV === 'production'
      ? [env.TELEGRAM_MINI_APP_URL ?? ''].filter(Boolean)
      : true,
    credentials: true,
  });

  await app.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW_MS,
    errorResponseBuilder: (_req, context) => ({
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: `Too many requests. Retry after ${Math.ceil(context.ttl / 1000)}s`,
      },
    }),
  });

  // Auth routes
  app.post('/api/auth/telegram', async (request, reply) => {
    const { validateTelegramInitData, TelegramInitDataError } = await import('./auth/telegram.js');
    const { findOrCreateUser } = await import('./modules/users/users.service.js');
    const { createSession } = await import('./auth/session.js');

    const body = request.body as { initData?: string };
    if (!body?.initData) {
      return reply.status(400).send({ success: false, error: { code: 'MISSING_INIT_DATA', message: 'initData is required' } });
    }

    try {
      const payload = validateTelegramInitData(body.initData);
      const user = await findOrCreateUser(payload.user);
      const session = await createSession({
        userId: user.id,
        userAgent: request.headers['user-agent'],
        ipAddress: request.ip,
      });

      return reply.send({
        success: true,
        data: {
          token: session.token,
          user: {
            id: user.id,
            telegramUserId: user.telegramUserId,
            telegramFirstName: user.telegramFirstName,
            telegramUsername: user.telegramUsername,
            telegramPhotoUrl: user.telegramPhotoUrl,
          },
          expiresAt: session.expiresAt.toISOString(),
        },
      });
    } catch (error) {
      if (error instanceof TelegramInitDataError) {
        logger.warn({ code: error.code, message: error.message }, 'Telegram auth failed');
        return reply.status(401).send({
          success: false,
          error: { code: error.code, message: error.message },
        });
      }
      throw error;
    }
  });

  app.post('/api/auth/logout', async (request, reply) => {
    const { revokeSession } = await import('./auth/session.js');
    const auth = request.headers.authorization;
    if (auth?.startsWith('Bearer ')) {
      await revokeSession(auth.slice(7));
    }
    return reply.send({ success: true, data: null });
  });

  // Register route modules
  const { usersRoutes } = await import('./modules/users/users.routes.js');
  const { workspacesRoutes } = await import('./modules/workspaces/workspaces.routes.js');
  const { plannerRoutes } = await import('./modules/planner/planner.routes.js');
  const { executorRoutes } = await import('./modules/executor/executor.routes.js');
  const { assetsRoutes } = await import('./modules/assets/assets.routes.js');
  const { auditRoutes } = await import('./modules/audit/audit.routes.js');
  const { skillsRoutes } = await import('./modules/skills/skills.routes.js');
  const { userbotRoutes } = await import('./modules/userbot/userbot.routes.js');

  await app.register(usersRoutes, { prefix: '/api/users' });
  await app.register(workspacesRoutes, { prefix: '/api/workspaces' });
  await app.register(plannerRoutes, { prefix: '/api' });
  await app.register(executorRoutes, { prefix: '/api' });
  await app.register(assetsRoutes, { prefix: '/api' });
  await app.register(auditRoutes, { prefix: '/api' });
  await app.register(skillsRoutes, { prefix: '/api' });
  await app.register(userbotRoutes);

  // Health check
  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  // Error handler
  app.setErrorHandler((error, _request, reply) => {
    logger.error(error);
    void reply.status(error.statusCode ?? 500).send({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
      },
    });
  });

  return app;
}

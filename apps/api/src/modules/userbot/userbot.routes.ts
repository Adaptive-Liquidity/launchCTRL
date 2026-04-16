import type { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';
import { requireAuth } from '../../auth/middleware.js';
import { getDb, schema } from '../../db/index.js';
import { eq, and } from 'drizzle-orm';
import { writeAuditEvent } from '../audit/audit.service.js';
import { getLogger } from '@launchctrl/lib';

const logger = getLogger();

export async function userbotRoutes(app: FastifyInstance) {

  // POST /api/v1/userbot/auth/init
  // Initiate phone auth — sends Telegram OTP to the user's phone
  app.post('/api/v1/userbot/auth/init', {
    preHandler: requireAuth,
    schema: {
      body: {
        type: 'object',
        required: ['phoneNumber', 'workspaceId'],
        properties: {
          phoneNumber: { type: 'string' },
          workspaceId: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const { phoneNumber, workspaceId } = request.body as { phoneNumber: string; workspaceId: string };
    const userId = (request as any).userId as string;

    const { initAuth } = await import('@launchctrl/userbot-agent');

    const apiId = parseInt(process.env.TELEGRAM_API_ID ?? '0', 10);
    const apiHash = process.env.TELEGRAM_API_HASH ?? '';

    if (!apiId || !apiHash) {
      return reply.status(503).send({ error: 'Userbot not configured. Set TELEGRAM_API_ID and TELEGRAM_API_HASH.' });
    }

    try {
      const result = await initAuth({ phoneNumber, apiId, apiHash });

      await writeAuditEvent({
        userId,
        workspaceId,
        action: 'userbot.auth.initiated',
        resourceType: 'userbot_session',
        resourceId: workspaceId,
        metadata: { phoneHint: phoneNumber.slice(0, 4) + '****' },
        riskLevel: 'medium',
      });

      return reply.send({ phoneCodeHash: result.phoneCodeHash, sessionId: result.sessionId });
    } catch (error) {
      logger.error({ error }, 'Failed to initiate userbot auth');
      return reply.status(500).send({ error: 'Failed to initiate auth' });
    }
  });

  // POST /api/v1/userbot/auth/complete
  // Complete phone auth with OTP code
  app.post('/api/v1/userbot/auth/complete', {
    preHandler: requireAuth,
  }, async (request, reply) => {
    const { phoneNumber, phoneCode, phoneCodeHash, workspaceId } =
      request.body as { phoneNumber: string; phoneCode: string; phoneCodeHash: string; workspaceId: string };
    const userId = (request as any).userId as string;

    const { completeAuth, encryptSession } = await import('@launchctrl/userbot-agent');

    try {
      const result = await completeAuth({ phoneNumber, phoneCode, phoneCodeHash });

      // Encrypt and store session
      const encrypted = encryptSession(result.sessionString);
      const db = getDb();

      // Upsert userbot session for this workspace
      // Store in integrations table with type 'userbot'
      const existing = await db.select()
        .from(schema.integrations)
        .where(and(
          eq(schema.integrations.workspaceId, workspaceId),
          eq(schema.integrations.slug, 'userbot'),
        ))
        .limit(1)
        .then(r => r[0] ?? null);

      if (existing) {
        await db.update(schema.integrations)
          .set({ configMetadata: { encryptedSession: encrypted, telegramUserId: result.userId, username: result.username }, status: 'connected', updatedAt: new Date() })
          .where(eq(schema.integrations.id, existing.id));
      } else {
        await db.insert(schema.integrations).values({
          id: nanoid(),
          workspaceId,
          slug: 'userbot',
          displayName: 'Userbot',
          configMetadata: { encryptedSession: encrypted, telegramUserId: result.userId, username: result.username },
          status: 'connected',
        });
      }

      await writeAuditEvent({
        userId,
        workspaceId,
        action: 'userbot.auth.completed',
        resourceType: 'userbot_session',
        resourceId: workspaceId,
        metadata: { telegramUserId: result.userId, username: result.username },
        riskLevel: 'high',
      });

      return reply.send({
        success: true,
        telegramUserId: result.userId,
        username: result.username,
        message: 'Userbot session authenticated. Rose commands will now execute automatically.',
      });
    } catch (error) {
      if (String(error).includes('TWO_FACTOR_REQUIRED')) {
        return reply.status(202).send({ requiresTwoFactor: true });
      }
      logger.error({ error }, 'Failed to complete userbot auth');
      return reply.status(400).send({ error: 'Invalid OTP or auth expired. Please try again.' });
    }
  });

  // POST /api/v1/userbot/auth/2fa
  // Complete 2FA if required
  app.post('/api/v1/userbot/auth/2fa', {
    preHandler: requireAuth,
  }, async (request, reply) => {
    const { phoneNumber, password, workspaceId } =
      request.body as { phoneNumber: string; password: string; workspaceId: string };
    const _userId = (request as any).userId as string;

    const { complete2FA, encryptSession } = await import('@launchctrl/userbot-agent');

    try {
      const result = await complete2FA({ phoneNumber, password });
      const encrypted = encryptSession(result.sessionString);
      const db = getDb();

      await db.insert(schema.integrations).values({
        id: nanoid(),
        workspaceId,
        slug: 'userbot',
        displayName: 'Userbot',
        configMetadata: { encryptedSession: encrypted, telegramUserId: result.userId, username: result.username },
        status: 'connected',
      });

      return reply.send({ success: true, telegramUserId: result.userId, username: result.username });
    } catch (error) {
      return reply.status(400).send({ error: 'Invalid 2FA password.' });
    }
  });

  // GET /api/v1/workspaces/:id/userbot
  // Get userbot session status for a workspace
  app.get('/api/v1/workspaces/:id/userbot', {
    preHandler: requireAuth,
  }, async (request, reply) => {
    const { id: workspaceId } = request.params as { id: string };
    const db = getDb();

    const session = await db.select()
      .from(schema.integrations)
      .where(and(
        eq(schema.integrations.workspaceId, workspaceId),
        eq(schema.integrations.slug, 'userbot'),
      ))
      .limit(1)
      .then(r => r[0] ?? null);

    if (!session) {
      return reply.send({ connected: false });
    }

    const config = session.configMetadata as { telegramUserId?: string; username?: string };

    return reply.send({
      connected: true,
      isActive: session.status === 'connected',
      telegramUserId: config.telegramUserId,
      username: config.username,
    });
  });

  // DELETE /api/v1/workspaces/:id/userbot
  // Revoke userbot session
  app.delete('/api/v1/workspaces/:id/userbot', {
    preHandler: requireAuth,
  }, async (request, reply) => {
    const { id: workspaceId } = request.params as { id: string };
    const userId = (request as any).userId as string;
    const db = getDb();

    await db.update(schema.integrations)
      .set({ status: 'disconnected', updatedAt: new Date() })
      .where(and(
        eq(schema.integrations.workspaceId, workspaceId),
        eq(schema.integrations.slug, 'userbot'),
      ));

    await writeAuditEvent({
      userId,
      workspaceId,
      action: 'userbot.session.revoked',
      resourceType: 'userbot_session',
      resourceId: workspaceId,
      metadata: {},
      riskLevel: 'medium',
    });

    return reply.send({ success: true });
  });
}

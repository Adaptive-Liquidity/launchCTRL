import type { FastifyRequest, FastifyReply } from 'fastify';
import { getSessionByToken } from './session.js';
import { getDb, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import type { User } from '../db/schema.js';
import { getLogger } from '@launchctrl/lib';

const logger = getLogger();

declare module 'fastify' {
  interface FastifyRequest {
    currentUser: User;
    sessionToken: string;
  }
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authHeader = request.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    void reply.status(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
    return;
  }

  const session = await getSessionByToken(token);
  if (!session) {
    void reply.status(401).send({
      success: false,
      error: { code: 'SESSION_INVALID', message: 'Session is invalid or expired' },
    });
    return;
  }

  const db = getDb();
  const user = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, session.userId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!user) {
    void reply.status(401).send({
      success: false,
      error: { code: 'USER_NOT_FOUND', message: 'User associated with session not found' },
    });
    return;
  }

  request.currentUser = user;
  request.sessionToken = token;
}

export async function requireWorkspaceAccess(
  request: FastifyRequest<{ Params: { workspaceId: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const { workspaceId } = request.params;
  const userId = request.currentUser.id;

  const db = getDb();
  const member = await db
    .select()
    .from(schema.workspaceMembers)
    .where(
      eq(schema.workspaceMembers.workspaceId, workspaceId) &&
      eq(schema.workspaceMembers.userId, userId),
    )
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!member) {
    void reply.status(403).send({
      success: false,
      error: { code: 'FORBIDDEN', message: 'You do not have access to this workspace' },
    });
    return;
  }
}

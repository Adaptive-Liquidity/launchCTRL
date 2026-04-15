import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../auth/middleware.js';
import { getDb, schema } from '../../db/index.js';
import { eq, desc } from 'drizzle-orm';

export async function auditRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { workspaceId: string } }>(
    '/workspaces/:workspaceId/audit',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const db = getDb();
      const events = await db
        .select()
        .from(schema.auditEvents)
        .where(eq(schema.auditEvents.workspaceId, request.params.workspaceId))
        .orderBy(desc(schema.auditEvents.createdAt))
        .limit(100);
      return reply.send({ success: true, data: events });
    },
  );
}

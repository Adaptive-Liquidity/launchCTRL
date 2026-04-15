import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../../auth/middleware.js';
import { getDb, schema } from '../../db/index.js';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export async function assetsRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/workspaces/:workspaceId/assets
  app.get<{ Params: { workspaceId: string } }>(
    '/workspaces/:workspaceId/assets',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const db = getDb();
      const assets = await db
        .select()
        .from(schema.generatedAssets)
        .where(eq(schema.generatedAssets.workspaceId, request.params.workspaceId));
      return reply.send({ success: true, data: assets });
    },
  );

  // GET /api/assets/:assetId
  app.get<{ Params: { assetId: string } }>(
    '/assets/:assetId',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const db = getDb();
      const asset = await db
        .select()
        .from(schema.generatedAssets)
        .where(eq(schema.generatedAssets.id, request.params.assetId))
        .limit(1)
        .then((r) => r[0] ?? null);

      if (!asset) {
        return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Asset not found' } });
      }
      return reply.send({ success: true, data: asset });
    },
  );

  // PATCH /api/assets/:assetId
  app.patch<{ Params: { assetId: string } }>(
    '/assets/:assetId',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const body = z.object({
        content: z.string().min(1),
        variables: z.record(z.string()).optional(),
      }).safeParse(request.body);

      if (!body.success) {
        return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid body' } });
      }

      const db = getDb();
      const existing = await db
        .select()
        .from(schema.generatedAssets)
        .where(eq(schema.generatedAssets.id, request.params.assetId))
        .limit(1)
        .then((r) => r[0] ?? null);

      if (!existing) {
        return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Asset not found' } });
      }

      const updated = await db
        .update(schema.generatedAssets)
        .set({
          content: body.data.content,
          variables: body.data.variables ?? existing.variables as Record<string, string>,
          version: existing.version + 1,
          updatedAt: new Date(),
        })
        .where(eq(schema.generatedAssets.id, request.params.assetId))
        .returning()
        .then((r) => r[0]);

      return reply.send({ success: true, data: updated });
    },
  );
}

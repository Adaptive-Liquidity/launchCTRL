import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../../auth/middleware.js';
import { startExecutionRun, getRunById, getRunsForWorkspace } from './executor.service.js';

export async function executorRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/runs
  app.post(
    '/runs',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const body = z.object({
        planId: z.string(),
        workspaceId: z.string(),
        isDryRun: z.boolean().default(true),
      }).safeParse(request.body);

      if (!body.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid request', details: body.error.flatten() },
        });
      }

      const result = await startExecutionRun({
        ...body.data,
        userId: request.currentUser.id,
      });

      return reply.status(201).send({ success: true, data: result });
    },
  );

  // GET /api/runs/:runId
  app.get<{ Params: { runId: string } }>(
    '/runs/:runId',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const run = await getRunById(request.params.runId);
      if (!run) {
        return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Run not found' } });
      }
      return reply.send({ success: true, data: run });
    },
  );

  // GET /api/workspaces/:workspaceId/runs
  app.get<{ Params: { workspaceId: string } }>(
    '/workspaces/:workspaceId/runs',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const runs = await getRunsForWorkspace(request.params.workspaceId);
      return reply.send({ success: true, data: runs });
    },
  );
}

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../../auth/middleware.js';
import {
  createWorkspace,
  getWorkspacesForUser,
  getWorkspaceById,
  addEntityToWorkspace,
  getWorkspaceEntities,
} from './workspaces.service.js';
import { writeAuditEvent } from '../audit/audit.service.js';

const CreateWorkspaceSchema = z.object({
  name: z.string().min(1).max(128),
  description: z.string().max(512).optional(),
});

const AddEntitySchema = z.object({
  displayName: z.string().min(1).max(256),
  entityType: z.enum(['group', 'supergroup', 'channel', 'bot']),
  telegramChatId: z.number().optional(),
  telegramUsername: z.string().optional(),
  description: z.string().optional(),
});

export async function workspacesRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/workspaces
  app.get('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const workspaces = await getWorkspacesForUser(request.currentUser.id);
    return reply.send({ success: true, data: workspaces });
  });

  // POST /api/workspaces
  app.post('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const body = CreateWorkspaceSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: body.error.flatten() },
      });
    }

    const workspace = await createWorkspace({
      ...body.data,
      ownerId: request.currentUser.id,
    });

    await writeAuditEvent({
      userId: request.currentUser.id,
      workspaceId: workspace.id,
      action: 'workspace.created',
      resourceType: 'workspace',
      resourceId: workspace.id,
      metadata: { name: workspace.name },
      riskLevel: 'low',
    });

    return reply.status(201).send({ success: true, data: workspace });
  });

  // GET /api/workspaces/:id
  app.get<{ Params: { id: string } }>('/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const workspace = await getWorkspaceById(request.params.id);
    if (!workspace) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Workspace not found' } });
    }
    return reply.send({ success: true, data: workspace });
  });

  // GET /api/workspaces/:id/entities
  app.get<{ Params: { id: string } }>('/:id/entities', { preHandler: [requireAuth] }, async (request, reply) => {
    const entities = await getWorkspaceEntities(request.params.id);
    return reply.send({ success: true, data: entities });
  });

  // POST /api/workspaces/:id/entities
  app.post<{ Params: { id: string } }>('/:id/entities', { preHandler: [requireAuth] }, async (request, reply) => {
    const body = AddEntitySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid entity data', details: body.error.flatten() },
      });
    }

    const entity = await addEntityToWorkspace({
      workspaceId: request.params.id,
      ...body.data,
    });

    await writeAuditEvent({
      userId: request.currentUser.id,
      workspaceId: request.params.id,
      action: 'entity.added',
      resourceType: 'telegram_entity',
      resourceId: entity?.id ?? null,
      metadata: { displayName: body.data.displayName, entityType: body.data.entityType },
      riskLevel: 'low',
    });

    return reply.status(201).send({ success: true, data: entity });
  });
}

import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../auth/middleware.js';
import { skillRegistry } from '@launchctrl/skills';

export async function skillsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/skills', { preHandler: [requireAuth] }, async (_request, reply) => {
    const packs = skillRegistry.getAll();
    return reply.send({
      success: true,
      data: packs.map((p) => ({
        slug: p.meta.slug,
        name: p.meta.name,
        description: p.meta.description,
        version: p.meta.version,
        tags: p.meta.tags,
        requiredIntegrations: p.meta.requiredIntegrations,
        valid: p.valid,
        errors: p.errors,
      })),
    });
  });

  app.get<{ Params: { slug: string } }>('/skills/:slug', { preHandler: [requireAuth] }, async (request, reply) => {
    const pack = await skillRegistry.get(request.params.slug);
    if (!pack) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Skill pack not found' } });
    }
    return reply.send({ success: true, data: pack });
  });
}

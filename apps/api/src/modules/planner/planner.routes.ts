import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../../auth/middleware.js';
import { createPlan, getPlansForWorkspace, getPlanById, approvePlan } from './planner.service.js';

const WizardAnswersSchema = z.object({
  launchName: z.string().min(1),
  launchTicker: z.string().optional(),
  launchDescription: z.string().min(1),
  platform: z.enum(['pumpfun', 'raydium', 'orca', 'solana_general', 'ethereum', 'base', 'other']),
  contractAddress: z.string().optional(),
  websiteUrl: z.string().url().optional().or(z.literal('')),
  twitterUrl: z.string().url().optional().or(z.literal('')),
  telegramUrl: z.string().url().optional().or(z.literal('')),
  category: z.enum(['token', 'meme_token', 'utility_token', 'nft', 'infra', 'general_community', 'private_alpha', 'dao', 'other']),
  securityProfile: z.enum(['low', 'balanced', 'hard', 'extreme']),
  automationProfile: z.enum(['minimal', 'standard', 'aggressive_safe']),
  integrations: z.array(z.enum(['rose', 'combot', 'safeguard', 'controllerbot', 'chainfuel', 'buybot', 'alertbot'])),
  toneProfile: z.enum(['premium', 'degen', 'technical', 'formal', 'hybrid']),
  generateWelcome: z.boolean().default(true),
  generateRules: z.boolean().default(true),
  generateFaq: z.boolean().default(false),
  generateCommands: z.boolean().default(true),
  generateAnnouncements: z.boolean().default(false),
  generateCrisisMode: z.boolean().default(false),
  generateRaidMode: z.boolean().default(false),
});

export async function plannerRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/workspaces/:workspaceId/plans
  app.post<{ Params: { workspaceId: string } }>(
    '/:workspaceId/plans',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const body = WizardAnswersSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid wizard answers', details: body.error.flatten() },
        });
      }

      const result = await createPlan({
        workspaceId: request.params.workspaceId,
        userId: request.currentUser.id,
        answers: body.data,
      });

      return reply.status(201).send({ success: true, data: result });
    },
  );

  // GET /api/workspaces/:workspaceId/plans
  app.get<{ Params: { workspaceId: string } }>(
    '/:workspaceId/plans',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const plans = await getPlansForWorkspace(request.params.workspaceId);
      return reply.send({ success: true, data: plans });
    },
  );

  // GET /api/plans/:planId
  app.get<{ Params: { planId: string } }>(
    '/plans/:planId',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const plan = await getPlanById(request.params.planId);
      if (!plan) {
        return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Plan not found' } });
      }
      return reply.send({ success: true, data: plan });
    },
  );

  // POST /api/plans/:planId/approve
  app.post<{ Params: { planId: string } }>(
    '/plans/:planId/approve',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const body = z.object({ workspaceId: z.string() }).safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'workspaceId required' } });
      }

      const plan = await approvePlan({
        planId: request.params.planId,
        userId: request.currentUser.id,
        workspaceId: body.data.workspaceId,
      });

      return reply.send({ success: true, data: plan });
    },
  );
}

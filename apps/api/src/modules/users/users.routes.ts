import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../auth/middleware.js';

export async function usersRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/users/me
  app.get(
    '/me',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      return reply.send({
        success: true,
        data: {
          id: request.currentUser.id,
          telegramUserId: request.currentUser.telegramUserId,
          telegramFirstName: request.currentUser.telegramFirstName,
          telegramLastName: request.currentUser.telegramLastName,
          telegramUsername: request.currentUser.telegramUsername,
          telegramPhotoUrl: request.currentUser.telegramPhotoUrl,
          createdAt: request.currentUser.createdAt,
        },
      });
    },
  );
}

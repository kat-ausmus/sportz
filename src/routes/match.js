import {
  listMatchesQuerySchema,
  matchIdParamSchema,
  createMatchSchema,
  updateScoreSchema,
} from './validation/match.js';
import * as matchService from '../services/match-service.js';

/**
 * @type {import('fastify').FastifyPluginAsync}
 */
export default async function matchRouter(fastify, _options) {
  fastify.get('/', {
    schema: {
      description: 'List matches',
      querystring: listMatchesQuerySchema,
    },
    handler: matchService.getMatches,
  });

  fastify.post('/', {
    schema: {
      body: createMatchSchema,
    },
    handler: matchService.insertAMatch,
    preHandler: async (request, reply) => {
      const { startTime, endTime } = request.body;
      if (new Date(endTime) <= new Date(startTime)) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'endTime must be chronologically after startTime',
        });
      }
    },
  });

  fastify.patch(
    '/:id/score',
    {
      schema: {
        params: matchIdParamSchema,
        body: updateScoreSchema,
      },
    },
    async (_request, _reply) => {
      return { message: 'Score updated' };
    }
  );
}

import {
  listMatchesQuerySchema,
  matchIdParamSchema,
  createMatchSchema,
  updateScoreSchema
} from './validation/match.js';

/**
 * @type {import('fastify').FastifyPluginAsync}
 */
export default async function matchRouter(fastify, options) {
  fastify.get('/', {
    schema: {
      querystring: listMatchesQuerySchema
    }
  }, async (request, reply) => {
    return { message: 'Match route' }
  })

  fastify.post('/', {
    schema: {
      body: createMatchSchema
    },
    preHandler: async (request, reply) => {
      const { startTime, endTime } = request.body;
      if (new Date(endTime) <= new Date(startTime)) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'endTime must be chronologically after startTime'
        });
      }
    }
  }, async (request, reply) => {
    return { message: 'Match created' }
  })

  fastify.patch('/:id/score', {
    schema: {
      params: matchIdParamSchema,
      body: updateScoreSchema
    }
  }, async (request, reply) => {
    return { message: 'Score updated' }
  })
}

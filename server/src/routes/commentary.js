import { matchIdParamSchema } from './validation/match.js';
import { createCommentarySchema, listCommentaryQuerySchema } from './validation/commentary.js';
import * as commentaryService from '../services/commentary-service.js';

/**
 * @type {import('fastify').FastifyPluginAsync}
 */
export default async function commentaryRouter(fastify, _options) {
  fastify.get('/', {
    schema: {
      description: 'List commentaries',
      params: matchIdParamSchema,
      querystring: listCommentaryQuerySchema,
    },
    handler: commentaryService.getCommentaries,
  });

  fastify.post('/', {
    schema: {
      params: matchIdParamSchema,
      body: createCommentarySchema,
    },
    handler: commentaryService.insertCommentary,
  });
}

import { MAX_QUERY_LIMIT } from './constants.js';

export const listCommentaryQuerySchema = {
  type: 'object',
  properties: {
    limit: {
      type: 'number',
      minimum: 1,
      maximum: MAX_QUERY_LIMIT,
    },
  },
};

export const createCommentarySchema = {
  type: 'object',
  required: ['message'],
  properties: {
    minute: {
      type: 'integer',
      minimum: 0,
    },
    sequence: {
      type: 'integer',
    },
    period: {
      type: 'string',
    },
    eventType: {
      type: 'string',
    },
    actor: {
      type: 'string',
    },
    team: {
      type: 'string',
    },
    message: {
      type: 'string',
      minLength: 1,
    },
    metadata: {
      type: 'object',
      additionalProperties: true,
    },
    tags: {
      type: 'array',
      items: {
        type: 'string',
      },
    },
  },
};

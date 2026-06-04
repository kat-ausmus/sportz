export const MATCH_STATUS = {
  SCHEDULED: 'scheduled',
  LIVE: 'live',
  FINISHED: 'finished'
};

export const listMatchesQuerySchema = {
  type: 'object',
  properties: {
    limit: {
      type: 'integer',
      minimum: 1,
      maximum: 100
    }
  }
};

export const matchIdParamSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: {
      type: 'integer',
      minimum: 1
    }
  }
};

export const createMatchSchema = {
  type: 'object',
  required: ['sport', 'homeTeam', 'awayTeam', 'startTime', 'endTime'],
  properties: {
    sport: { type: 'string', minLength: 1 },
    homeTeam: { type: 'string', minLength: 1 },
    awayTeam: { type: 'string', minLength: 1 },
    startTime: { type: 'string', format: 'date-time' },
    endTime: { type: 'string', format: 'date-time' },
    homeScore: { type: 'integer', minimum: 0 },
    awayScore: { type: 'integer', minimum: 0 }
  }
};

export const updateScoreSchema = {
  type: 'object',
  required: ['homeScore', 'awayScore'],
  properties: {
    homeScore: { type: 'integer', minimum: 0 },
    awayScore: { type: 'integer', minimum: 0 }
  }
};

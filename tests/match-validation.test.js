import { t } from 'tap';
import Fastify from 'fastify';
import ajvFormats from 'ajv-formats';

async function buildApp() {
  const matchServiceMock = {
    getMatches: async (request, reply) => {
      reply.send([]);
    },
    insertAMatch: async (request, reply) => {
      reply.code(201).send([{ id: 1, ...request.body }]);
    },
  };

  const matchRouterMock = await t.mockRequire('../src/routes/match.js', {
    '../src/services/match-service.js': matchServiceMock,
  });

  const fastify = Fastify({
    ajv: {
      customOptions: {
        coerceTypes: true, // As requested in previous issues for "coerced" integers
        allErrors: true,
      },
      plugins: [ajvFormats],
    },
  });
  await fastify.register(matchRouterMock.default);
  return fastify;
}

const app = await buildApp();

t.test('GET / (listMatchesQuerySchema)', async (t) => {
  t.test('should pass with valid limit', async (t) => {
    const res = await app.inject({
      method: 'GET',
      url: '/',
      query: { limit: '10' },
    });
    t.equal(res.statusCode, 200);
  });

  t.test('should fail with limit > 100', async (t) => {
    const res = await app.inject({
      method: 'GET',
      url: '/',
      query: { limit: '101' },
    });
    t.equal(res.statusCode, 400);
  });

  t.test('should fail with negative limit', async (t) => {
    const res = await app.inject({
      method: 'GET',
      url: '/',
      query: { limit: '0' },
    });
    t.equal(res.statusCode, 400);
  });

  t.test('should pass with no limit (optional)', async (t) => {
    const res = await app.inject({
      method: 'GET',
      url: '/',
    });
    t.equal(res.statusCode, 200);
  });
});

t.test('POST / (createMatchSchema)', async (t) => {
  t.test('should pass with valid data', async (t) => {
    const res = await app.inject({
      method: 'POST',
      url: '/',
      payload: {
        sport: 'Football',
        homeTeam: 'Team A',
        awayTeam: 'Team B',
        startTime: '2026-06-04T10:00:00Z',
        endTime: '2026-06-04T12:00:00Z',
        homeScore: '0',
        awayScore: 0,
      },
    });
    t.equal(res.statusCode, 201);
  });

  t.test('should fail with missing required fields', async (t) => {
    const res = await app.inject({
      method: 'POST',
      url: '/',
      payload: {
        sport: 'Football',
      },
    });
    t.equal(res.statusCode, 400);
  });

  t.test('should fail with invalid ISO date', async (t) => {
    const res = await app.inject({
      method: 'POST',
      url: '/',
      payload: {
        sport: 'Football',
        homeTeam: 'Team A',
        awayTeam: 'Team B',
        startTime: 'invalid-date',
        endTime: '2026-06-04T12:00:00Z',
      },
    });
    t.equal(res.statusCode, 400);
  });

  t.test('should fail if endTime <= startTime', async (t) => {
    const res = await app.inject({
      method: 'POST',
      url: '/',
      payload: {
        sport: 'Football',
        homeTeam: 'Team A',
        awayTeam: 'Team B',
        startTime: '2026-06-04T12:00:00Z',
        endTime: '2026-06-04T10:00:00Z',
      },
    });
    t.equal(res.statusCode, 400);
    const body = JSON.parse(res.payload);
    t.equal(body.message, 'endTime must be chronologically after startTime');
  });

  t.test('should fail with empty strings for teams', async (t) => {
    const res = await app.inject({
      method: 'POST',
      url: '/',
      payload: {
        sport: 'Football',
        homeTeam: '',
        awayTeam: 'Team B',
        startTime: '2026-06-04T10:00:00Z',
        endTime: '2026-06-04T12:00:00Z',
      },
    });
    t.equal(res.statusCode, 400);
  });
});

t.test('PATCH /:id/score (matchIdParamSchema & updateScoreSchema)', async (t) => {
  t.test('should pass with valid data', async (t) => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/1/score',
      payload: {
        homeScore: 2,
        awayScore: '1',
      },
    });
    t.equal(res.statusCode, 200);
  });

  t.test('should fail with invalid id', async (t) => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/abc/score',
      payload: {
        homeScore: 1,
        awayScore: 1,
      },
    });
    t.equal(res.statusCode, 400);
  });

  t.test('should fail with negative scores', async (t) => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/1/score',
      payload: {
        homeScore: -1,
        awayScore: 1,
      },
    });
    t.equal(res.statusCode, 400);
  });

  t.test('should fail with missing scores', async (t) => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/1/score',
      payload: {
        homeScore: 1,
      },
    });
    t.equal(res.statusCode, 400);
  });
});

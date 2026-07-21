import { t } from 'tap';
import { MATCH_STATUS } from '../server/src/routes/validation/match.js';

const commentaryServicePath = new URL(
  '../server/src/services/commentary-service.js',
  import.meta.url
).pathname;
const matchServicePath = new URL('../server/src/services/match-service.js', import.meta.url).pathname;
const dbPath = new URL('../server/src/db/db.js', import.meta.url).pathname;
const matchStatusPath = new URL(
  '../server/src/utils/match-status.js',
  import.meta.url
).pathname;

function createReply() {
  return {
    statusCode: 200,
    payload: undefined,
    server: {
      ws: undefined,
    },
    log: {
      error() {},
    },
    code(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    send(payload) {
      this.payload = payload;
      return this;
    },
  };
}

function createRequest({ params = {}, query = {}, body = {}, serverWs } = {}) {
  return {
    params,
    query,
    body,
    server: {
      ws: serverWs,
    },
    log: {
      info() {},
      error() {},
    },
  };
}

function createDbMock(state) {
  return {
    select(selectArgs) {
      state.selectArgs = selectArgs;
      const chain = {
        from(table) {
          state.fromTable = table;
          return chain;
        },
        where(clause) {
          state.whereClause = clause;
          return chain;
        },
        orderBy(clause) {
          state.orderByClause = clause;
          return chain;
        },
        limit(limit) {
          state.limit = limit;
          return Promise.resolve(state.selectRows);
        },
      };
      return chain;
    },
    insert(table) {
      state.insertTable = table;
      return {
        values(values) {
          state.insertValues = values;
          return {
            returning: async () => state.insertRows,
          };
        },
      };
    },
    update(table) {
      state.updateTable = table;
      let setArgs;
      return {
        set(values) {
          setArgs = values;
          state.updateSets.push(values);
          return {
            where(clause) {
              state.updateWhereClause = clause;
              if (Object.prototype.hasOwnProperty.call(setArgs, 'status')) {
                return undefined;
              }
              return {
                returning: async () => state.updatedRows,
              };
            },
          };
        },
      };
    },
  };
}

async function buildServices() {
  const dbState = {
    selectRows: [],
    insertRows: [],
    updatedRows: [],
    selectArgs: undefined,
    fromTable: undefined,
    whereClause: undefined,
    orderByClause: undefined,
    limit: undefined,
    insertTable: undefined,
    insertValues: undefined,
    updateTable: undefined,
    updateSets: [],
    updateWhereClause: undefined,
  };

  const matchStatusState = {
    nextStatus: MATCH_STATUS.LIVE,
    syncCalls: [],
    updateStatusCalls: [],
  };

  const { getCommentaries, insertCommentary } = await t.mockImport(commentaryServicePath, {
    [dbPath]: {
      db: createDbMock(dbState),
    },
  });

  const { getMatches, insertAMatch, updateScore } = await t.mockImport(matchServicePath, {
    [dbPath]: {
      db: createDbMock(dbState),
    },
    [matchStatusPath]: {
      getMatchStatus: () => matchStatusState.nextStatus,
      syncMatchStatus: async (match, updateStatusFunction) => {
        matchStatusState.syncCalls.push({ ...match });
        if (match.status !== matchStatusState.nextStatus) {
          await updateStatusFunction(matchStatusState.nextStatus);
          match.status = matchStatusState.nextStatus;
          matchStatusState.updateStatusCalls.push(match.status);
        }
        return match.status;
      },
    },
  });

  return {
    dbState,
    matchStatusState,
    commentaryService: {
      getCommentaries,
      insertCommentary,
    },
    matchService: {
      getMatches,
      insertAMatch,
      updateScore,
    },
  };
}

const services = await buildServices();

t.test('commentary-service', async (t) => {
  t.test('getCommentaries returns rows and record count', async (t) => {
    services.dbState.selectRows = [
      { id: 1, matchId: 9, message: 'First' },
      { id: 2, matchId: 9, message: 'Second' },
    ];

    const request = createRequest({
      params: { id: '9' },
      query: { limit: 5 },
    });
    const reply = createReply();

    await services.commentaryService.getCommentaries(request, reply);

    t.equal(reply.statusCode, 200);
    t.same(reply.payload, {
      data: services.dbState.selectRows,
      num_records: 2,
    });
    t.equal(services.dbState.limit, 5);
  });

  t.test('insertCommentary persists and broadcasts the new commentary', async (t) => {
    services.dbState.insertRows = [
      {
        id: 11,
        matchId: 9,
        message: 'Goal',
      },
    ];

    const broadcasts = [];
    const request = createRequest({
      params: { id: '9' },
      body: {
        message: 'Goal',
        minute: 12,
      },
    });
    const reply = createReply();
    reply.server.ws = {
      broadcastMatchCommentary(matchId, payload) {
        broadcasts.push({ matchId, payload });
      },
    };

    await services.commentaryService.insertCommentary(request, reply);

    t.equal(reply.statusCode, 201);
    t.same(reply.payload, services.dbState.insertRows);
    t.same(services.dbState.insertValues, {
      matchId: 9,
      message: 'Goal',
      minute: 12,
    });
    t.same(broadcasts, [
      {
        matchId: 9,
        payload: services.dbState.insertRows[0],
      },
    ]);
  });
});

t.test('match-service', async (t) => {
  t.test('getMatches returns rows and record count', async (t) => {
    services.dbState.selectRows = [
      { id: 1, homeTeam: 'A' },
      { id: 2, homeTeam: 'B' },
    ];

    const request = createRequest({
      query: { limit: 10 },
    });
    const reply = createReply();

    await services.matchService.getMatches(request, reply);

    t.equal(reply.statusCode, 200);
    t.same(reply.payload, {
      data: services.dbState.selectRows,
      num_records: 2,
    });
    t.equal(services.dbState.limit, 10);
  });

  t.test('insertAMatch persists defaults and broadcasts the created match', async (t) => {
    services.matchStatusState.nextStatus = MATCH_STATUS.SCHEDULED;
    services.dbState.insertRows = [
      {
        id: 22,
        sport: 'Football',
        homeTeam: 'Team A',
      },
    ];

    const broadcasts = [];
    const request = createRequest({
      body: {
        sport: 'Football',
        homeTeam: 'Team A',
        awayTeam: 'Team B',
        startTime: '2026-07-21T10:00:00Z',
        endTime: '2026-07-21T12:00:00Z',
      },
      serverWs: {
        broadcastMatchCreated(match) {
          broadcasts.push(match);
        },
      },
    });
    const reply = createReply();

    await services.matchService.insertAMatch(request, reply);

    t.equal(reply.statusCode, 201);
    t.same(reply.payload, services.dbState.insertRows);
    t.ok(services.dbState.insertValues.startTime instanceof Date);
    t.ok(services.dbState.insertValues.endTime instanceof Date);
    t.equal(services.dbState.insertValues.homeScore, 0);
    t.equal(services.dbState.insertValues.awayScore, 0);
    t.equal(services.dbState.insertValues.status, MATCH_STATUS.SCHEDULED);
    t.same(broadcasts, services.dbState.insertRows);
  });

  t.test('updateScore returns 404 when the match does not exist', async (t) => {
    services.dbState.selectRows = [];
    services.dbState.updatedRows = [];
    services.dbState.updateSets = [];

    const request = createRequest({
      params: { id: 77 },
      body: {
        homeScore: 1,
        awayScore: 1,
      },
    });
    const reply = createReply();

    await services.matchService.updateScore(request, reply);

    t.equal(reply.statusCode, 404);
    t.same(reply.payload, { error: 'Match not found' });
  });

  t.test('updateScore returns 409 when the match is not live', async (t) => {
    services.matchStatusState.nextStatus = MATCH_STATUS.FINISHED;
    services.matchStatusState.syncCalls = [];
    services.matchStatusState.updateStatusCalls = [];
    services.dbState.selectRows = [
      {
        id: 77,
        status: MATCH_STATUS.FINISHED,
        startTime: '2026-07-21T08:00:00Z',
        endTime: '2026-07-21T09:00:00Z',
      },
    ];
    services.dbState.updateSets = [];

    const request = createRequest({
      params: { id: 77 },
      body: {
        homeScore: 2,
        awayScore: 1,
      },
    });
    const reply = createReply();

    await services.matchService.updateScore(request, reply);

    t.equal(reply.statusCode, 409);
    t.same(reply.payload, { error: 'Match is not live' });
    t.same(services.dbState.updateSets, []);
  });

  t.test('updateScore synchronizes status, updates scores, and broadcasts the change', async (t) => {
    services.matchStatusState.nextStatus = MATCH_STATUS.LIVE;
    services.matchStatusState.syncCalls = [];
    services.matchStatusState.updateStatusCalls = [];
    services.dbState.selectRows = [
      {
        id: 77,
        status: MATCH_STATUS.SCHEDULED,
        startTime: '2026-07-21T08:00:00Z',
        endTime: '2026-07-21T10:00:00Z',
      },
    ];
    services.dbState.updatedRows = [
      {
        id: 77,
        homeScore: 3,
        awayScore: 2,
      },
    ];
    services.dbState.updateSets = [];

    const broadcasts = [];
    const request = createRequest({
      params: { id: 77 },
      body: {
        homeScore: 3,
        awayScore: 2,
      },
      serverWs: {
        broadcastScoreUpdated(matchId, payload) {
          broadcasts.push({ matchId, payload });
        },
      },
    });
    const reply = createReply();

    await services.matchService.updateScore(request, reply);

    t.equal(reply.statusCode, 200);
    t.same(reply.payload, {
      data: services.dbState.updatedRows[0],
    });
    t.same(services.dbState.updateSets, [{ status: MATCH_STATUS.LIVE }, { homeScore: 3, awayScore: 2 }]);
    t.same(broadcasts, [
      {
        matchId: 77,
        payload: {
          homeScore: 3,
          awayScore: 2,
        },
      },
    ]);
    t.same(services.matchStatusState.syncCalls[0], {
      id: 77,
      status: MATCH_STATUS.SCHEDULED,
      startTime: '2026-07-21T08:00:00Z',
      endTime: '2026-07-21T10:00:00Z',
    });
  });
});

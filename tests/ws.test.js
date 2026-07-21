import { t } from 'tap';

const indexPath = new URL('../server/src/index.js', import.meta.url).pathname;
const dbPath = new URL('../server/src/db/db.js', import.meta.url).pathname;

function createMockWsModule(state) {
  class MockSocket {
    constructor() {
      this.readyState = MockWebSocket.OPEN;
      this.isAlive = true;
      this.subscriptions = new Set();
      this.sent = [];
      this.listeners = new Map();
      this.terminated = false;
      this.pingCount = 0;
    }

    on(event, handler) {
      const handlers = this.listeners.get(event) ?? [];
      handlers.push(handler);
      this.listeners.set(event, handlers);
    }

    emit(event, ...args) {
      for (const handler of this.listeners.get(event) ?? []) {
        handler(...args);
      }
    }

    send(payload) {
      this.sent.push(payload);
    }

    ping() {
      this.pingCount += 1;
    }

    terminate() {
      this.terminated = true;
      this.readyState = 3;
      this.emit('close');
    }
  }

  class MockWebSocketServer {
    constructor() {
      this.clients = new Set();
      this.listeners = new Map();
      state.server = this;
    }

    on(event, handler) {
      this.listeners.set(event, handler);
    }

    emit(event, ...args) {
      const handler = this.listeners.get(event);
      if (handler) {
        handler(...args);
      }
    }

    handleUpgrade(_request, _socket, _head, callback) {
      const socket = new MockSocket();
      this.clients.add(socket);
      state.socket = socket;
      callback(socket);
    }

    close(callback) {
      if (callback) callback();
    }
  }

  class MockWebSocket {}
  MockWebSocket.OPEN = 1;

  return {
    WebSocket: MockWebSocket,
    WebSocketServer: MockWebSocketServer,
  };
}

async function buildApp(t, overrides = {}) {
  const state = {};
  const mockDb = {
    insert: () => ({
      values: () => ({
        returning: async () => [overrides.createdMatch ?? { id: 999, homeTeam: 'Mock' }],
      }),
    }),
    select: () => ({
      from: () => ({
        orderBy: () => ({
          limit: async () => [],
        }),
        where: () => ({
          limit: async () => [],
        }),
      }),
    }),
    update: () => ({
      set: () => ({
        where: () => ({
          returning: async () => [overrides.updatedMatch ?? { id: 1 }],
        }),
      }),
    }),
  };

  const mockPool = {
    ending: false,
    end: async () => {},
  };

  const { createApp } = await t.mockImport(indexPath, {
    [dbPath]: {
      db: mockDb,
      pool: mockPool,
    },
    ws: createMockWsModule(state),
  });

  const app = createApp({ WS_HEARTBEAT_INTERVAL: overrides.heartbeatInterval ?? 30000 });
  await app.ready();

  return { app, state };
}

t.test('WebSocket connection sends a welcome message and broadcasts match creation', async (t) => {
  const { app, state } = await buildApp(t, { createdMatch: { id: 999, homeTeam: 'Mock' } });
  t.teardown(() => app.close());

  app.server.emit(
    'upgrade',
    {
      url: '/ws',
      headers: {
        host: '127.0.0.1',
      },
    },
    {},
    Buffer.alloc(0)
  );

  t.ok(state.socket, 'socket should be created on upgrade');
  t.same(JSON.parse(state.socket.sent[0]), { type: 'welcome' }, 'should send welcome message');

  const response = await app.inject({
    method: 'POST',
    url: '/match/',
    payload: {
      sport: 'Football',
      homeTeam: 'Team A',
      awayTeam: 'Team B',
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 3600000).toISOString(),
    },
  });

  t.equal(response.statusCode, 201, 'match should be created');
  t.same(
    JSON.parse(state.socket.sent.at(-1)),
    { type: 'match-created', data: { id: 999, homeTeam: 'Mock' } },
    'should broadcast the created match'
  );
});

t.test('WebSocket heartbeat terminates dead connections', async (t) => {
  const { app, state } = await buildApp(t, { heartbeatInterval: 50 });
  t.teardown(() => app.close());

  const socket = {
    readyState: 1,
    isAlive: false,
    subscriptions: new Set(),
    sent: [],
    pingCount: 0,
    terminated: false,
    on() {},
    send(payload) {
      this.sent.push(payload);
    },
    ping() {
      this.pingCount += 1;
    },
    terminate() {
      this.terminated = true;
      this.readyState = 3;
    },
  };

  state.server.clients.add(socket);

  await new Promise((resolve) => setTimeout(resolve, 150));

  t.equal(socket.terminated, true, 'dead socket should be terminated');
  t.equal(socket.pingCount, 0, 'dead socket should not be pinged again after termination');
});

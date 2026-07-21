import { t } from 'tap';

const socketServicePath = new URL(
  '../server/src/ws/services/socket-service.js',
  import.meta.url
).pathname;
const subscriptionServicePath = new URL(
  '../server/src/ws/services/subscription-service.js',
  import.meta.url
).pathname;
const messageServicePath = new URL(
  '../server/src/ws/services/message-service.js',
  import.meta.url
).pathname;

function createSocket({ readyState = 1 } = {}) {
  return {
    readyState,
    sent: [],
    subscriptions: new Set(),
    send(payload) {
      this.sent.push(payload);
    },
  };
}

async function buildWsServices() {
  const wsMock = {
    WebSocket: {
      OPEN: 1,
    },
  };

  const { sendJson } = await t.mockImport(socketServicePath, {
    ws: wsMock,
  });
  const subscriptionService = await t.mockImport(subscriptionServicePath, {
    ws: wsMock,
  });
  const messageService = await t.mockImport(messageServicePath, {
    ws: wsMock,
  });

  return {
    sendJson,
    subscriptionService,
    messageService,
  };
}

const services = await buildWsServices();

t.test('socket-service', async (t) => {
  t.test('sendJson writes JSON only for open sockets', async (t) => {
    const openSocket = createSocket({ readyState: 1 });
    const closedSocket = createSocket({ readyState: 3 });

    services.sendJson(openSocket, { type: 'welcome' });
    services.sendJson(closedSocket, { type: 'welcome' });

    t.same(openSocket.sent, ['{"type":"welcome"}']);
    t.same(closedSocket.sent, []);
  });
});

t.test('subscription-service', async (t) => {
  t.test('subscribe, broadcast, and unsubscribe manage match listeners', async (t) => {
    const openSocket = createSocket();
    const matchId = 301;

    services.subscriptionService.subscribe(matchId, openSocket);
    services.subscriptionService.broadcastToMatch(matchId, {
      type: 'match-commentary',
      data: { id: 1 },
    });

    t.same(openSocket.sent, ['{"type":"match-commentary","data":{"id":1}}']);

    services.subscriptionService.unsubscribe(matchId, openSocket);
    services.subscriptionService.broadcastToMatch(matchId, {
      type: 'match-commentary',
      data: { id: 2 },
    });

    t.same(openSocket.sent, ['{"type":"match-commentary","data":{"id":1}}']);
  });

  t.test('cleanupSubscriptions removes every socket for a match', async (t) => {
    const first = createSocket();
    const second = createSocket();
    const matchId = 302;

    services.subscriptionService.subscribe(matchId, first);
    services.subscriptionService.subscribe(matchId, second);
    services.subscriptionService.cleanupSubscriptions(matchId);

    services.subscriptionService.broadcastToMatch(matchId, {
      type: 'match-score-updated',
      data: { homeScore: 4, awayScore: 2 },
    });

    t.same(first.sent, []);
    t.same(second.sent, []);
  });
});

t.test('message-service', async (t) => {
  t.test('handleMessage returns an error for invalid JSON', async (t) => {
    const socket = createSocket();

    services.messageService.handleMessage(socket, Buffer.from('not-json'));

    t.same(socket.sent, ['{"type":"error","message":"Invalid JSON"}']);
    t.same(socket.subscriptions, new Set());
  });

  t.test('handleMessage subscribes and unsubscribes from match updates', async (t) => {
    const socket = createSocket();
    const matchId = 201;

    services.messageService.handleMessage(
      socket,
      Buffer.from(JSON.stringify({ type: 'subscribe', matchId }))
    );
    services.messageService.handleMessage(
      socket,
      Buffer.from(JSON.stringify({ type: 'unsubscribe', matchId }))
    );

    t.same(socket.sent, [
      '{"type":"subscribed","matchId":201}',
      '{"type":"unsubscribed","matchId":201}',
    ]);
    t.same(socket.subscriptions, new Set());
  });
});

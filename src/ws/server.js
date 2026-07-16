import fp from 'fastify-plugin';
import { WebSocket, WebSocketServer } from 'ws';
// import { wsArcjet } from '../arcjet.js';
import { sendJson } from './services/socket_service.js';
import {
  broadcastToMatch,
  cleanupSubscriptions,
  subscribe,
  unsubscribe,
} from './services/subscription_service.js';

function broadcastToAll(wss, payload) {
  for (const client of wss.clients) {
    if (client.readyState !== WebSocket.OPEN) continue;
    sendJson(client, payload);
  }
}

function handleMessage(socket, data) {
  let message;

  try {
    message = JSON.parse(data.toString());
  } catch {
    sendJson(socket, { type: 'error', message: 'Invalid JSON' });
  }

  if (message?.type === 'subscribe' && Number.isInteger(message.matchId)) {
    subscribe(message.matchId, socket);
    socket.subscriptions.add(message.matchId);
    sendJson(socket, { type: 'subscribed', matchId: message.matchId });
    return;
  }

  if (message?.type === 'unsubscribe' && Number.isInteger(message.matchId)) {
    unsubscribe(message.matchId, socket);
    socket.subscriptions.delete(message.matchId);
    sendJson(socket, { type: 'unsubscribed', matchId: message.matchId });
  }
}

async function webSocketServer(fastify) {
  const wss = new WebSocketServer({
    noServer: true,
  });

  const upgradeHandler = (request, socket, head) => {
    const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;
    if (pathname === '/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  };

  fastify.server.on('upgrade', upgradeHandler);

  wss.on('connection', async (socket, request) => {
    // if (wsArcjet) {
    //   try {
    //     // Construct a request-like object that @arcjet/fastify expects
    //     const arcjetRequest = {
    //       ...request,
    //       socket: request.socket,
    //       headers: request.headers,
    //       method: request.method,
    //       url: request.url,
    //       protocol: 'http', // Default to http, will be overridden by URL parsing if host is present
    //       server: fastify,
    //     };
    //
    //     const decision = await wsArcjet.protect(arcjetRequest);
    //     if (decision.isDenied()) {
    //       const code = decision.reason.isRateLimit() ? 1013 : 1008;
    //       const reason = decision.reason.isRateLimit() ? 'Too Many Requests' : 'Access Denied';
    //       socket.close(code, reason);
    //       return;
    //     }
    //     fastify.log.info(
    //       `WebSocket connection established with IP: ${socket.remoteAddress}, User-Agent: ${socket.httpVersion}`
    //     );
    //   } catch (err) {
    //     fastify.log.error('Exception occurred while validating websocket connection', err);
    //     socket.close(1011, 'Server Security Error');
    //     return;
    //   }
    // }
    socket.isAlive = true;
    socket.on('pong', () => {
      socket.isAlive = true;
    });

    socket.subscriptions = new Set();

    sendJson(socket, { type: 'welcome' });

    socket.on('message', (data) => {
      handleMessage(socket, data);
    });

    socket.on('error', () => {
      socket.terminate();
    });

    socket.on('close', () => {
      cleanupSubscriptions(socket);
    });

    socket.on('error', (err) => fastify.log.error(err));
  });

  const intervalTime = fastify.config?.WS_HEARTBEAT_INTERVAL || 30000;
  const interval = setInterval(() => {
    wss.clients.forEach((socket) => {
      if (socket.isAlive === false) return socket.terminate();

      socket.isAlive = false;
      socket.ping();
    });
  }, intervalTime);

  const broadcastMatchCreated = (match) => {
    broadcastToAll(wss, { type: 'match_created', data: match });
  };

  const broadcastMatchCommentary = (matchId, comment) => {
    broadcastToMatch(matchId, { type: 'commentary', data: comment });
  };

  fastify.decorate('ws', {
    broadcastMatchCreated,
    broadcastMatchCommentary,
  });

  fastify.addHook('onClose', (instance, done) => {
    clearInterval(interval);
    fastify.server.removeListener('upgrade', upgradeHandler);
    for (const client of wss.clients) {
      client.terminate();
    }
    wss.close(() => {
      done();
    });
  });
}

export default fp(webSocketServer);

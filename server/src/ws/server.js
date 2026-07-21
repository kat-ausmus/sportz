import fp from 'fastify-plugin';
import { WebSocket, WebSocketServer } from 'ws';
import { sendJson } from './services/socket-service.js';
import { broadcastToMatch, cleanupSubscriptions } from './services/subscription-service.js';
import { WS_MATCH_EVENT } from './constants.js';
import * as messageService from './services/message-service.js';

function broadcastToAll(wss, payload) {
  for (const client of wss.clients) {
    if (client.readyState !== WebSocket.OPEN) continue;
    sendJson(client, payload);
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

  wss.on('connection', async (socket, _r) => {
    socket.isAlive = true;
    socket.on('pong', () => {
      socket.isAlive = true;
    });

    socket.subscriptions = new Set();

    sendJson(socket, { type: 'welcome' });

    socket.on('message', (data) => {
      messageService.handleMessage(socket, data);
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
    broadcastToAll(wss, { type: WS_MATCH_EVENT.CREATED, data: match });
  };

  const broadcastMatchCommentary = (matchId, comment) => {
    broadcastToMatch(matchId, { type: WS_MATCH_EVENT.COMMENTARY, data: comment });
  };

  const broadcastScoreUpdated = (matchId, score) => {
    broadcastToMatch(matchId, { type: WS_MATCH_EVENT.SCORE_UPDATED, data: score });
  };

  fastify.decorate('ws', {
    broadcastMatchCreated,
    broadcastMatchCommentary,
    broadcastScoreUpdated,
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

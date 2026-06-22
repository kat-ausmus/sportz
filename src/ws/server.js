import fp from 'fastify-plugin';
import { WebSocket, WebSocketServer } from 'ws';

function sendJson(socket, payload) {
  if (socket.readyState !== WebSocket.OPEN) {
    return;
  }
  socket.send(JSON.stringify(payload));
}

function broadcast(wss, payload) {
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

  wss.on('connection', (socket) => {
    socket.isAlive = true;
    socket.on('pong', () => {
      socket.isAlive = true;
    });

    sendJson(socket, { type: 'welcome' });
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
    broadcast(wss, { type: 'match_created', data: match });
  };

  fastify.decorate('ws', {
    broadcastMatchCreated,
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

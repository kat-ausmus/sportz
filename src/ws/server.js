import fp from 'fastify-plugin';
import { WebSocket, WebSocketServer } from 'ws';
import { wsArcjet } from '../arcjet.js';

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

  wss.on('connection', async (socket, request) => {
    if (wsArcjet) {
      try {
        // Construct a request-like object that @arcjet/fastify expects
        const arcjetRequest = {
          ...request,
          socket: request.socket,
          headers: request.headers,
          method: request.method,
          url: request.url,
          protocol: 'http', // Default to http, will be overridden by URL parsing if host is present
          server: fastify,
        };

        const decision = await wsArcjet.protect(arcjetRequest);
        if (decision.isDenied()) {
          const code = decision.reason.isRateLimit() ? 1013 : 1008;
          const reason = decision.reason.isRateLimit() ? 'Too Many Requests' : 'Access Denied';
          socket.close(code, reason);
          return;
        }
        fastify.log.info(
          `WebSocket connection established with IP: ${socket.remoteAddress}, User-Agent: ${socket.httpVersion}`
        );
      } catch (err) {
        fastify.log.error('Exception occurred while validating websocket connection', err);
        socket.close(1011, 'Server Security Error');
        return;
      }
    }
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

import Fastify from 'fastify';
import matchRouter from './routes/match.js';
import webSocketServer from './ws/server.js';
import securityPlugin from './arcjet.js';
import { pool } from './db/db.js';

const PORT = Number(process.env.PORT) || 8000;
const HOST = process.env.HOST || '127.0.0.1';

export const createApp = (config = {}) => {
  const fastify = Fastify({
    logger: true,
  });

  fastify.decorate('config', {
    WS_HEARTBEAT_INTERVAL:
      config.WS_HEARTBEAT_INTERVAL || Number(process.env.WS_HEARTBEAT_INTERVAL) || 30000,
  });

  fastify.register(webSocketServer);
  fastify.register(securityPlugin);
  fastify.register(matchRouter, { prefix: '/match' });

  fastify.addHook('onClose', async () => {
    if (pool.ending) return;
    await pool.end();
  });

  fastify.get('/', async (_request, _reply) => {
    return { message: 'Hello from Fastify Root!' };
  });

  return fastify;
};

export const app = createApp();

export const start = async () => {
  try {
    const address = await app.listen({ host: HOST, port: PORT });
    console.log(`Application Server is running at ${address}`);

    const wsAddress = address.replace('http', 'ws');
    console.log(`Websocket server is running at ${wsAddress}/ws`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

if (process.argv[1] === import.meta.filename || process.argv[1].endsWith('index.js')) {
  start();
}

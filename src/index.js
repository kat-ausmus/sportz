import Fastify from 'fastify';
import matchRouter from './routes/match.js';
import webSocketServer from './ws/server.js';
import { pool } from './db/db.js';

const PORT = Number(process.env.PORT) || 8000;
const HOST = process.env.HOST || '127.0.0.1';

const fastify = Fastify({
  logger: true,
});

fastify.register(webSocketServer);
fastify.register(matchRouter, { prefix: '/match' });

fastify.addHook('onClose', async () => {
  await pool.end();
});

fastify.get('/', async (_request, _reply) => {
  return { message: 'Hello from Fastify Root!' };
});

export const app = fastify;

export const start = async () => {
  try {
    const address = await fastify.listen({ host: HOST, port: PORT });
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

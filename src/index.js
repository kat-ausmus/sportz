import Fastify from 'fastify';
import matchRouter from './routes/match.js';

const fastify = Fastify({
  logger: true,
});

fastify.register(matchRouter, { prefix: '/match' });

fastify.get('/', async (_request, _reply) => {
  return { message: 'Hello from Fastify Root!' };
});

const start = async () => {
  try {
    await fastify.listen({ port: 8000 });
    console.log(`Server is running at http://localhost:8000`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

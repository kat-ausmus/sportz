import arcjet, { detectBot, shield, slidingWindow } from '@arcjet/fastify';
import fp from 'fastify-plugin';

const DRY_RUN = 'DRY_RUN';
const LIVE = 'LIVE';

const arcjetKey = process.env.ARCJET_KEY;
const arcjetMode = process.env.ARCJET_MODE === DRY_RUN ? DRY_RUN : LIVE;

if (!arcjetKey) {
  throw new Error('ARCJET_KEY is not defined');
}

export const httpArcjet = arcjetKey
  ? arcjet({
      key: arcjetKey,
      rules: [
        shield({ mode: arcjetMode }), // protects from SQL injection and XSS
        detectBot({ mode: arcjetMode, allow: ['CATEGORY:SEARCH_ENGINE', 'CATEGORY:PREVIEW'] }),
        slidingWindow({ mode: arcjetMode, interval: '10s', max: 5 }), // rate limit to 50 requests per 10 seconds per IP, should rate limit on API_KEY or TOKEN?
      ],
    })
  : null;

export const wsArcjet = arcjetKey
  ? arcjet({
      key: arcjetKey,
      rules: [
        shield({ mode: arcjetMode }),
        detectBot({ mode: arcjetMode, allow: ['CATEGORY:SEARCH_ENGINE', 'CATEGORY:PREVIEW'] }),
        slidingWindow({ mode: arcjetMode, interval: '2s', max: 5 }), // sliding window rate limit to 5 requests per 2 seconds per IP
      ],
    })
  : null;

async function securityPlugin(fastify, _opts) {
  fastify.addHook('onRequest', async (request, reply) => {
    if (!httpArcjet) return;

    try {
      const decision = await httpArcjet.protect(request);
      fastify.log.info({ arcjetDecision: decision }, 'Arcjet decision');

      if (decision.isDenied()) {
        if (decision.reason.isRateLimit()) {
          return reply
            .code(429)
            .header('Content-Type', 'application/json')
            .send({ error: 'Too Many Requests' });
        }

        if (decision.reason.isBot()) {
          return reply
            .code(403)
            .header('Content-Type', 'application/json')
            .send({ message: 'No bots allowed' });
        }
        return reply
          .code(403)
          .header('Content-Type', 'application/json')
          .send({ error: 'Forbidden' });
      }
    } catch (err) {
      fastify.log.error('ArcJet plugin error', err);
      return reply.code(503).send({ error: 'Service Unavailable' });
    }
  });
}

export default fp(securityPlugin);

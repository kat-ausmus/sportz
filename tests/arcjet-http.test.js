import { t } from 'tap';
import { createApp } from '../src/index.js';

t.test('REST API Arcjet protection', async (t) => {
  const app = createApp();

  // Test root route which should be protected if hook is global
  const response = await app.inject({
    method: 'GET',
    url: '/',
    headers: {
      'user-agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
    },
  });

  t.equal(response.statusCode, 200, 'Should be allowed with normal user agent');
  t.same(JSON.parse(response.payload), { message: 'Hello from Fastify Root!' });

  // Test with a bot user agent to see if it's blocked
  const botResponse = await app.inject({
    method: 'GET',
    url: '/',
    headers: {
      'user-agent': 'curl/7.64.1',
    },
  });

  // If protection is working, this should be 403 or something else than 200
  // Note: Arcjet's default bot detection might not block curl unless configured,
  // but let's see what happens.
  // Actually, let's try something that is definitely a bot if we can.

  t.equal(botResponse.statusCode, 403, 'Should be blocked by Arcjet (CURL is a bot)');
  t.same(JSON.parse(botResponse.payload), { message: 'No bots allowed' });

  await app.close();
});

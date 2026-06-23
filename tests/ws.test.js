import { t } from 'tap';
import WebSocket from 'ws';
import { createApp } from '../src/index.js';
import { db } from '../src/db/db.js';

t.test('WebSocket client connection and welcome message', async (t) => {
  const app = createApp();
  // Start the server on a random port
  await app.listen({ port: 0, host: '127.0.0.1' });
  const port = app.server.address().port;

  const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`, {
    headers: {
      'user-agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
    },
  });

  const welcomeMessagePromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error('Timeout waiting for welcome message')),
      5000
    );
    ws.on('message', (data) => {
      clearTimeout(timeout);
      try {
        const message = JSON.parse(data.toString());
        resolve(message);
      } catch (err) {
        reject(err);
      }
    });
    ws.on('error', reject);
  });

  await new Promise((resolve, reject) => {
    ws.on('open', resolve);
    ws.on('error', reject);
  });

  const message = await welcomeMessagePromise;
  t.same(message, { type: 'welcome' }, 'Should receive welcome message');

  // Test broadcasting a match created event
  const matchCreatedPromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error('Timeout waiting for match_created message')),
      10000
    );
    const onMessage = (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'match_created') {
          clearTimeout(timeout);
          ws.off('message', onMessage);
          resolve(msg);
        }
      } catch (err) {
        // ignore parse error
      }
    };
    ws.on('message', onMessage);
  });

  // Mock db.insert for the broadcast test
  const originalInsert = db.insert;
  db.insert = () => ({
    values: () => ({
      returning: async () => [{ id: 999, homeTeam: 'Mock' }],
    }),
  });

  // Wait a bit for the WS connection to be fully registered in wss.clients
  await new Promise((resolve) => setTimeout(resolve, 200));

  // Trigger the broadcast by calling the route
  const response = await app.inject({
    method: 'POST',
    url: '/match/',
    payload: {
      sport: 'Football',
      homeTeam: 'Team A',
      awayTeam: 'Team B',
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 3600000).toISOString(),
    },
  });

  t.equal(response.statusCode, 201, 'Match should be created');

  const matchCreatedMsg = await matchCreatedPromise;
  t.equal(matchCreatedMsg.type, 'match_created', 'Should receive match_created message');
  t.equal(matchCreatedMsg.data.id, 999, 'Broadcasted match ID should match');

  // Restored original insert
  db.insert = originalInsert;

  // Close the connection and the server
  ws.close();
  await new Promise((resolve) => ws.on('close', resolve));
  await app.close();
  t.pass('WebSocket and server closed cleanly');
});

t.test('WebSocket heartbeat cleans up dead connections', async (t) => {
  const app = createApp({ WS_HEARTBEAT_INTERVAL: 100 });

  await app.listen({ port: 0, host: '127.0.0.1' });
  const port = app.server.address().port;

  const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`, {
    headers: {
      'user-agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
    },
  });

  // Stub the pong method to simulate a dead client that doesn't respond to pings
  ws.pong = () => {};

  await new Promise((resolve) => ws.on('open', resolve));

  const closePromise = new Promise((resolve) => ws.on('close', resolve));

  // The first heartbeat (after 100ms) will set isAlive = false and send ping
  // The second heartbeat (after 200ms) will see isAlive = false and terminate
  // Wait a bit more than 200ms
  await new Promise((resolve) => setTimeout(resolve, 500));

  await closePromise;
  t.pass('Connection closed by heartbeat due to no pong');

  await app.close();
});

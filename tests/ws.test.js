import { t } from 'tap';
import WebSocket from 'ws';
import { app } from '../src/index.js';
import { db } from '../src/db/db.js';

t.test('WebSocket client connection and welcome message', async (t) => {
  // Start the server on a random port
  await app.listen({ port: 0, host: '127.0.0.1' });
  const port = app.server.address().port;

  const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);

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
      5000
    );
    ws.once('message', (data) => {
      // We already received 'welcome', so this should be 'match_created'
      // Wait, we need to be careful if we add more listeners.
      // Let's use a specific listener for match_created
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'match_created') {
          clearTimeout(timeout);
          resolve(msg);
        }
      } catch (err) {
        // ignore parse error if it's not JSON
      }
    });
  });

  // Mock db.insert for the broadcast test
  const originalInsert = db.insert;
  db.insert = () => ({
    values: () => ({
      returning: async () => [{ id: 999, homeTeam: 'Mock' }],
    }),
  });

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

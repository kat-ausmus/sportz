import { db } from '../db/db.js';
import { matches } from '../db/schema.js';
import { desc, eq } from 'drizzle-orm';
import { getMatchStatus } from '../utils/match-status.js';

export const getMatches = async (request, reply) => {
  try {
    const limit = request.query.limit;
    const data = await db.select().from(matches).orderBy(desc(matches.createdAt)).limit(limit);
    reply.send({ data, num_records: data.length });
  } catch (error) {
    request.log.error(error, 'Failed to list matches.');
    reply.code(500).send({ error: 'Failed to list matches.' });
  }
};

export const insertAMatch = async (request, reply) => {
  try {
    const parsed = request.body;
    const { startTime, endTime, homeScore, awayScore } = parsed;
    request.log.info({ startTime, endTime, homeScore, awayScore });
    const event = await db
      .insert(matches)
      .values({
        ...parsed,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        homeScore: homeScore ?? 0,
        awayScore: awayScore ?? 0,
        status: getMatchStatus(startTime, endTime),
      })
      .returning();

    if (request.server.ws) {
      request.server.ws.broadcastMatchCreated(event[0]);
    }

    reply.code(201).send(event);
  } catch (error) {
    request.log.error(error, 'Failed to insert match.');
    reply.code(500).send({ error: 'Failed to insert a match.' });
  }
};

export const updateScore = async (request, reply) => {
  const { homeScore, awayScore } = request.body;
  const matchId = request.params.id;
  request.log.info({ matchId, homeScore, awayScore }, 'Entering update Score:');

  try {
    const [updated] = await db
      .update(matches)
      .set({ homeScore, awayScore })
      .where(eq(matches.id, matchId))
      .returning();

    if (!updated) {
      return reply.code(404).send({ error: 'Match not found' });
    }

    reply.code(200).send({ data: updated });
  } catch (err) {
    reply.log.error(err.message, 'Failed to update match score.');
    reply.code(500).send({ error: 'Failed to update match score.', message: err.message });
  }
};

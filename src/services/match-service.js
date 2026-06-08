import { db } from '../db/db.js';
import { matches } from '../db/schema.js';
import { desc } from 'drizzle-orm';
import { getMatchStatus } from '../utils/match-status.js';

export const getMatches = async (request, reply) => {
  try {
    const limit = request.query.limit;
    const data = await db.select().from(matches).orderBy(desc(matches.createdAt)).limit(limit);
    reply.send(data);
  } catch (error) {
    request.log.error(error, 'Failed to list matches.');
    reply.code(500).send({ error: 'Failed to list matches.' });
  }
};

export const insertAMatch = async (request, reply) => {
  try {
    const parsed = request.body;
    const { startTime, endTime, homeScore, awayScore } = parsed;
    console.log({ startTime, endTime, homeScore, awayScore });
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

    console.log({ event });

    // if (reply.app.locals.broadcastCreated) {
    //   reply.app.locals.broadcastMatchCreated(event);
    // }

    reply.code(201).send(event);
  } catch (error) {
    request.log.error(error, 'Failed to insert match.');
    reply.code(500).send({ error: 'Failed to insert a match.' });
  }
};

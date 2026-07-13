import { desc, eq } from 'drizzle-orm';
import { db } from '../db/db.js';
import { commentary } from '../db/schema.js';

export const getCommentaries = async (request, reply) => {
  try {
    const { id } = request.params;
    const limit = request.query.limit;

    const data = await db
      .select()
      .from(commentary)
      .where(eq(commentary.matchId, Number(id)))
      .orderBy(desc(commentary.createdAt))
      .limit(limit);

    reply.send(data);
  } catch (error) {
    request.log.error(error, 'Failed to list commentaries.');
    reply.code(500).send({ error: 'Failed to list commentaries.' });
  }
};

export const insertCommentary = async (request, reply) => {
  try {
    const { id } = request.params;
    const payload = request.body;

    const result = await db
      .insert(commentary)
      .values({
        matchId: Number(id),
        ...payload,
      })
      .returning();

    reply.code(201).send(result);
  } catch (error) {
    request.log.error(error, 'Failed to insert commentary.');
    reply.code(500).send({ error: 'Failed to insert commentary.' });
  }
};

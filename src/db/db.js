import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined');
}

const connectionString = process.env.DATABASE_URL.includes('?')
  ? `${process.env.DATABASE_URL}&uselibpqcompat=true&sslmode=require`
  : `${process.env.DATABASE_URL}?uselibpqcompat=true&sslmode=require`;

export const pool = new pg.Pool({
  connectionString,
});

export const db = drizzle(pool);

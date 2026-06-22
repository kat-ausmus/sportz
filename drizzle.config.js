import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set in .env file');
}

const connectionString = process.env.DATABASE_URL.includes('?')
  ? `${process.env.DATABASE_URL}&uselibpqcompat=true&sslmode=require`
  : `${process.env.DATABASE_URL}?uselibpqcompat=true&sslmode=require`;

export default defineConfig({
  schema: './src/db/schema.js',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: connectionString,
  },
});

import { defineConfig } from 'drizzle-kit';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

export default defineConfig({
  schema: ['./src/db/migrations/schema.ts', './src/db/schema-custom.js'],
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:Delus9798-@localhost:5432/protege',
  },
  verbose: true,
  strict: true,
});
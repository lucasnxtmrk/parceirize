import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';

// Pool de conexão reutilizável
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // máximo 20 conexões
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Instância Drizzle com schema
export const db = drizzle(pool, { schema });

// Pool bruto para casos específicos
export { pool };
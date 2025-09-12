// Re-export tudo do connection para facilitar imports
export { db, pool } from './connection.js';

// Import do schema gerado automaticamente
export * from './migrations/schema.ts';
export * from './migrations/relations.ts';

// Operators do Drizzle
export { eq, and, or, like, ilike, sql, desc, asc, count } from 'drizzle-orm';
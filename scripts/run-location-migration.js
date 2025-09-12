/*
  Aplica a migração de campos de localização na base apontada por DATABASE_URL
*/
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { Client } = require('pg');

// Carrega variáveis de ambiente (prioridade: .env.local -> .env -> .env.production)
for (const p of ['.env.local', '.env', '.env.production']) {
  const full = path.resolve(process.cwd(), p);
  if (fs.existsSync(full)) {
    dotenv.config({ path: full });
  }
}

const sqlPath = path.resolve(process.cwd(), 'scripts', 'add-location-fields.sql');
if (!fs.existsSync(sqlPath)) {
  console.error('Arquivo scripts/add-location-fields.sql não encontrado.');
  process.exit(1);
}

const sql = fs.readFileSync(sqlPath, 'utf8');
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL não definida no ambiente.');
  process.exit(1);
}

async function main() {
  const client = new Client({ connectionString: databaseUrl });
  try {
    await client.connect();
    console.log('Conectado ao PostgreSQL. Executando scripts/add-location-fields.sql...');
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('Migração de campos de localização aplicada com sucesso.');
    process.exit(0);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('Falha ao aplicar migração:', err.message);
    process.exit(2);
  } finally {
    await client.end();
  }
}

main();
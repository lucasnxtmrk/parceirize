const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:Delus9798-@localhost:5432/protege';
  const pool = new Pool({ connectionString });

  try {
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'fix-integracoes-foreign-key.sql'),
      'utf8'
    );

    console.log('🔄 Executando migração para corrigir foreign key da tabela integracoes...');

    // Execute the entire migration as one block since it contains PL/pgSQL
    console.log('Executando migração completa...');
    await pool.query(migrationSQL);

    // Verificar se a migração foi bem-sucedida
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'integracoes' AND column_name = 'provedor_id'
    `);

    if (result.rows.length > 0) {
      console.log('✅ Migração concluída com sucesso!');
      console.log('✅ Coluna provedor_id existe:', result.rows[0]);
    } else {
      console.log('❌ Erro: coluna provedor_id não foi criada');
    }

    // Verificar foreign key
    const fkResult = await pool.query(`
      SELECT conname, confrelid::regclass AS foreign_table
      FROM pg_constraint
      WHERE conrelid = 'integracoes'::regclass
      AND contype = 'f'
      AND conname LIKE '%provedor%'
    `);

    if (fkResult.rows.length > 0) {
      console.log('✅ Foreign key criada:', fkResult.rows[0]);
    }

  } catch (error) {
    console.error('❌ Erro na migração:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
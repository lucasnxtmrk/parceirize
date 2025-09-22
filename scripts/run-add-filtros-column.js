const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:Delus9798-@localhost:5432/protege';
  const pool = new Pool({ connectionString });

  try {
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'add-filtros-importacao-column.sql'),
      'utf8'
    );

    console.log('🔄 Adicionando coluna filtros_importacao...');

    await pool.query(migrationSQL);

    // Verificar se a migração foi bem-sucedida
    const result = await pool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'integracoes' AND column_name = 'filtros_importacao'
    `);

    if (result.rows.length > 0) {
      console.log('✅ Migração concluída com sucesso!');
      console.log('✅ Coluna filtros_importacao adicionada:', result.rows[0]);
    } else {
      console.log('❌ Erro: coluna filtros_importacao não foi criada');
    }

  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('✅ Coluna filtros_importacao já existe!');
    } else {
      console.error('❌ Erro na migração:', error.message);
      process.exit(1);
    }
  } finally {
    await pool.end();
  }
}

runMigration();
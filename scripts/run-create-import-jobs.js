const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

async function createImportJobsTable() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Delus9798-@localhost:5432/protege'
  });

  try {
    console.log('🚀 Iniciando criação da tabela import_jobs...');

    // Verificar se a tabela já existe
    const checkTable = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'import_jobs'
      );
    `);

    if (checkTable.rows[0].exists) {
      console.log('⚠️ Tabela import_jobs já existe. Verificando se precisa de novos campos...');

      // Verificar campos que podem estar faltando
      const checkColumns = await pool.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'import_jobs'
        AND table_schema = 'public'
      `);

      const existingColumns = checkColumns.rows.map(row => row.column_name);
      console.log('📋 Campos existentes:', existingColumns.join(', '));

      // Campos que queremos adicionar se não existirem
      const newColumns = [
        { name: 'nome_importacao', sql: "ADD COLUMN nome_importacao VARCHAR(255) DEFAULT 'Importação SGP'" },
        { name: 'logs', sql: "ADD COLUMN logs TEXT[]" }
      ];

      for (const col of newColumns) {
        if (!existingColumns.includes(col.name)) {
          console.log(`➕ Adicionando campo ${col.name}...`);
          await pool.query(`ALTER TABLE import_jobs ${col.sql}`);
        } else {
          console.log(`✅ Campo ${col.name} já existe`);
        }
      }
    } else {
      console.log('📦 Tabela não existe, criando...');

      // Ler arquivo SQL
      const sqlPath = path.join(__dirname, 'create-import-jobs-table.sql');
      const sql = fs.readFileSync(sqlPath, 'utf8');

      // Executar SQL
      await pool.query(sql);
      console.log('✅ Tabela import_jobs criada com sucesso!');
    }

    // Verificar quantidade de jobs existentes
    const countResult = await pool.query('SELECT COUNT(*) FROM import_jobs');
    console.log(`📊 Total de jobs na fila: ${countResult.rows[0].count}`);

    console.log('🎉 Migração concluída com sucesso!');

  } catch (error) {
    console.error('❌ Erro na migração:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  createImportJobsTable();
}

module.exports = { createImportJobsTable };
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  try {
    console.log('🔄 Executando migração de customização...');
    
    const migrationPath = path.join(__dirname, 'migrations', 'add-customization-fields.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    await pool.query(migrationSQL);
    
    console.log('✅ Migração executada com sucesso!');
    console.log('📝 Campos adicionados: logo_url, cor_primaria, cor_secundaria');
    
    // Verificar se as colunas foram criadas
    const result = await pool.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'provedores' 
      AND column_name IN ('logo_url', 'cor_primaria', 'cor_secundaria')
      ORDER BY column_name
    `);
    
    console.log('🔍 Colunas verificadas:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (default: ${row.column_default || 'null'})`);
    });
    
  } catch (error) {
    console.error('❌ Erro na migração:', error);
  } finally {
    await pool.end();
  }
}

runMigration();
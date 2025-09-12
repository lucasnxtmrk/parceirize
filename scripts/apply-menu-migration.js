const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function applyMigration() {
  try {
    console.log('🔄 Aplicando migração dos campos do menu...');

    const sqlFile = path.join(__dirname, 'add-menu-customization.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    await pool.query(sql);
    
    console.log('✅ Migração aplicada com sucesso!');
    console.log('📝 Campos adicionados:');
    console.log('   - cor_fundo_menu');
    console.log('   - cor_texto_menu');
    console.log('   - cor_hover_menu');
    
  } catch (error) {
    console.error('❌ Erro ao aplicar migração:', error);
  } finally {
    await pool.end();
  }
}

applyMigration();
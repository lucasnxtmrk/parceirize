const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function createVoucherTable() {
  try {
    console.log('🔧 Criando tabela voucher_utilizados...');
    
    const sql = fs.readFileSync(
      path.join(__dirname, 'create-voucher-utilizados.sql'), 
      'utf8'
    );
    
    await pool.query(sql);
    
    console.log('✅ Tabela voucher_utilizados criada com sucesso!');
    
    // Verificar se a tabela foi criada
    const checkTable = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'voucher_utilizados'
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📊 Estrutura da tabela voucher_utilizados:');
    checkTable.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });
    
  } catch (error) {
    console.error('❌ Erro ao criar tabela:', error.message);
  } finally {
    await pool.end();
  }
}

createVoucherTable();
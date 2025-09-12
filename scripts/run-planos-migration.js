const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuração do banco
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function runPlanosMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Executando migração das colunas de planos...');
    
    // Ler o arquivo SQL de migração
    const migrationPath = path.join(__dirname, 'add-planos-columns.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Executar a migração
    await client.query(migrationSQL);
    
    console.log('✅ Migração das colunas de planos executada com sucesso!');
    
    // Verificar se os dados foram criados corretamente
    console.log('\n📊 Verificando dados dos planos...');
    const planosResult = await client.query('SELECT id, nome, descricao, recursos FROM planos ORDER BY preco');
    
    if (planosResult.rows.length > 0) {
      console.log('Planos encontrados:');
      planosResult.rows.forEach(plano => {
        console.log(`- ${plano.nome}: ${plano.descricao}`);
        const recursos = typeof plano.recursos === 'string' ? JSON.parse(plano.recursos) : plano.recursos;
        if (recursos && recursos.length > 0) {
          console.log(`  Recursos: ${recursos.join(', ')}`);
        }
      });
    } else {
      console.log('ℹ️ Nenhum plano encontrado. Isso é normal se o banco estiver vazio.');
    }
    
    // Verificar estrutura das tabelas principais
    console.log('\n🔍 Verificando estrutura das tabelas...');
    
    const checkTables = ['provedores', 'planos', 'vouchers'];
    for (const tableName of checkTables) {
      const result = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = $1 
        ORDER BY ordinal_position
      `, [tableName]);
      
      console.log(`\nTabela ${tableName}:`);
      result.rows.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro ao executar migração:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  runPlanosMigration()
    .then(() => {
      console.log('\n🎉 Migração concluída com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Falha na migração:', error);
      process.exit(1);
    });
}

module.exports = runPlanosMigration;
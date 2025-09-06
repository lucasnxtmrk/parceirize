const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL 
});

async function runMigration() {
  console.log('🚀 Executando migração V2 - SGP Admin + Transformação Cliente → Parceiro');
  
  try {
    // Ler o arquivo SQL
    const migrationPath = path.join(__dirname, 'migration-v2-sgp.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📖 Executando script SQL...');
    
    // Executar a migração
    const result = await pool.query(migrationSQL);
    
    console.log('✅ Migração executada com sucesso!');
    console.log('📊 Resultados da verificação:');
    
    // A última query do script retorna as estatísticas
    const stats = result[result.length - 1]?.rows || [];
    stats.forEach(stat => {
      console.log(`   ${stat.tabela}: ${stat.total_registros} registros`);
      if (stat.tabela === 'clientes') {
        console.log(`     - Clientes: ${stat.total_clientes}`);
        console.log(`     - Parceiros transformados: ${stat.total_parceiros_transformados}`);
      } else if (stat.tabela === 'integracoes') {
        console.log(`     - Integrações admin: ${stat.integracoes_admin}`);
        console.log(`     - Integrações parceiro: ${stat.integracoes_parceiro}`);
      }
    });
    
  } catch (error) {
    console.error('❌ Erro na migração:', error.message);
    console.error('📝 Detalhes:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  runMigration();
}

module.exports = runMigration;
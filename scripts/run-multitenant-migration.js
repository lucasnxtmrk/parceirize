const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuração do banco
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Delus9798-@localhost:5432/protege',
});

async function runMigration() {
  let client;
  
  try {
    client = await pool.connect();
    console.log('🔗 Conectado ao PostgreSQL. Executando migração multi-tenant...');

    // Ler o arquivo SQL
    const sqlPath = path.join(__dirname, 'migrate-multitenant.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    // Executar a migração
    console.log('📦 Executando scripts/migrate-multitenant.sql...');
    await client.query(sqlContent);
    
    console.log('✅ Migração multi-tenant aplicada com sucesso!');
    
    // Verificar se as tabelas foram criadas
    const checkTables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('planos', 'superadmins', 'provedores', 'tenant_logs')
      ORDER BY table_name
    `);
    
    console.log('📋 Tabelas criadas:');
    checkTables.rows.forEach(row => {
      console.log(`  ✅ ${row.table_name}`);
    });
    
    // Verificar se tenant_id foi adicionado às tabelas existentes
    const checkColumns = await client.query(`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND column_name = 'tenant_id'
      AND table_name IN ('clientes', 'parceiros', 'produtos', 'pedidos', 'integracoes')
      ORDER BY table_name
    `);
    
    console.log('🔗 Colunas tenant_id adicionadas:');
    checkColumns.rows.forEach(row => {
      console.log(`  ✅ ${row.table_name}.${row.column_name}`);
    });
    
    // Verificar planos inseridos
    const planos = await client.query('SELECT id, nome, preco FROM planos ORDER BY id');
    console.log('💰 Planos criados:');
    planos.rows.forEach(plano => {
      console.log(`  ✅ ${plano.id}. ${plano.nome} - R$ ${plano.preco}`);
    });
    
    console.log('\n🎉 Migração multi-tenant concluída com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro durante a migração:', error.message);
    throw error;
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

// Executar migração
runMigration()
  .then(() => {
    console.log('✅ Processo finalizado com sucesso');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Falha na migração:', error);
    process.exit(1);
  });
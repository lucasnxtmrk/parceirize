// Utilitário para gerenciar banco de dados com Drizzle
import { db, pool } from './connection.js';
import { sql } from 'drizzle-orm';

// 📊 Ver estatísticas das tabelas
export async function getTableStats() {
  try {
    const stats = await db.execute(sql`
      SELECT 
        schemaname,
        tablename,
        n_tup_ins as inserts,
        n_tup_upd as updates,
        n_tup_del as deletes,
        n_live_tup as live_rows,
        n_dead_tup as dead_rows
      FROM pg_stat_user_tables 
      ORDER BY live_rows DESC;
    `);
    
    console.table(stats.rows);
    return stats.rows;
  } catch (error) {
    console.error('❌ Erro ao buscar estatísticas:', error);
  }
}

// 🏗️ Criar nova tabela via código
export async function createExampleTable() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS example_table (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    console.log('✅ Tabela example_table criada com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao criar tabela:', error);
  }
}

// 🔄 Reset de uma tabela específica
export async function resetTable(tableName) {
  try {
    await db.execute(sql.raw(`TRUNCATE TABLE ${tableName} RESTART IDENTITY CASCADE;`));
    console.log(`✅ Tabela ${tableName} resetada com sucesso!`);
  } catch (error) {
    console.error(`❌ Erro ao resetar tabela ${tableName}:`, error);
  }
}

// 🧹 Limpar dados de teste
export async function cleanupTestData() {
  try {
    // Remove dados de teste baseados em padrões
    await db.execute(sql`
      DELETE FROM clientes WHERE nome LIKE 'Cliente Teste%';
      DELETE FROM parceiros WHERE nome_empresa LIKE 'Parceiro Teste%';
      DELETE FROM vouchers WHERE codigo LIKE 'TEST%';
    `);
    
    console.log('✅ Dados de teste removidos!');
  } catch (error) {
    console.error('❌ Erro ao limpar dados de teste:', error);
  }
}

// 🔍 Buscar informações detalhadas de uma tabela
export async function describeTable(tableName) {
  try {
    const columns = await db.execute(sql`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = ${tableName}
      ORDER BY ordinal_position;
    `);
    
    console.log(`\n📋 Estrutura da tabela: ${tableName}`);
    console.table(columns.rows);
    return columns.rows;
  } catch (error) {
    console.error(`❌ Erro ao descrever tabela ${tableName}:`, error);
  }
}

// 🚀 Executar script personalizado
export async function runCustomQuery(queryString) {
  try {
    const result = await db.execute(sql.raw(queryString));
    console.log('✅ Query executada com sucesso!');
    console.table(result.rows);
    return result.rows;
  } catch (error) {
    console.error('❌ Erro ao executar query:', error);
  }
}

// Script CLI
if (process.argv.length > 2) {
  const command = process.argv[2];
  
  switch (command) {
    case 'stats':
      getTableStats().then(() => process.exit(0));
      break;
    case 'create-example':
      createExampleTable().then(() => process.exit(0));
      break;
    case 'cleanup':
      cleanupTestData().then(() => process.exit(0));
      break;
    case 'describe':
      const tableName = process.argv[3];
      if (tableName) {
        describeTable(tableName).then(() => process.exit(0));
      } else {
        console.log('❌ Forneça o nome da tabela: npm run db:describe clientes');
        process.exit(1);
      }
      break;
    default:
      console.log(`
🛠️  COMANDOS DISPONÍVEIS:
  npm run db:stats              - Ver estatísticas das tabelas
  npm run db:create-example     - Criar tabela de exemplo
  npm run db:cleanup            - Limpar dados de teste
  npm run db:describe <table>   - Ver estrutura de uma tabela
      `);
      process.exit(0);
  }
}
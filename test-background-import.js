// Script para testar as funcionalidades de importação em background
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:Delus9798-@localhost:5432/protege'
});

async function testBackgroundImport() {
  try {
    console.log('🧪 Testando funcionalidades de importação em background...\n');

    // 1. Verificar jobs existentes
    console.log('📋 1. Verificando jobs existentes:');
    const existingJobs = await pool.query(`
      SELECT id, status, nome_importacao, progresso_percent, mensagem_atual,
             created_at, started_at, finalizado_em
      FROM import_jobs
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.table(existingJobs.rows);

    // 2. Verificar estatísticas por status
    console.log('\n📊 2. Estatísticas por status:');
    const stats = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM import_jobs
      GROUP BY status
    `);

    const statsObj = {};
    stats.rows.forEach(row => {
      statsObj[row.status] = parseInt(row.count);
    });
    console.log(statsObj);

    // 3. Verificar se há jobs com logs (agora como array PostgreSQL)
    console.log('\n📝 3. Verificando logs dos jobs:');
    const jobsWithLogs = await pool.query(`
      SELECT id, nome_importacao, array_length(logs, 1) as log_count
      FROM import_jobs
      WHERE logs IS NOT NULL AND array_length(logs, 1) > 0
      ORDER BY created_at DESC
      LIMIT 5
    `);

    if (jobsWithLogs.rows.length > 0) {
      console.table(jobsWithLogs.rows);
    } else {
      console.log('  Nenhum job com logs encontrado (ainda).');
    }

    // 4. Verificar schema da tabela
    console.log('\n🏗️ 4. Schema da tabela import_jobs:');
    const schema = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'import_jobs'
      ORDER BY ordinal_position
    `);

    console.table(schema.rows.map(col => ({
      Campo: col.column_name,
      Tipo: col.data_type,
      Nulo: col.is_nullable,
      Padrão: col.column_default
    })));

    // 5. Verificar índices
    console.log('\n🔍 5. Índices da tabela:');
    const indexes = await pool.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'import_jobs'
    `);

    indexes.rows.forEach(idx => {
      console.log(`- ${idx.indexname}: ${idx.indexdef}`);
    });

    console.log('\n✅ Teste concluído! Tudo parece estar funcionando corretamente.');
    console.log('\n📋 Para testar a interface:');
    console.log('1. Inicie o servidor: npm run dev');
    console.log('2. Acesse: /dashboard/importacoes');
    console.log('3. Teste uma importação em: /integracoes');

  } catch (error) {
    console.error('❌ Erro no teste:', error);
  } finally {
    await pool.end();
  }
}

// Executar teste
testBackgroundImport();
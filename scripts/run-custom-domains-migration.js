#!/usr/bin/env node

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuração do banco
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Delus9798-@localhost:5432/protege',
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('🚀 Iniciando migração de domínios personalizados...');

    // Ler o arquivo SQL
    const sqlFilePath = path.join(__dirname, 'add-custom-domains.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    console.log('📄 Executando script SQL...');

    // Executar o script
    const result = await client.query(sqlContent);

    console.log('✅ Migração executada com sucesso!');

    // Verificar as tabelas criadas
    console.log('\n🔍 Verificando tabelas criadas:');

    const tablesCheck = await client.query(`
      SELECT table_name, table_type
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('dominios_personalizados', 'acessos_dominio')
      ORDER BY table_name;
    `);

    tablesCheck.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name} (${row.table_type})`);
    });

    // Verificar índices criados
    console.log('\n🗂️  Verificando índices criados:');

    const indexesCheck = await client.query(`
      SELECT indexname, tablename
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename IN ('dominios_personalizados', 'acessos_dominio')
      ORDER BY tablename, indexname;
    `);

    indexesCheck.rows.forEach(row => {
      console.log(`   ✓ ${row.indexname} em ${row.tablename}`);
    });

    // Verificar funções criadas
    console.log('\n⚙️  Verificando funções criadas:');

    const functionsCheck = await client.query(`
      SELECT routine_name, routine_type
      FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND routine_name IN ('buscar_provedor_por_dominio', 'gerar_token_verificacao', 'atualizar_ultimo_acesso')
      ORDER BY routine_name;
    `);

    functionsCheck.rows.forEach(row => {
      console.log(`   ✓ ${row.routine_name} (${row.routine_type})`);
    });

    // Verificar views criadas
    console.log('\n📊 Verificando views criadas:');

    const viewsCheck = await client.query(`
      SELECT table_name
      FROM information_schema.views
      WHERE table_schema = 'public'
        AND table_name = 'stats_dominios';
    `);

    viewsCheck.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name} (VIEW)`);
    });

    // Verificar migração de dados
    console.log('\n📥 Verificando migração de dados:');

    const dataCheck = await client.query(`
      SELECT
        COUNT(*) as total_dominios,
        COUNT(CASE WHEN tipo = 'subdominio' THEN 1 END) as subdominios,
        COUNT(CASE WHEN tipo = 'personalizado' THEN 1 END) as personalizados,
        COUNT(CASE WHEN verificado = true THEN 1 END) as verificados
      FROM dominios_personalizados;
    `);

    const stats = dataCheck.rows[0];
    console.log(`   ✓ Total de domínios: ${stats.total_dominios}`);
    console.log(`   ✓ Subdomínios: ${stats.subdominios}`);
    console.log(`   ✓ Personalizados: ${stats.personalizados}`);
    console.log(`   ✓ Verificados: ${stats.verificados}`);

    // Testar função buscar_provedor_por_dominio
    console.log('\n🧪 Testando função buscar_provedor_por_dominio:');

    const testFunction = await client.query(`
      SELECT * FROM buscar_provedor_por_dominio('exemplo.parceirize.com') LIMIT 1;
    `);

    if (testFunction.rows.length > 0) {
      console.log(`   ✓ Função funcionando: encontrou provedor ${testFunction.rows[0].nome_empresa}`);
    } else {
      console.log(`   ⚠️  Função criada mas nenhum resultado de teste`);
    }

    // Verificar trigger
    console.log('\n🔄 Verificando triggers:');

    const triggerCheck = await client.query(`
      SELECT trigger_name, event_manipulation, event_object_table
      FROM information_schema.triggers
      WHERE trigger_schema = 'public'
        AND trigger_name = 'trigger_ultimo_acesso';
    `);

    triggerCheck.rows.forEach(row => {
      console.log(`   ✓ ${row.trigger_name} em ${row.event_object_table} (${row.event_manipulation})`);
    });

    console.log('\n🎉 Migração de domínios personalizados concluída com sucesso!');
    console.log('\n📝 Próximos passos:');
    console.log('   1. Atualizar middleware para detectar domínios personalizados');
    console.log('   2. Modificar NextAuth para suportar múltiplos domínios');
    console.log('   3. Criar API de configuração de domínio');
    console.log('   4. Implementar sistema de verificação');

  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  runMigration().catch(console.error);
}

module.exports = { runMigration };
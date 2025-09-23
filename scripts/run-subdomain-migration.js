#!/usr/bin/env node

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuração do banco
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Delus9798-@localhost:5432/protege',
});

async function runSubdomainMigration() {
  const client = await pool.connect();

  try {
    console.log('🚀 Iniciando migração de subdomínios...');

    // Ler arquivo SQL
    const sqlFile = path.join(__dirname, 'add-subdomain-column.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    // Executar comandos SQL
    console.log('📝 Executando comandos SQL...');
    await client.query(sql);

    console.log('✅ Migração de subdomínios concluída com sucesso!');

    // Verificar se tudo foi criado corretamente
    console.log('\n🔍 Verificando estrutura criada...');

    // Verificar coluna
    const columnCheck = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'provedores' AND column_name = 'subdominio'
    `);

    if (columnCheck.rows.length > 0) {
      console.log('✅ Coluna subdominio criada:', columnCheck.rows[0]);
    } else {
      console.log('❌ Coluna subdominio não encontrada');
    }

    // Verificar função de validação
    const functionCheck = await client.query(`
      SELECT routine_name, routine_type
      FROM information_schema.routines
      WHERE routine_name = 'validar_subdominio'
    `);

    if (functionCheck.rows.length > 0) {
      console.log('✅ Função validar_subdominio criada');
    } else {
      console.log('❌ Função validar_subdominio não encontrada');
    }

    // Verificar triggers
    const triggerCheck = await client.query(`
      SELECT trigger_name, event_manipulation, event_object_table
      FROM information_schema.triggers
      WHERE trigger_name IN ('trigger_criar_dominio', 'trigger_atualizar_dominio')
    `);

    console.log('✅ Triggers criados:', triggerCheck.rows.length);

    // Testar função de validação
    console.log('\n🧪 Testando função de validação...');

    const validTests = [
      { input: 'teste', expected: true },
      { input: 'empresa1', expected: true },
      { input: 'minha-empresa', expected: true },
      { input: 'admin', expected: false },
      { input: 'api', expected: false },
      { input: '', expected: false },
      { input: null, expected: false },
      { input: 'a', expected: true },
      { input: '123', expected: true }
    ];

    for (const test of validTests) {
      try {
        const result = await client.query('SELECT validar_subdominio($1) as valido', [test.input]);
        const isValid = result.rows[0].valido;
        const status = isValid === test.expected ? '✅' : '❌';
        console.log(`${status} "${test.input}": ${isValid} (esperado: ${test.expected})`);
      } catch (error) {
        console.log(`❌ Erro ao testar "${test.input}":`, error.message);
      }
    }

    console.log('\n🎉 Migração concluída! Sistema de subdomínios dinâmicos está pronto.');
    console.log('\n📋 Próximos passos:');
    console.log('1. Criar interface para cadastro de provedores com subdomínio');
    console.log('2. Testar criação automática de domínios');
    console.log('3. Verificar funcionamento do middleware dinâmico');

  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
    console.error('Stack:', error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar se for chamado diretamente
if (require.main === module) {
  runSubdomainMigration().catch(console.error);
}

module.exports = { runSubdomainMigration };
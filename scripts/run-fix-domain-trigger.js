const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

async function fixDomainTrigger() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Delus9798-@localhost:5432/protege'
  });

  try {
    console.log('🔧 Corrigindo função trigger de domínios duplicados...');

    // Ler e executar o arquivo SQL
    const sqlPath = path.join(__dirname, 'fix-duplicate-domain-trigger-v2.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await pool.query(sql);

    console.log('✅ Funções trigger corrigidas com sucesso!');

    // Verificar se há triggers ativos
    const triggers = await pool.query(`
      SELECT trigger_name, event_manipulation, event_object_table
      FROM information_schema.triggers
      WHERE trigger_schema = 'public'
        AND trigger_name IN ('trigger_criar_dominio', 'trigger_atualizar_dominio')
      ORDER BY trigger_name
    `);

    console.log('\n📋 Triggers ativos:');
    console.table(triggers.rows);

    // Testar se há domínios duplicados
    const duplicados = await pool.query(`
      SELECT dominio, COUNT(*) as count
      FROM dominios_personalizados
      WHERE ativo = true
      GROUP BY dominio
      HAVING COUNT(*) > 1
    `);

    if (duplicados.rows.length > 0) {
      console.log('\n⚠️ Domínios duplicados encontrados:');
      console.table(duplicados.rows);
    } else {
      console.log('\n✅ Nenhum domínio duplicado encontrado');
    }

    console.log('\n🎉 Correção aplicada com sucesso!');
    console.log('\n📝 O que foi corrigido:');
    console.log('- Função atualizar_dominio_automatico() agora verifica duplicatas');
    console.log('- Função criar_dominio_automatico() agora verifica duplicatas');
    console.log('- Removido campo inexistente "atualizado_em"');
    console.log('- Adicionada lógica para reativar domínios existentes');

  } catch (error) {
    console.error('❌ Erro ao aplicar correção:', error);

    if (error.message.includes('duplicate key')) {
      console.log('\n💡 Sugestão: Execute novamente, a correção deve resolver duplicatas futuras');
    }

    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  fixDomainTrigger();
}

module.exports = { fixDomainTrigger };
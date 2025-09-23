#!/usr/bin/env node

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Delus9798-@localhost:5432/protege',
});

async function runAdminDomainMigration() {
  const client = await pool.connect();

  try {
    console.log('🔧 Configurando domínio administrativo...\n');

    // Ler e executar o script SQL
    const sqlFile = path.join(__dirname, 'add-admin-domain.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    console.log('📄 Executando script de configuração...');
    await client.query(sql);

    console.log('✅ Domínio administrativo configurado com sucesso!\n');

    // Verificar configuração
    console.log('🔍 Verificando configuração...\n');

    const adminDomains = await client.query(`
      SELECT dominio, tipo, verificado, ativo
      FROM dominios_personalizados
      WHERE dominio LIKE 'admin.%' OR dominio = 'admin.localhost' OR dominio = 'admin.localhost:3000'
      ORDER BY dominio
    `);

    console.log('📋 Domínios administrativos configurados:');
    adminDomains.rows.forEach(domain => {
      const status = domain.ativo && domain.verificado ? '✅' : '❌';
      console.log(`   ${status} ${domain.dominio} (${domain.tipo})`);
    });

    // Testar função de busca
    console.log('\n🧪 Testando detecção de domínio...\n');

    const testDomains = [
      'admin.localhost',
      'admin.parceirize.com.br',
      'empresa1.localhost'
    ];

    for (const testDomain of testDomains) {
      try {
        const result = await client.query('SELECT * FROM buscar_provedor_por_dominio($1)', [testDomain]);

        if (result.rows.length > 0) {
          const domain = result.rows[0];
          console.log(`   ✅ ${testDomain}:`);
          console.log(`      Tipo: ${domain.tipo}`);
          console.log(`      Nome: ${domain.nome_empresa}`);
          console.log(`      Superadmin: ${domain.issuperadmin ? 'Sim' : 'Não'}`);
        } else {
          console.log(`   ❌ ${testDomain}: Não encontrado`);
        }
      } catch (error) {
        console.log(`   ❌ ${testDomain}: Erro - ${error.message}`);
      }
    }

    // Verificar superadmins
    console.log('\n👑 Verificando superadmins no sistema...\n');

    const superadmins = await client.query(`
      SELECT id, nome, email, ativo
      FROM superadmins
      ORDER BY id DESC
    `);

    if (superadmins.rows.length === 0) {
      console.log('   ⚠️  Nenhum superadmin encontrado!');
      console.log('   💡 Para criar um superadmin:');
      console.log('      1. Use o script scripts/create-superadmin.js');
      console.log('      2. Ou execute: node gerar_hash.js para gerar senha');
    } else {
      console.log(`   ✅ ${superadmins.rows.length} superadmin(s) encontrado(s):`);
      superadmins.rows.forEach(admin => {
        const status = admin.ativo ? '✅' : '❌';
        console.log(`      ${status} ${admin.nome} (${admin.email})`);
      });
    }

    console.log('\n🎉 Configuração do domínio administrativo concluída!\n');

    console.log('📝 Próximos passos:');
    console.log('   1. Adicione ao hosts: 127.0.0.1 admin.localhost');
    console.log('   2. Teste: http://admin.localhost:3000/auth/login-admin');
    console.log('   3. Verifique isolamento com usuários não-superadmin');

  } catch (error) {
    console.error('❌ Erro na configuração do domínio administrativo:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  runAdminDomainMigration().catch(console.error);
}

module.exports = { runAdminDomainMigration };
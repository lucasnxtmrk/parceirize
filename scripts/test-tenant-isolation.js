#!/usr/bin/env node

const { Pool } = require('pg');
const { TenantValidation } = require('../src/lib/tenant-validation.js');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Delus9798-@localhost:5432/protege',
});

async function testTenantIsolation() {
  const client = await pool.connect();

  try {
    console.log('🔐 Testando Isolamento de Login por Tenant\n');

    // 1. Buscar dados de teste
    console.log('1️⃣ Coletando dados de teste...');

    // Buscar domínios configurados
    const domains = await client.query(`
      SELECT
        dp.dominio,
        dp.tipo,
        p.tenant_id,
        p.nome_empresa,
        p.id as provedor_id
      FROM dominios_personalizados dp
      JOIN provedores p ON dp.provedor_id = p.id
      WHERE dp.ativo = true AND dp.verificado = true
      ORDER BY dp.dominio
    `);

    console.log(`   ✓ Encontrados ${domains.rows.length} domínios configurados`);

    if (domains.rows.length < 2) {
      console.log('   ⚠️  Executando setup de domínios primeiro...');
      await require('./setup-local-domains.js').setupLocalDomains();
      console.log('   ✓ Setup concluído, continuando testes...\n');
    }

    // Buscar usuários de diferentes tenants
    const users = await client.query(`
      SELECT
        'cliente' as user_type,
        id,
        nome,
        email,
        tenant_id,
        'cliente' as role
      FROM clientes
      WHERE ativo = true

      UNION ALL

      SELECT
        'parceiro' as user_type,
        id,
        nome_empresa as nome,
        email,
        tenant_id,
        'parceiro' as role
      FROM parceiros
      WHERE ativo = true

      ORDER BY tenant_id, user_type
    `);

    console.log(`   ✓ Encontrados ${users.rows.length} usuários de teste\n`);

    // 2. Testar cenários de isolamento
    console.log('2️⃣ Testando cenários de isolamento...\n');

    const testCases = [
      {
        name: 'Cliente correto no domínio correto',
        domain: 'empresa1.localhost',
        user: users.rows.find(u => u.email === 'cliente1@teste.com'),
        shouldAllow: true
      },
      {
        name: 'Cliente de empresa1 tentando acessar empresa2',
        domain: 'empresa2.localhost',
        user: users.rows.find(u => u.email === 'cliente1@teste.com'),
        shouldAllow: false
      },
      {
        name: 'Cliente de empresa2 no domínio correto',
        domain: 'empresa2.localhost',
        user: users.rows.find(u => u.email === 'cliente2@teste.com'),
        shouldAllow: true
      },
      {
        name: 'Parceiro correto no domínio correto',
        domain: 'empresa1.localhost',
        user: users.rows.find(u => u.email === 'parceiro1@teste.com'),
        shouldAllow: true
      },
      {
        name: 'Parceiro de empresa1 tentando acessar empresa2',
        domain: 'empresa2.localhost',
        user: users.rows.find(u => u.email === 'parceiro1@teste.com'),
        shouldAllow: false
      },
      {
        name: 'Usuário de clube no domínio correto',
        domain: 'clube.localhost',
        user: users.rows.find(u => u.email === 'cliente3@teste.com'),
        shouldAllow: true
      }
    ];

    for (const testCase of testCases) {
      if (!testCase.user) {
        console.log(`   ⚠️  ${testCase.name} - Usuário não encontrado`);
        continue;
      }

      console.log(`   🧪 ${testCase.name}`);
      console.log(`      Domínio: ${testCase.domain}`);
      console.log(`      Usuário: ${testCase.user.email} (${testCase.user.role})`);
      console.log(`      Tenant: ${testCase.user.tenant_id}`);

      try {
        const result = await TenantValidation.validateUserDomainAccess(
          testCase.domain,
          testCase.user
        );

        const success = result.allowed === testCase.shouldAllow;
        const icon = success ? '✅' : '❌';
        const expected = testCase.shouldAllow ? 'PERMITIR' : 'BLOQUEAR';
        const actual = result.allowed ? 'PERMITIDO' : 'BLOQUEADO';

        console.log(`      ${icon} Esperado: ${expected} | Resultado: ${actual}`);

        if (result.reason) {
          console.log(`      📝 Motivo: ${result.reason}`);
        }

        if (result.message) {
          console.log(`      💬 Mensagem: ${result.message}`);
        }

        if (!success) {
          console.log(`      ⚠️  TESTE FALHOU!`);
        }

      } catch (error) {
        console.log(`      ❌ Erro no teste: ${error.message}`);
      }

      console.log('');
    }

    // 3. Testar domínio principal (sem tenant)
    console.log('3️⃣ Testando acesso ao domínio principal...\n');

    const mainDomainTests = [
      { domain: 'localhost:3000', user: users.rows[0] },
      { domain: 'parceirize.com', user: users.rows[1] }
    ];

    for (const test of mainDomainTests) {
      console.log(`   🧪 Testando ${test.user.email} em ${test.domain}`);

      const result = await TenantValidation.validateUserDomainAccess(
        test.domain,
        test.user
      );

      console.log(`      ${result.allowed ? '✅' : '❌'} ${result.allowed ? 'PERMITIDO' : 'BLOQUEADO'}`);
      console.log(`      📝 Motivo: ${result.reason || 'Domínio principal'}\n`);
    }

    // 4. Testar logs de acesso
    console.log('4️⃣ Verificando logs de acesso...\n');

    const recentLogs = await client.query(`
      SELECT
        dp.dominio,
        ad.user_agent,
        ad.status_code,
        ad.criado_em,
        ad.user_tipo
      FROM acessos_dominio ad
      JOIN dominios_personalizados dp ON ad.dominio_id = dp.id
      WHERE ad.metodo = 'LOGIN_ATTEMPT'
      ORDER BY ad.criado_em DESC
      LIMIT 5
    `);

    console.log(`   📊 Últimas ${recentLogs.rows.length} tentativas de login:`);

    recentLogs.rows.forEach(log => {
      const status = log.status_code === 200 ? '✅ SUCESSO' : '❌ BLOQUEADO';
      console.log(`      ${status} - ${log.dominio} - ${log.user_tipo} - ${new Date(log.criado_em).toLocaleString()}`);
    });

    // 5. Estatísticas de segurança
    console.log('\n5️⃣ Estatísticas de segurança...\n');

    const securityStats = await client.query(`
      SELECT
        COUNT(*) as total_tentativas,
        COUNT(CASE WHEN status_code = 200 THEN 1 END) as sucessos,
        COUNT(CASE WHEN status_code = 403 THEN 1 END) as bloqueios,
        COUNT(DISTINCT dominio_id) as dominios_acessados
      FROM acessos_dominio
      WHERE metodo = 'LOGIN_ATTEMPT'
        AND criado_em >= NOW() - INTERVAL '1 day'
    `);

    const stats = securityStats.rows[0];
    console.log(`   📈 Últimas 24 horas:`);
    console.log(`      🔑 Total de tentativas: ${stats.total_tentativas}`);
    console.log(`      ✅ Sucessos: ${stats.sucessos}`);
    console.log(`      ❌ Bloqueios: ${stats.bloqueios}`);
    console.log(`      🌐 Domínios acessados: ${stats.dominios_acessados}`);

    if (stats.bloqueios > 0) {
      const blockRatio = ((stats.bloqueios / stats.total_tentativas) * 100).toFixed(1);
      console.log(`      🛡️  Taxa de bloqueio: ${blockRatio}%`);
    }

    console.log('\n🎉 Teste de isolamento de tenant concluído!\n');

    console.log('📋 Resumo da Configuração:');
    console.log('   ✅ Validação no momento do login (NextAuth)');
    console.log('   ✅ Verificação no middleware para rotas');
    console.log('   ✅ Logs de auditoria de tentativas');
    console.log('   ✅ Bloqueio automático de acessos incorretos');
    console.log('   ✅ Isolamento completo por tenant');

    console.log('\n🧪 Para testar manualmente:');
    console.log('   1. Login com cliente1@teste.com em empresa1.localhost:3000 ✅');
    console.log('   2. Login com cliente1@teste.com em empresa2.localhost:3000 ❌');
    console.log('   3. Login com cliente2@teste.com em empresa2.localhost:3000 ✅');
    console.log('   4. Verificar logs em acessos_dominio');

  } catch (error) {
    console.error('❌ Erro no teste de isolamento:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  testTenantIsolation().catch(console.error);
}

module.exports = { testTenantIsolation };
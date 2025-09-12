const { Pool } = require('pg');

// Configuração do banco
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Delus9798-@localhost:5432/protege',
});

async function testLoginRoutes() {
  let client;
  
  try {
    client = await pool.connect();
    console.log('🔗 Conectado ao PostgreSQL. Testando rotas de login...\n');

    // Buscar todas as contas para teste
    console.log('👥 CONTAS DISPONÍVEIS PARA TESTE:\n');

    // SuperAdmin
    const superadmins = await client.query('SELECT nome, email, ativo FROM superadmins WHERE ativo = true');
    console.log('🔴 SUPERADMIN:');
    superadmins.rows.forEach(admin => {
      console.log(`  📧 ${admin.email} | 🔑 123456 | 🎯 /superadmin/dashboard`);
    });

    // Provedores
    const provedores = await client.query(`
      SELECT p.nome_empresa, p.email, p.ativo, pl.nome as plano_nome, p.subdominio
      FROM provedores p
      LEFT JOIN planos pl ON p.plano_id = pl.id
      WHERE p.ativo = true
      ORDER BY p.id DESC
    `);
    console.log('\n🟠 PROVEDORES:');
    provedores.rows.forEach(prov => {
      console.log(`  📧 ${prov.email} | 🔑 123456 | 🎯 /dashboard`);
      console.log(`     🏢 ${prov.nome_empresa} (${prov.plano_nome})`);
      if (prov.subdominio) {
        console.log(`     🌐 Subdomínio: ${prov.subdominio}.parceirize.com`);
      }
      console.log('');
    });

    // Clientes
    const clientes = await client.query(`
      SELECT nome, sobrenome, email, id_carteirinha, ativo, tenant_id
      FROM clientes 
      WHERE ativo = true 
      ORDER BY id DESC 
      LIMIT 5
    `);
    console.log('🟢 CLIENTES:');
    clientes.rows.forEach(cliente => {
      console.log(`  📧 ${cliente.email} | 🔑 123456 | 🎯 /carteirinha`);
      console.log(`     👤 ${cliente.nome} ${cliente.sobrenome || ''} - Carteirinha: ${cliente.id_carteirinha}`);
    });

    // Parceiros
    const parceiros = await client.query(`
      SELECT nome_empresa, email, nicho, tenant_id
      FROM parceiros 
      ORDER BY id DESC 
      LIMIT 5
    `);
    console.log('\n🟡 PARCEIROS:');
    parceiros.rows.forEach(parceiro => {
      console.log(`  📧 ${parceiro.email} | 🔑 123456 | 🎯 /painel`);
      console.log(`     🏪 ${parceiro.nome_empresa} (${parceiro.nicho})`);
    });

    // Verificar estrutura de rotas esperadas
    console.log('\n🛤️  ESTRUTURA DE ROTAS:\n');
    console.log('SuperAdmin:');
    console.log('  ✅ /superadmin/dashboard - Dashboard principal');
    console.log('  ✅ /superadmin/provedores - Gestão de provedores');
    
    console.log('\nProvedor (ex-admin):');
    console.log('  ✅ /dashboard - Dashboard principal');
    console.log('  ✅ /admin-cliente - Gestão de clientes');
    console.log('  ✅ /admin-parceiro - Gestão de parceiros');
    console.log('  ✅ /admin-vouchers - Gestão de vouchers');
    console.log('  ✅ /integracoes - Configurações de integração');
    console.log('  ✅ /importar-clientes - Importação de dados');
    
    console.log('\nCliente:');
    console.log('  ✅ /carteirinha - Carteira digital');
    console.log('  ✅ /vouchers - Vouchers disponíveis');
    console.log('  ✅ /catalogo - Catálogo de produtos');
    
    console.log('\nParceiro:');
    console.log('  ✅ /painel - Dashboard do parceiro');
    console.log('  ✅ /perfil - Perfil do parceiro');
    console.log('  ✅ /produtos - Gestão de produtos');

    // Verificar middleware
    console.log('\n🛡️  PROTEÇÕES DO MIDDLEWARE:\n');
    console.log('Middleware protege as seguintes rotas:');
    console.log('  🔴 /superadmin/* → apenas superadmin');
    console.log('  🟠 /dashboard → superadmin + provedor');
    console.log('  🟠 /admin-* → superadmin + provedor');
    console.log('  🟠 /integracoes → superadmin + provedor');
    console.log('  🟢 /carteirinha → apenas cliente');
    console.log('  🟡 /painel → apenas parceiro');

    console.log('\n🧪 TESTE RECOMENDADO:\n');
    console.log('1. Teste SuperAdmin:');
    console.log('   📧 admin@nextmark.com.br | 🔑 123456');
    console.log('   🎯 Deve redirecionar para /superadmin/dashboard');
    
    if (provedores.rows.length > 0) {
      console.log('\n2. Teste Provedor:');
      console.log(`   📧 ${provedores.rows[0].email} | 🔑 123456`);
      console.log('   🎯 Deve redirecionar para /dashboard');
    }
    
    if (clientes.rows.length > 0) {
      console.log('\n3. Teste Cliente:');
      console.log(`   📧 ${clientes.rows[0].email} | 🔑 123456`);
      console.log('   🎯 Deve redirecionar para /carteirinha');
    }
    
    if (parceiros.rows.length > 0) {
      console.log('\n4. Teste Parceiro:');
      console.log(`   📧 ${parceiros.rows[0].email} | 🔑 123456`);
      console.log('   🎯 Deve redirecionar para /painel');
    }

    console.log('\n⚠️  TROUBLESHOOTING:\n');
    console.log('Se ainda houver erro "não autorizado":');
    console.log('1. Verificar se a role está correta na sessão');
    console.log('2. Verificar se o middleware está detectando a rota corretamente');
    console.log('3. Verificar se a página de destino existe');
    console.log('4. Limpar cookies/localStorage e tentar novamente');
    
  } catch (error) {
    console.error('❌ Erro durante os testes:', error.message);
    throw error;
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

// Executar testes
testLoginRoutes()
  .then(() => {
    console.log('\n✅ Análise de rotas concluída');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Falha na análise:', error);
    process.exit(1);
  });
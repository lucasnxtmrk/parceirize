const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Delus9798-@localhost:5432/protege',
});

async function testProvedorLogin() {
  let client;
  
  try {
    client = await pool.connect();
    console.log('🔗 Conectado ao PostgreSQL. Testando dados do provedor...\n');

    // Verificar se o provedor existe e suas credenciais
    const provedorQuery = `
      SELECT 
        id, nome_empresa, email, senha, ativo, tenant_id, plano_id
      FROM provedores 
      WHERE email = 'teste@multitenant.com'
    `;
    
    const provedorResult = await client.query(provedorQuery);
    
    if (provedorResult.rows.length === 0) {
      console.log('❌ Provedor teste@multitenant.com não encontrado');
      return;
    }
    
    const provedor = provedorResult.rows[0];
    console.log('✅ PROVEDOR ENCONTRADO:');
    console.log(`   📧 Email: ${provedor.email}`);
    console.log(`   🏢 Empresa: ${provedor.nome_empresa}`);
    console.log(`   🆔 ID: ${provedor.id}`);
    console.log(`   🏠 Tenant ID: ${provedor.tenant_id}`);
    console.log(`   📋 Plano ID: ${provedor.plano_id}`);
    console.log(`   ✅ Ativo: ${provedor.ativo}`);
    console.log(`   🔑 Hash senha: ${provedor.senha ? 'Existe' : 'Não existe'}`);
    
    // Verificar se a senha está correta
    const bcrypt = require('bcryptjs');
    const senhaCorreta = await bcrypt.compare('123456', provedor.senha);
    console.log(`   🔓 Senha '123456' correta: ${senhaCorreta ? '✅ SIM' : '❌ NÃO'}`);
    
    // Verificar alguns dados relacionados ao tenant
    const clientesQuery = `
      SELECT COUNT(*) as total 
      FROM clientes 
      WHERE tenant_id = $1 AND ativo = true
    `;
    
    const parceirosQuery = `
      SELECT COUNT(*) as total 
      FROM parceiros 
      WHERE tenant_id = $1 AND ativo = true
    `;
    
    const clientesResult = await client.query(clientesQuery, [provedor.tenant_id]);
    const parceirosResult = await client.query(parceirosQuery, [provedor.tenant_id]);
    
    console.log('\n🏠 DADOS DO TENANT:');
    console.log(`   👥 Clientes: ${clientesResult.rows[0].total}`);
    console.log(`   🤝 Parceiros: ${parceirosResult.rows[0].total}`);
    
    console.log('\n🎯 TESTE DE LOGIN:');
    console.log('1. Acesse: http://localhost:3000/auth/login');
    console.log('2. Use as credenciais:');
    console.log('   📧 Email: teste@multitenant.com');
    console.log('   🔑 Senha: 123456');
    console.log('3. Deve redirecionar para: /dashboard');
    console.log('4. Role esperada na sessão: provedor');
    console.log(`5. Tenant ID na sessão: ${provedor.tenant_id}`);
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

testProvedorLogin()
  .then(() => {
    console.log('\n✅ Teste concluído');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Falha no teste:', error);
    process.exit(1);
  });
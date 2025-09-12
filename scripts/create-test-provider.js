const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Configuração do banco
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Delus9798-@localhost:5432/protege',
});

async function createTestProvider() {
  let client;
  
  try {
    client = await pool.connect();
    console.log('🔗 Conectado ao PostgreSQL. Criando provedor de teste...\n');

    // Dados do provedor de teste
    const providerData = {
      nome_empresa: 'Loja Teste Multi-Tenant',
      email: 'teste@multitenant.com',
      senha: '123456', // Será hashada
      subdominio: 'teste',
      plano_id: 1, // Básico
      data_vencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 dias
    };

    // Verificar se já existe
    const existsCheck = await client.query(
      'SELECT id FROM provedores WHERE email = $1 OR subdominio = $2',
      [providerData.email, providerData.subdominio]
    );

    if (existsCheck.rows.length > 0) {
      console.log('⚠️ Provedor de teste já existe. Removendo o antigo...');
      await client.query('DELETE FROM provedores WHERE email = $1 OR subdominio = $2', 
        [providerData.email, providerData.subdominio]);
    }

    // Hash da senha
    const senhaHash = await bcrypt.hash(providerData.senha, 12);

    // Inserir novo provedor
    const result = await client.query(`
      INSERT INTO provedores 
      (nome_empresa, email, senha, subdominio, plano_id, data_vencimento, ativo)
      VALUES ($1, $2, $3, $4, $5, $6, true)
      RETURNING id, tenant_id, nome_empresa, email, subdominio, plano_id, data_vencimento, created_at
    `, [
      providerData.nome_empresa,
      providerData.email,
      senhaHash,
      providerData.subdominio,
      providerData.plano_id,
      providerData.data_vencimento
    ]);

    const novoProvedor = result.rows[0];

    console.log('✅ PROVEDOR DE TESTE CRIADO COM SUCESSO!');
    console.log('📋 Dados do Provedor:');
    console.log(`   🏢 Empresa: ${novoProvedor.nome_empresa}`);
    console.log(`   📧 Email: ${novoProvedor.email}`);
    console.log(`   🔑 Senha: ${providerData.senha}`);
    console.log(`   🌐 Subdomínio: ${novoProvedor.subdominio}.parceirize.com`);
    console.log(`   🆔 ID: ${novoProvedor.id}`);
    console.log(`   🎯 Tenant ID: ${novoProvedor.tenant_id}`);
    console.log(`   📅 Vencimento: ${novoProvedor.data_vencimento.toLocaleDateString('pt-BR')}`);

    // Buscar dados do plano
    const planoData = await client.query('SELECT nome, preco, limite_clientes, limite_parceiros FROM planos WHERE id = $1', [novoProvedor.plano_id]);
    const plano = planoData.rows[0];
    
    console.log(`   📦 Plano: ${plano.nome} - R$ ${plano.preco}`);
    console.log(`   📊 Limites: ${plano.limite_clientes} clientes, ${plano.limite_parceiros} parceiros`);

    // Criar alguns dados de teste para este tenant
    console.log('\n🧪 Criando dados de teste para o provedor...');

    // Cliente de teste
    const clienteTeste = await client.query(`
      INSERT INTO clientes 
      (nome, sobrenome, email, id_carteirinha, senha, tenant_id, ativo, tipo_cliente)
      VALUES ($1, $2, $3, $4, $5, $6, true, 'comum')
      RETURNING id, nome, email, id_carteirinha
    `, [
      'Cliente',
      'Teste Multi-Tenant', 
      'cliente@teste.com',
      'TST001',
      await bcrypt.hash('123456', 12),
      novoProvedor.tenant_id
    ]);

    // Parceiro de teste  
    const parceiroTeste = await client.query(`
      INSERT INTO parceiros 
      (nome_empresa, email, senha, nicho, tenant_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, nome_empresa, email, nicho
    `, [
      'Parceiro Teste Multi-Tenant',
      'parceiro@teste.com', 
      await bcrypt.hash('123456', 12),
      'Alimentação',
      novoProvedor.tenant_id
    ]);

    // Produto de teste
    const produtoTeste = await client.query(`
      INSERT INTO produtos 
      (parceiro_id, nome, descricao, preco, desconto, tenant_id, ativo)
      VALUES ($1, $2, $3, $4, $5, $6, true)
      RETURNING id, nome, preco, desconto
    `, [
      parceiroTeste.rows[0].id,
      'Hambúrguer Artesanal',
      'Hambúrguer artesanal com desconto especial',
      25.90,
      15.0, // 15% desconto
      novoProvedor.tenant_id
    ]);

    console.log('✅ Dados de teste criados:');
    console.log(`   👤 Cliente: ${clienteTeste.rows[0].nome} (${clienteTeste.rows[0].email}) - Carteirinha: ${clienteTeste.rows[0].id_carteirinha}`);
    console.log(`   🏪 Parceiro: ${parceiroTeste.rows[0].nome_empresa} (${parceiroTeste.rows[0].email})`);
    console.log(`   📦 Produto: ${produtoTeste.rows[0].nome} - R$ ${produtoTeste.rows[0].preco} (${produtoTeste.rows[0].desconto}% desc)`);

    // Log da criação
    await client.query(`
      INSERT INTO tenant_logs 
      (tenant_id, usuario_tipo, usuario_id, acao, detalhes) 
      VALUES ($1, 'script', 0, 'provedor_teste_criado', $2)
    `, [
      novoProvedor.tenant_id,
      JSON.stringify({
        provedor: novoProvedor.nome_empresa,
        email: novoProvedor.email,
        dados_teste: {
          clientes: 1,
          parceiros: 1,
          produtos: 1
        }
      })
    ]);

    console.log('\n🎯 TESTES SUGERIDOS:');
    console.log('1. Login como SuperAdmin:');
    console.log('   📧 admin@nextmark.com.br | 🔑 123456');
    console.log('   🎯 Acessar: /superadmin/dashboard');
    
    console.log('\n2. Login como Provedor:');
    console.log(`   📧 ${novoProvedor.email} | 🔑 ${providerData.senha}`);
    console.log('   🎯 Acessar: /dashboard');
    
    console.log('\n3. Login como Cliente:');
    console.log('   📧 cliente@teste.com | 🔑 123456');
    console.log('   🎯 Acessar: /carteirinha');
    
    console.log('\n4. Login como Parceiro:');
    console.log('   📧 parceiro@teste.com | 🔑 123456');
    console.log('   🎯 Acessar: /painel');

    console.log('\n🌐 TESTE DE SUBDOMÍNIO:');
    console.log(`   🔗 URL: http://teste.localhost:3000`);
    console.log('   ⚠️ Configurar DNS local ou hosts para testar subdomínio');

    return novoProvedor;
    
  } catch (error) {
    console.error('❌ Erro ao criar provedor de teste:', error.message);
    throw error;
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

// Executar criação
createTestProvider()
  .then(() => {
    console.log('\n🎉 PROVEDOR DE TESTE CONFIGURADO COM SUCESSO!');
    console.log('🚀 Sistema multi-tenant pronto para testes completos!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Falha ao criar provedor de teste:', error);
    process.exit(1);
  });
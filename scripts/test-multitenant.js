const { Pool } = require('pg');

// Configuração do banco
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Delus9798-@localhost:5432/protege',
});

async function testMultiTenantSetup() {
  let client;
  
  try {
    client = await pool.connect();
    console.log('🔗 Conectado ao PostgreSQL. Testando configuração multi-tenant...\n');

    // 1. Verificar estrutura das tabelas
    console.log('📋 1. VERIFICANDO ESTRUTURA DAS TABELAS:');
    
    const tables = await client.query(`
      SELECT table_name, 
             (SELECT column_name FROM information_schema.columns 
              WHERE table_name = t.table_name AND column_name = 'tenant_id') as has_tenant_id
      FROM information_schema.tables t
      WHERE table_schema = 'public' 
      AND table_name IN ('planos', 'superadmins', 'provedores', 'clientes', 'parceiros', 'produtos', 'pedidos')
      ORDER BY table_name
    `);

    tables.rows.forEach(table => {
      const hasField = table.has_tenant_id ? '✅' : (table.table_name === 'superadmins' || table.table_name === 'planos' ? '➖' : '❌');
      console.log(`  ${hasField} ${table.table_name} ${table.has_tenant_id ? '(tenant_id)' : ''}`);
    });

    // 2. Verificar dados de planos
    console.log('\n💰 2. VERIFICANDO PLANOS CRIADOS:');
    const planos = await client.query('SELECT id, nome, preco, limite_clientes, limite_parceiros FROM planos ORDER BY id');
    planos.rows.forEach(plano => {
      console.log(`  ✅ ID ${plano.id}: ${plano.nome} - R$ ${plano.preco} (${plano.limite_clientes || '∞'} clientes, ${plano.limite_parceiros || '∞'} parceiros)`);
    });

    // 3. Verificar SuperAdmin
    console.log('\n👨‍💼 3. VERIFICANDO SUPERADMIN:');
    const superadmins = await client.query('SELECT id, nome, email, ativo FROM superadmins');
    if (superadmins.rows.length > 0) {
      superadmins.rows.forEach(admin => {
        console.log(`  ✅ ${admin.nome} (${admin.email}) - ${admin.ativo ? 'Ativo' : 'Inativo'}`);
      });
    } else {
      console.log('  ❌ Nenhum SuperAdmin encontrado');
    }

    // 4. Verificar Provedores
    console.log('\n🏢 4. VERIFICANDO PROVEDORES:');
    const provedores = await client.query(`
      SELECT p.id, p.tenant_id, p.nome_empresa, p.email, p.ativo, 
             pl.nome as plano_nome, p.subdominio
      FROM provedores p
      LEFT JOIN planos pl ON p.plano_id = pl.id
      ORDER BY p.created_at DESC
    `);

    if (provedores.rows.length > 0) {
      provedores.rows.forEach(prov => {
        console.log(`  ✅ ${prov.nome_empresa} (${prov.email})`);
        console.log(`     📍 Tenant ID: ${prov.tenant_id}`);
        console.log(`     📦 Plano: ${prov.plano_nome}`);
        console.log(`     🌐 Subdomínio: ${prov.subdominio || 'Não definido'}`);
        console.log(`     📊 Status: ${prov.ativo ? 'Ativo' : 'Inativo'}\n`);
      });
    } else {
      console.log('  ❌ Nenhum provedor encontrado');
    }

    // 5. Verificar dados existentes com tenant_id
    console.log('👥 5. VERIFICANDO MIGRAÇÃO DE DADOS EXISTENTES:');
    
    const clientes = await client.query('SELECT COUNT(*) as total, COUNT(tenant_id) as with_tenant FROM clientes');
    const parceiros = await client.query('SELECT COUNT(*) as total, COUNT(tenant_id) as with_tenant FROM parceiros');
    const produtos = await client.query('SELECT COUNT(*) as total, COUNT(tenant_id) as with_tenant FROM produtos');

    console.log(`  👤 Clientes: ${clientes.rows[0].total} total, ${clientes.rows[0].with_tenant} com tenant_id`);
    console.log(`  🏪 Parceiros: ${parceiros.rows[0].total} total, ${parceiros.rows[0].with_tenant} com tenant_id`);
    console.log(`  📦 Produtos: ${produtos.rows[0].total} total, ${produtos.rows[0].with_tenant} com tenant_id`);

    // 6. Teste de isolamento
    console.log('\n🔒 6. TESTE DE ISOLAMENTO POR TENANT:');
    if (provedores.rows.length > 0) {
      const tenantId = provedores.rows[0].tenant_id;
      
      const clientesTenant = await client.query('SELECT COUNT(*) as total FROM clientes WHERE tenant_id = $1', [tenantId]);
      const parceirosTenant = await client.query('SELECT COUNT(*) as total FROM parceiros WHERE tenant_id = $1', [tenantId]);
      
      console.log(`  🔍 Dados do tenant ${tenantId}:`);
      console.log(`     👤 ${clientesTenant.rows[0].total} clientes`);
      console.log(`     🏪 ${parceirosTenant.rows[0].total} parceiros`);
    }

    // 7. Verificar foreign keys
    console.log('\n🔗 7. VERIFICANDO FOREIGN KEYS:');
    const fkeys = await client.query(`
      SELECT tc.constraint_name, tc.table_name, kcu.column_name, 
             ccu.table_name AS foreign_table_name,
             ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'tenant_id'
      ORDER BY tc.table_name
    `);

    fkeys.rows.forEach(fk => {
      console.log(`  ✅ ${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
    });

    // 8. Resumo final
    console.log('\n📊 RESUMO DA CONFIGURAÇÃO:');
    console.log(`✅ SuperAdmins: ${superadmins.rows.length}`);
    console.log(`✅ Provedores: ${provedores.rows.length}`);
    console.log(`✅ Planos: ${planos.rows.length}`);
    console.log(`✅ Clientes com tenant_id: ${clientes.rows[0].with_tenant}/${clientes.rows[0].total}`);
    console.log(`✅ Parceiros com tenant_id: ${parceiros.rows[0].with_tenant}/${parceiros.rows[0].total}`);

    const isReady = superadmins.rows.length > 0 && 
                   provedores.rows.length > 0 && 
                   planos.rows.length >= 3 &&
                   clientes.rows[0].with_tenant > 0;

    console.log('\n🎯 STATUS FINAL:');
    if (isReady) {
      console.log('🟢 SISTEMA MULTI-TENANT PRONTO PARA USO!');
      console.log('👉 Próximo passo: Testar login com SuperAdmin');
      console.log('📧 Email: admin@nextmark.com.br');
      console.log('🔑 Senha: 123456');
    } else {
      console.log('🟡 Sistema parcialmente configurado. Verificar pendências acima.');
    }
    
  } catch (error) {
    console.error('❌ Erro durante os testes:', error.message);
    throw error;
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

// Executar testes
testMultiTenantSetup()
  .then(() => {
    console.log('\n✅ Testes concluídos');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Falha nos testes:', error);
    process.exit(1);
  });
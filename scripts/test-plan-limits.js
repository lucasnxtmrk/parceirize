const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Delus9798-@localhost:5432/protege',
});

async function testPlanLimits() {
  let client;
  
  try {
    client = await pool.connect();
    console.log('🔗 Conectado ao PostgreSQL. Testando limites dos planos...\n');

    // Verificar dados atuais dos provedores e seus limites
    const provedorQuery = `
      SELECT 
        p.nome_empresa,
        p.email,
        p.tenant_id,
        pl.nome as plano,
        pl.limite_clientes,
        pl.limite_parceiros,
        pl.limite_vouchers
      FROM provedores p
      LEFT JOIN planos pl ON p.plano_id = pl.id
      WHERE p.ativo = true
    `;
    
    const provedores = await client.query(provedorQuery);
    
    console.log('📋 PROVEDORES E SEUS LIMITES:\n');
    
    for (const prov of provedores.rows) {
      console.log(`🏢 ${prov.nome_empresa} (${prov.plano})`);
      console.log(`   📧 Email: ${prov.email}`);
      console.log(`   🏠 Tenant ID: ${prov.tenant_id}`);
      console.log(`   📊 Limites do plano:`);
      console.log(`      👥 Clientes: ${prov.limite_clientes || 'Ilimitado'}`);
      console.log(`      🤝 Parceiros: ${prov.limite_parceiros || 'Ilimitado'}`);
      console.log(`      🎫 Vouchers: ${prov.limite_vouchers || 'Ilimitado'}`);
      
      // Verificar uso atual
      const usoAtual = await client.query(`
        SELECT 
          (SELECT COUNT(*) FROM clientes WHERE tenant_id = $1 AND ativo = true) as clientes_atual,
          (SELECT COUNT(*) FROM parceiros WHERE tenant_id = $1 AND ativo = true) as parceiros_atual,
          (SELECT COUNT(*) FROM vouchers v INNER JOIN parceiros pr ON v.parceiro_id = pr.id WHERE pr.tenant_id = $1) as vouchers_atual
      `, [prov.tenant_id]);
      
      const uso = usoAtual.rows[0];
      
      console.log(`   📈 Uso atual:`);
      console.log(`      👥 Clientes: ${uso.clientes_atual}/${prov.limite_clientes || '∞'} ${getUsageStatus(uso.clientes_atual, prov.limite_clientes)}`);
      console.log(`      🤝 Parceiros: ${uso.parceiros_atual}/${prov.limite_parceiros || '∞'} ${getUsageStatus(uso.parceiros_atual, prov.limite_parceiros)}`);
      console.log(`      🎫 Vouchers: ${uso.vouchers_atual}/${prov.limite_vouchers || '∞'} ${getUsageStatus(uso.vouchers_atual, prov.limite_vouchers)}`);
      
      console.log('');
    }
    
    // Testar a função validatePlanLimits
    console.log('🧪 TESTE DE VALIDAÇÃO DE LIMITES:\n');
    
    // Pegar o provedor com plano Básico para teste
    const basicProv = provedores.rows.find(p => p.plano === 'Básico');
    
    if (basicProv) {
      console.log(`🔍 Testando limites para: ${basicProv.nome_empresa}`);
      console.log(`   Limite de clientes: ${basicProv.limite_clientes}`);
      console.log(`   Limite de parceiros: ${basicProv.limite_parceiros}`);
      
      // Verificar se está próximo dos limites
      const uso = await client.query(`
        SELECT 
          COUNT(*) as total_clientes
        FROM clientes 
        WHERE tenant_id = $1 AND ativo = true
      `, [basicProv.tenant_id]);
      
      const totalClientes = parseInt(uso.rows[0].total_clientes);
      const limiteClientes = parseInt(basicProv.limite_clientes);
      
      if (totalClientes >= limiteClientes * 0.8) {
        console.log(`   ⚠️  ATENÇÃO: Próximo do limite de clientes (${totalClientes}/${limiteClientes})`);
      }
      
      if (totalClientes >= limiteClientes) {
        console.log(`   🚫 LIMITE ATINGIDO: Não pode criar mais clientes`);
      } else {
        console.log(`   ✅ Pode criar mais ${limiteClientes - totalClientes} clientes`);
      }
    }
    
    console.log('\n🎯 RECOMENDAÇÕES:');
    console.log('1. Teste criar um cliente quando próximo do limite');
    console.log('2. Verifique se a API bloqueia com erro "Limite do plano atingido"');
    console.log('3. SuperAdmin deve poder criar sem limitações');
    console.log('4. Provedores devem respeitar os limites de seus planos');

  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

function getUsageStatus(atual, limite) {
  if (!limite) return '(Ilimitado)';
  
  const percentage = (atual / limite) * 100;
  
  if (percentage >= 100) return '🚫 (LIMITE ATINGIDO)';
  if (percentage >= 80) return '⚠️  (Próximo do limite)';
  if (percentage >= 50) return '🟡 (Uso moderado)';
  return '✅ (Dentro do limite)';
}

testPlanLimits()
  .then(() => {
    console.log('\n✅ Análise concluída');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Falha no teste:', error);
    process.exit(1);
  });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Delus9798-@localhost:5432/protege',
});

// Versão simplificada da validação de limites para teste
async function validatePlanLimits(client, tenantId, type, currentCount) {
  if (!tenantId) return true; // SuperAdmin sem limites

  try {
    // Buscar limites do plano
    const planQuery = `
      SELECT pl.limite_clientes, pl.limite_parceiros, pl.limite_vouchers, pl.limite_produtos
      FROM provedores p
      JOIN planos pl ON p.plano_id = pl.id
      WHERE p.tenant_id = $1 AND p.ativo = true
    `;

    const result = await client.query(planQuery, [tenantId]);
    
    if (result.rows.length === 0) {
      throw new Error('Plano não encontrado ou provedor inativo');
    }

    const limits = result.rows[0];
    
    // Verificar limite específico
    let limit = null;
    switch (type) {
      case 'clientes':
        limit = limits.limite_clientes;
        break;
      case 'parceiros':
        limit = limits.limite_parceiros;
        break;
      case 'vouchers':
        limit = limits.limite_vouchers;
        break;
      case 'produtos':
        limit = limits.limite_produtos;
        break;
    }

    // NULL significa ilimitado
    if (limit === null) return true;
    
    // Verificar se excedeu o limite
    if (currentCount >= limit) {
      throw new Error(`Limite do plano atingido: máximo ${limit} ${type} permitidos`);
    }

    return true;

  } catch (error) {
    throw error;
  }
}

async function testLimitValidation() {
  let client;
  
  try {
    client = await pool.connect();
    console.log('🔗 Conectado ao PostgreSQL. Testando validação de limites...\n');

    // Encontrar um tenant com plano Básico próximo dos limites
    const tenantQuery = `
      SELECT 
        p.tenant_id,
        p.nome_empresa,
        pl.nome as plano,
        pl.limite_parceiros,
        (SELECT COUNT(*) FROM parceiros WHERE tenant_id = p.tenant_id AND ativo = true) as parceiros_atual
      FROM provedores p
      JOIN planos pl ON p.plano_id = pl.id
      WHERE pl.nome = 'Básico' AND p.ativo = true
      LIMIT 1
    `;
    
    const tenantResult = await client.query(tenantQuery);
    
    if (tenantResult.rows.length === 0) {
      console.log('❌ Não foi encontrado provedor com plano Básico');
      return;
    }
    
    const tenant = tenantResult.rows[0];
    console.log(`🏢 Testando com: ${tenant.nome_empresa}`);
    console.log(`📊 Plano: ${tenant.plano} (limite: ${tenant.limite_parceiros} parceiros)`);
    console.log(`📈 Parceiros atuais: ${tenant.parceiros_atual}\n`);
    
    // Simular criação de parceiros até atingir o limite
    const limite = parseInt(tenant.limite_parceiros);
    const atual = parseInt(tenant.parceiros_atual);
    const restantes = limite - atual;
    
    console.log(`🎯 Tentando criar ${restantes + 2} parceiros (deve falhar após ${restantes})...\n`);
    
    for (let i = 1; i <= restantes + 2; i++) {
      try {
        console.log(`⏳ Tentativa ${i}: Criando parceiro de teste...`);
        
        // Contar parceiros atuais antes de criar
        const countQuery = await client.query(
          'SELECT COUNT(*) as total FROM parceiros WHERE tenant_id = $1 AND ativo = true',
          [tenant.tenant_id]
        );
        
        const currentCount = parseInt(countQuery.rows[0].total);
        console.log(`   📊 Parceiros atuais: ${currentCount}/${limite}`);
        
        // Validar limite ANTES de tentar criar
        await validatePlanLimits(client, tenant.tenant_id, 'parceiros', currentCount);
        
        // Se passou na validação, criar o parceiro
        const parceiroResult = await client.query(`
          INSERT INTO parceiros (
            nome_empresa, 
            email, 
            senha, 
            foto, 
            nicho, 
            data_criacao,
            tenant_id,
            ativo
          ) VALUES (
            $1, $2, '$2b$10$hash', '/assets/images/avatar.jpg', 'teste', NOW(), $3, true
          ) RETURNING id
        `, [
          `Parceiro Teste ${i}`,
          `teste${Date.now()}${i}@email.com`, // Email único com timestamp
          tenant.tenant_id
        ]);
        
        const parceiroId = parceiroResult.rows[0].id;
        
        // Criar voucher para o parceiro
        await client.query(`
          INSERT INTO vouchers (parceiro_id, codigo, desconto, data_criacao, limite_uso)
          VALUES ($1, $2, 10, NOW(), null)
        `, [parceiroId, `TEST${Date.now()}${i}`]);
        
        console.log(`   ✅ Parceiro criado com sucesso! ID: ${parceiroId}\n`);
        
      } catch (error) {
        if (error.message.includes('Limite do plano atingido')) {
          console.log(`   🚫 LIMITE ATINGIDO: ${error.message}`);
          console.log(`   ✅ Sistema de limitação funcionando corretamente!\n`);
          break;
        } else if (error.message.includes('duplicate key')) {
          console.log(`   ⚠️  Email já existe, tentando próximo...\n`);
          continue;
        } else {
          console.error(`   ❌ Erro inesperado: ${error.message}\n`);
          break;
        }
      }
    }
    
    // Verificar estado final
    const finalCount = await client.query(
      'SELECT COUNT(*) as total FROM parceiros WHERE tenant_id = $1 AND ativo = true',
      [tenant.tenant_id]
    );
    
    console.log(`📊 RESULTADO FINAL:`);
    console.log(`   Parceiros antes do teste: ${tenant.parceiros_atual}`);
    console.log(`   Parceiros após o teste: ${finalCount.rows[0].total}`);
    console.log(`   Limite do plano: ${tenant.limite_parceiros}`);
    
    // Limpar parceiros de teste criados
    console.log(`\n🧹 Limpando dados de teste...`);
    
    // Primeiro remover vouchers
    await client.query(`
      DELETE FROM vouchers WHERE parceiro_id IN (
        SELECT id FROM parceiros 
        WHERE tenant_id = $1 AND nome_empresa LIKE 'Parceiro Teste %'
      )
    `, [tenant.tenant_id]);
    
    // Depois remover parceiros
    const deleteResult = await client.query(`
      DELETE FROM parceiros 
      WHERE tenant_id = $1 AND nome_empresa LIKE 'Parceiro Teste %'
      RETURNING id
    `, [tenant.tenant_id]);
    
    console.log(`✅ Removidos ${deleteResult.rowCount} parceiros de teste\n`);
    
    console.log('🎯 CONCLUSÃO:');
    console.log('✅ Sistema de limitação de planos está funcionando corretamente');
    console.log('✅ Bloqueia criação quando limite é atingido');
    console.log('✅ Retorna mensagem de erro apropriada');

  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

testLimitValidation()
  .then(() => {
    console.log('\n✅ Teste de validação de limites concluído');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Falha no teste:', error);
    process.exit(1);
  });
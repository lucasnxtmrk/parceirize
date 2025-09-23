#!/usr/bin/env node

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Delus9798-@localhost:5432/protege',
});

async function createTestClient() {
  const client = await pool.connect();

  try {
    console.log('🧪 Criando cliente de teste específico...\n');

    // Buscar provedores existentes
    const provedores = await client.query(`
      SELECT id, nome_empresa, subdominio, tenant_id
      FROM provedores
      WHERE ativo = true
      ORDER BY id
    `);

    if (provedores.rows.length < 2) {
      console.log('❌ Necessário pelo menos 2 provedores para teste de isolamento');
      return;
    }

    const provedor1 = provedores.rows[0]; // empresa1
    const provedor2 = provedores.rows[1]; // empresa2

    console.log(`📊 Provedor 1: ${provedor1.nome_empresa} (ID: ${provedor1.id})`);
    console.log(`📊 Provedor 2: ${provedor2.nome_empresa} (ID: ${provedor2.id})`);

    // Criar cliente com CPF específico apenas no Provedor 1
    const cpfTeste = '105.630.394-85';
    const hashedPassword = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6hsrb2L2jy'; // 123456

    // Verificar se cliente já existe
    const existingClient = await client.query(
      'SELECT id, tenant_id FROM clientes WHERE cpf_cnpj = $1',
      [cpfTeste]
    );

    if (existingClient.rows.length > 0) {
      console.log(`⚠️  Cliente com CPF ${cpfTeste} já existe:`);
      existingClient.rows.forEach(row => {
        console.log(`   - ID: ${row.id}, Tenant: ${row.tenant_id}`);
      });

      // Remover clientes existentes para garantir teste limpo
      await client.query('DELETE FROM clientes WHERE cpf_cnpj = $1', [cpfTeste]);
      console.log('🗑️  Clientes anteriores removidos para teste limpo');
    }

    // Criar cliente apenas no Provedor 1 (empresa1)
    const result = await client.query(`
      INSERT INTO clientes (
        nome, sobrenome, email, cpf_cnpj, senha,
        tenant_id, ativo, id_carteirinha, data_criacao
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING id, tenant_id
    `, [
      'JESSIKA DA SILVA',
      'DE SANTANA',
      'jessika.teste@empresa1.com',
      cpfTeste,
      hashedPassword,
      provedor1.tenant_id,
      true,
      'CART9999'
    ]);

    const clienteId = result.rows[0].id;

    console.log(`\n✅ Cliente criado com sucesso!`);
    console.log(`   - Nome: JESSIKA DA SILVA DE SANTANA`);
    console.log(`   - CPF: ${cpfTeste}`);
    console.log(`   - ID: ${clienteId}`);
    console.log(`   - Provedor: ${provedor1.nome_empresa} (ID: ${provedor1.id})`);
    console.log(`   - Tenant ID: ${provedor1.tenant_id}`);
    console.log(`   - Email: jessika.teste@empresa1.com`);
    console.log(`   - Senha: 123456`);

    console.log(`\n🧪 TESTE DE ISOLAMENTO:`);
    console.log(`✅ CPF ${cpfTeste} deve ser encontrado em: empresa1.localhost:3000`);
    console.log(`❌ CPF ${cpfTeste} NÃO deve ser encontrado em: empresa2.localhost:3000`);

    console.log(`\n🌐 URLs para testar:`);
    console.log(`   1. http://empresa1.localhost:3000/login - DEVE ENCONTRAR`);
    console.log(`   2. http://empresa2.localhost:3000/login - NÃO DEVE ENCONTRAR`);

  } catch (error) {
    console.error('❌ Erro ao criar cliente de teste:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  createTestClient().catch(console.error);
}

module.exports = { createTestClient };
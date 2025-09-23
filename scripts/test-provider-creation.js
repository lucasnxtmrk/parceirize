#!/usr/bin/env node

/**
 * Script para testar criação automática de provedor com subdomínio
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Delus9798-@localhost:5432/protege',
});

async function testProviderCreation() {
  const client = await pool.connect();

  try {
    console.log('🧪 Testando Criação Automática de Provedor + Subdomínio\n');

    // 1. Buscar um plano válido
    const planoResult = await client.query('SELECT id FROM planos WHERE ativo = true LIMIT 1');
    if (planoResult.rows.length === 0) {
      console.log('❌ Nenhum plano ativo encontrado');
      return;
    }
    const planoId = planoResult.rows[0].id;

    // 2. Dados do provedor de teste
    const subdominio = `teste${Date.now()}`;
    const provedorData = {
      nome_empresa: `Empresa Teste ${Date.now()}`,
      email: `teste${Date.now()}@exemplo.com`,
      senha: '$2a$12$HashedPasswordExample123456789',
      plano_id: planoId,
      subdominio: subdominio
    };

    console.log('📝 Dados do provedor:');
    console.log(`   Nome: ${provedorData.nome_empresa}`);
    console.log(`   Email: ${provedorData.email}`);
    console.log(`   Subdomínio: ${provedorData.subdominio}`);
    console.log(`   Plano ID: ${provedorData.plano_id}\n`);

    // 3. Simular criação do provedor (parte que já funciona)
    console.log('🏢 Criando provedor...');
    const insertQuery = `
      INSERT INTO provedores
      (nome_empresa, email, senha, plano_id, subdominio, ativo)
      VALUES ($1, $2, $3, $4, $5, true)
      RETURNING id, tenant_id, nome_empresa, email, subdominio
    `;

    const result = await client.query(insertQuery, [
      provedorData.nome_empresa,
      provedorData.email,
      provedorData.senha,
      provedorData.plano_id,
      provedorData.subdominio
    ]);

    const novoProvedor = result.rows[0];
    console.log(`✅ Provedor criado: ID ${novoProvedor.id}, Tenant: ${novoProvedor.tenant_id}`);

    // 4. Simular criação do domínio (nova funcionalidade)
    if (provedorData.subdominio) {
      console.log('\n🌐 Criando subdomínio automático...');

      const dominioCompleto = `${provedorData.subdominio}.parceirize.com`;
      console.log(`   Domínio: ${dominioCompleto}`);

      // Gerar token de verificação
      const verificacaoToken = 'parceirize-verify-' + Math.random().toString(36).substring(7);

      const dominioQuery = `
        INSERT INTO dominios_personalizados (
          provedor_id,
          dominio,
          tipo,
          verificacao_token,
          verificado,
          ativo
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, dominio, tipo, verificado, ativo
      `;

      const dominioResult = await client.query(dominioQuery, [
        novoProvedor.id,
        dominioCompleto,
        'subdominio',
        verificacaoToken,
        true, // Subdomínio padrão já verificado
        true
      ]);

      const novoDominio = dominioResult.rows[0];
      console.log(`✅ Subdomínio criado: ${novoDominio.dominio}`);
      console.log(`   ID: ${novoDominio.id}`);
      console.log(`   Verificado: ${novoDominio.verificado}`);
      console.log(`   Ativo: ${novoDominio.ativo}`);
    }

    // 5. Verificar se tudo foi criado corretamente
    console.log('\n🔍 Verificando criação...');

    const verificacao = await client.query(`
      SELECT
        p.id as provedor_id,
        p.nome_empresa,
        p.subdominio,
        dp.id as dominio_id,
        dp.dominio,
        dp.tipo,
        dp.verificado
      FROM provedores p
      LEFT JOIN dominios_personalizados dp ON p.id = dp.provedor_id
      WHERE p.id = $1
    `, [novoProvedor.id]);

    if (verificacao.rows.length > 0) {
      const dados = verificacao.rows[0];
      console.log('📊 Resultado da verificação:');
      console.log(`   ✅ Provedor: ${dados.nome_empresa} (ID: ${dados.provedor_id})`);

      if (dados.dominio_id) {
        console.log(`   ✅ Domínio: ${dados.dominio} (ID: ${dados.dominio_id})`);
        console.log(`   ✅ Tipo: ${dados.tipo}`);
        console.log(`   ✅ Verificado: ${dados.verificado}`);
      } else {
        console.log(`   ❌ Domínio não foi criado`);
      }
    }

    // 6. Testar detecção de tenant pelo domínio
    console.log('\n🔎 Testando detecção de tenant...');

    const deteccao = await client.query(`
      SELECT buscar_provedor_por_dominio($1) as resultado
    `, [`${provedorData.subdominio}.parceirize.com`]);

    if (deteccao.rows.length > 0) {
      const resultado = deteccao.rows[0].resultado;
      if (resultado) {
        console.log(`✅ Tenant detectado corretamente: ${JSON.stringify(resultado, null, 2)}`);
      } else {
        console.log(`❌ Tenant não foi detectado`);
      }
    }

    console.log('\n🎉 Teste de criação completo!');
    console.log('\n📋 Resumo:');
    console.log(`   🏢 Provedor: ${novoProvedor.nome_empresa}`);
    console.log(`   🌐 URL: ${provedorData.subdominio}.parceirize.com`);
    console.log(`   🔑 Tenant ID: ${novoProvedor.tenant_id}`);
    console.log(`   📧 Login: ${novoProvedor.email}`);

    // 7. Cleanup (opcional - remover dados de teste)
    console.log('\n🧹 Limpando dados de teste...');

    // Remover domínio primeiro (FK constraint)
    await client.query('DELETE FROM dominios_personalizados WHERE provedor_id = $1', [novoProvedor.id]);
    // Remover provedor
    await client.query('DELETE FROM provedores WHERE id = $1', [novoProvedor.id]);

    console.log('✅ Dados de teste removidos');

  } catch (error) {
    console.error('❌ Erro no teste:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  testProviderCreation().catch(console.error);
}

module.exports = { testProviderCreation };
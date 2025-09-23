#!/usr/bin/env node

const { Pool } = require('pg');
const { DomainHelper } = require('../src/lib/domain-helper.js');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Delus9798-@localhost:5432/protege',
});

async function testTenantDetection() {
  try {
    console.log('🧪 Testando detecção de tenant...\n');

    // 1. Testar DomainHelper
    console.log('1. Testando DomainHelper.detectTenantByDomain():');
    const tenantInfo = await DomainHelper.detectTenantByDomain('teste.localhost');
    console.log('   Resultado:', tenantInfo);
    console.log('');

    // 2. Testar busca de cliente
    if (tenantInfo?.tenant_id) {
      console.log('2. Testando busca de cliente:');
      const result = await pool.query(`
        SELECT id, nome, sobrenome, cpf_cnpj, tenant_id, ativo
        FROM clientes
        WHERE cpf_cnpj = $1 AND tenant_id = $2 AND ativo = true
      `, ['105.630.394-85', tenantInfo.tenant_id]);

      console.log(`   Clientes encontrados: ${result.rows.length}`);
      if (result.rows.length > 0) {
        console.log('   Cliente:', result.rows[0]);
      }
      console.log('');
    }

    // 3. Testar cache de domínios
    console.log('3. Testando cache de domínios:');
    const cacheResult = await pool.query(`
      SELECT dp.dominio, dp.provedor_id, dp.tipo, dp.verificado, dp.ativo, p.nome_empresa, p.tenant_id
      FROM dominios_personalizados dp
      INNER JOIN provedores p ON p.id = dp.provedor_id
      WHERE dp.ativo = true AND dp.dominio = 'teste.localhost'
    `);

    console.log(`   Domínios no cache: ${cacheResult.rows.length}`);
    if (cacheResult.rows.length > 0) {
      console.log('   Domínio:', cacheResult.rows[0]);
    }

  } catch (error) {
    console.error('❌ Erro no teste:', error);
  } finally {
    await pool.end();
  }
}

testTenantDetection();
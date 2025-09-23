#!/usr/bin/env node

const { Pool } = require('pg');
const path = require('path');

// Configuração do banco
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Delus9798-@localhost:5432/protege',
});

async function testCustomDomains() {
  const client = await pool.connect();

  try {
    console.log('🧪 Testando Sistema de Domínios Personalizados\n');

    // 1. Testar estrutura do banco
    console.log('1️⃣ Verificando estrutura do banco de dados...');

    // Verificar tabelas
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('dominios_personalizados', 'acessos_dominio')
    `);

    console.log(`   ✓ Tabelas encontradas: ${tables.rows.map(r => r.table_name).join(', ')}`);

    if (tables.rows.length !== 2) {
      throw new Error('Tabelas não encontradas. Execute a migração primeiro.');
    }

    // Verificar funções
    const functions = await client.query(`
      SELECT routine_name FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND routine_name IN ('buscar_provedor_por_dominio', 'gerar_token_verificacao')
    `);

    console.log(`   ✓ Funções encontradas: ${functions.rows.map(r => r.routine_name).join(', ')}`);

    // 2. Testar função de busca de provedor
    console.log('\n2️⃣ Testando busca de provedor por domínio...');

    const testDomains = ['exemplo.parceirize.com', 'teste.parceirize.com'];

    for (const domain of testDomains) {
      const result = await client.query(
        'SELECT * FROM buscar_provedor_por_dominio($1)',
        [domain]
      );

      if (result.rows.length > 0) {
        console.log(`   ✓ ${domain} → Provedor: ${result.rows[0].nome_empresa}`);
      } else {
        console.log(`   ⚠️  ${domain} → Não encontrado`);
      }
    }

    // 3. Testar criação de domínio personalizado
    console.log('\n3️⃣ Testando criação de domínio personalizado...');

    // Buscar um provedor para teste
    const providerResult = await client.query(`
      SELECT id, nome_empresa FROM provedores WHERE ativo = true LIMIT 1
    `);

    if (providerResult.rows.length === 0) {
      console.log('   ⚠️  Nenhum provedor encontrado para teste');
    } else {
      const provider = providerResult.rows[0];
      const testCustomDomain = `teste-${Date.now()}.exemplo.com`;

      try {
        // Gerar token
        const tokenResult = await client.query('SELECT gerar_token_verificacao() as token');
        const token = tokenResult.rows[0].token;

        // Inserir domínio de teste
        const insertResult = await client.query(`
          INSERT INTO dominios_personalizados (
            provedor_id,
            dominio,
            tipo,
            verificacao_token,
            verificacao_metodo
          ) VALUES ($1, $2, $3, $4, $5)
          RETURNING *
        `, [provider.id, testCustomDomain, 'personalizado', token, 'dns_txt']);

        console.log(`   ✓ Domínio criado: ${testCustomDomain}`);
        console.log(`   ✓ Token gerado: ${token.substring(0, 20)}...`);

        // Testar busca pelo domínio criado
        const searchResult = await client.query(
          'SELECT * FROM buscar_provedor_por_dominio($1)',
          [testCustomDomain]
        );

        if (searchResult.rows.length > 0) {
          console.log(`   ✗ ERRO: Domínio não verificado não deveria ser encontrado`);
        } else {
          console.log(`   ✓ Domínio não verificado corretamente não encontrado`);
        }

        // Marcar como verificado e testar novamente
        await client.query(
          'UPDATE dominios_personalizados SET verificado = true WHERE id = $1',
          [insertResult.rows[0].id]
        );

        const verifiedSearchResult = await client.query(
          'SELECT * FROM buscar_provedor_por_dominio($1)',
          [testCustomDomain]
        );

        if (verifiedSearchResult.rows.length > 0) {
          console.log(`   ✓ Domínio verificado encontrado corretamente`);
        } else {
          console.log(`   ✗ ERRO: Domínio verificado não foi encontrado`);
        }

        // Limpar teste
        await client.query(
          'DELETE FROM dominios_personalizados WHERE id = $1',
          [insertResult.rows[0].id]
        );
        console.log(`   ✓ Domínio de teste removido`);

      } catch (error) {
        console.log(`   ✗ Erro no teste: ${error.message}`);
      }
    }

    // 4. Testar logs de acesso
    console.log('\n4️⃣ Testando sistema de logs...');

    const existingDomain = await client.query(`
      SELECT * FROM dominios_personalizados WHERE verificado = true LIMIT 1
    `);

    if (existingDomain.rows.length > 0) {
      const domain = existingDomain.rows[0];

      // Inserir log de teste
      await client.query(`
        INSERT INTO acessos_dominio (
          dominio_id,
          provedor_id,
          ip_address,
          user_agent,
          path,
          metodo,
          status_code,
          tempo_resposta_ms
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        domain.id,
        domain.provedor_id,
        '192.168.1.100',
        'Test-Agent/1.0',
        '/test',
        'GET',
        200,
        150
      ]);

      console.log(`   ✓ Log de acesso criado para ${domain.dominio}`);

      // Verificar trigger de último acesso
      const updatedDomain = await client.query(
        'SELECT ultimo_acesso FROM dominios_personalizados WHERE id = $1',
        [domain.id]
      );

      if (updatedDomain.rows[0].ultimo_acesso) {
        console.log(`   ✓ Trigger de último acesso funcionando`);
      } else {
        console.log(`   ⚠️  Trigger de último acesso não atualizou`);
      }
    }

    // 5. Testar view de estatísticas
    console.log('\n5️⃣ Testando view de estatísticas...');

    const statsResult = await client.query('SELECT * FROM stats_dominios LIMIT 3');
    console.log(`   ✓ View stats_dominios retornou ${statsResult.rows.length} registros`);

    if (statsResult.rows.length > 0) {
      const sample = statsResult.rows[0];
      console.log(`   ✓ Exemplo: ${sample.dominio} - ${sample.total_acessos} acessos`);
    }

    // 6. Testar validações
    console.log('\n6️⃣ Testando validações...');

    // Testar domínio duplicado
    try {
      const duplicateDomain = await client.query(`
        SELECT dominio FROM dominios_personalizados LIMIT 1
      `);

      if (duplicateDomain.rows.length > 0) {
        const existingDomain = duplicateDomain.rows[0].dominio;

        try {
          await client.query(`
            INSERT INTO dominios_personalizados (provedor_id, dominio)
            VALUES (1, $1)
          `, [existingDomain]);

          console.log(`   ✗ ERRO: Domínio duplicado foi aceito`);
        } catch (error) {
          if (error.message.includes('duplicate') || error.code === '23505') {
            console.log(`   ✓ Constraint de domínio único funcionando`);
          } else {
            console.log(`   ⚠️  Erro inesperado: ${error.message}`);
          }
        }
      }
    } catch (error) {
      console.log(`   ⚠️  Erro no teste de duplicação: ${error.message}`);
    }

    // 7. Resumo final
    console.log('\n📊 Resumo do Sistema:');

    const summary = await client.query(`
      SELECT
        COUNT(*) as total_dominios,
        COUNT(CASE WHEN verificado = true THEN 1 END) as verificados,
        COUNT(CASE WHEN tipo = 'subdominio' THEN 1 END) as subdominios,
        COUNT(CASE WHEN tipo = 'personalizado' THEN 1 END) as personalizados
      FROM dominios_personalizados
      WHERE ativo = true
    `);

    const stats = summary.rows[0];
    console.log(`   📈 Total de domínios: ${stats.total_dominios}`);
    console.log(`   ✅ Verificados: ${stats.verificados}`);
    console.log(`   🏠 Subdomínios: ${stats.subdominios}`);
    console.log(`   🌐 Personalizados: ${stats.personalizados}`);

    // Logs de acesso
    const logsCount = await client.query('SELECT COUNT(*) as total FROM acessos_dominio');
    console.log(`   📝 Total de logs: ${logsCount.rows[0].total}`);

    console.log('\n🎉 Teste do sistema de domínios personalizados concluído!');
    console.log('\n📝 Próximos passos para usar em produção:');
    console.log('   1. Configurar DNS wildcard: *.parceirize.com');
    console.log('   2. Configurar certificados SSL');
    console.log('   3. Atualizar configurações do servidor web');
    console.log('   4. Configurar variáveis de ambiente');
    console.log('   5. Testar com domínios reais');

  } catch (error) {
    console.error('❌ Erro durante os testes:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  testCustomDomains().catch(console.error);
}

module.exports = { testCustomDomains };
#!/usr/bin/env node

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Delus9798-@localhost:5432/protege',
});

async function setupLocalDomains() {
  const client = await pool.connect();

  try {
    console.log('🏗️  Configurando domínios para teste local...\n');

    // 1. Buscar ou criar provedores de teste
    console.log('1️⃣ Configurando provedores de teste...');

    const provedores = [
      { nome: 'Empresa Teste 1', email: 'empresa1@teste.com', subdominio: 'empresa1' },
      { nome: 'Empresa Teste 2', email: 'empresa2@teste.com', subdominio: 'empresa2' },
      { nome: 'Clube de Desconto Local', email: 'clube@teste.com', subdominio: 'clube' }
    ];

    const provedorIds = [];

    for (const prov of provedores) {
      // Verificar se já existe
      const existing = await client.query(
        'SELECT id FROM provedores WHERE email = $1',
        [prov.email]
      );

      let provedorId;

      if (existing.rows.length > 0) {
        provedorId = existing.rows[0].id;
        console.log(`   ✓ Provedor existente: ${prov.nome} (ID: ${provedorId})`);
      } else {
        // Criar novo provedor
        const hashedPassword = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6hsrb2L2jy'; // senha: 123456

        const newProvider = await client.query(`
          INSERT INTO provedores (nome_empresa, email, senha, subdominio, ativo)
          VALUES ($1, $2, $3, $4, true)
          RETURNING id
        `, [prov.nome, prov.email, hashedPassword, prov.subdominio]);

        provedorId = newProvider.rows[0].id;
        console.log(`   ✓ Provedor criado: ${prov.nome} (ID: ${provedorId})`);
      }

      provedorIds.push({ id: provedorId, ...prov });
    }

    // 2. Configurar domínios localhost
    console.log('\n2️⃣ Configurando domínios localhost...');

    const dominiosLocais = [
      { provedor: provedorIds[0], dominio: 'empresa1.localhost', tipo: 'personalizado' },
      { provedor: provedorIds[0], dominio: 'empresa1.parceirize.com', tipo: 'subdominio' },
      { provedor: provedorIds[1], dominio: 'empresa2.localhost', tipo: 'personalizado' },
      { provedor: provedorIds[1], dominio: 'empresa2.parceirize.com', tipo: 'subdominio' },
      { provedor: provedorIds[2], dominio: 'clube.localhost', tipo: 'personalizado' },
      { provedor: provedorIds[2], dominio: 'clube.parceirize.com', tipo: 'subdominio' }
    ];

    for (const dom of dominiosLocais) {
      // Verificar se já existe
      const existing = await client.query(
        'SELECT id FROM dominios_personalizados WHERE dominio = $1',
        [dom.dominio]
      );

      if (existing.rows.length === 0) {
        // Gerar token
        const tokenResult = await client.query('SELECT gerar_token_verificacao() as token');
        const token = tokenResult.rows[0].token;

        // Inserir domínio
        await client.query(`
          INSERT INTO dominios_personalizados (
            provedor_id,
            dominio,
            tipo,
            verificado,
            verificacao_token,
            verificacao_metodo,
            ativo
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          dom.provedor.id,
          dom.dominio,
          dom.tipo,
          true, // Já verificado para testes
          token,
          'dns_txt',
          true
        ]);

        console.log(`   ✓ Domínio criado: ${dom.dominio} (${dom.provedor.nome})`);
      } else {
        console.log(`   ✓ Domínio existente: ${dom.dominio}`);
      }
    }

    // 3. Criar usuários de teste
    console.log('\n3️⃣ Criando usuários de teste...');

    // Clientes de teste
    for (let i = 0; i < provedorIds.length; i++) {
      const provedor = provedorIds[i];
      const hashedPassword = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6hsrb2L2jy'; // 123456

      // Cliente
      const existingClient = await client.query(
        'SELECT id FROM clientes WHERE email = $1',
        [`cliente${i + 1}@teste.com`]
      );

      if (existingClient.rows.length === 0) {
        // Buscar tenant_id do provedor
        const tenantResult = await client.query(
          'SELECT tenant_id FROM provedores WHERE id = $1',
          [provedor.id]
        );
        const tenantId = tenantResult.rows[0].tenant_id;

        await client.query(`
          INSERT INTO clientes (
            nome, sobrenome, email, cpf_cnpj, senha,
            tenant_id, ativo, id_carteirinha
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          `Cliente ${i + 1}`,
          'Teste',
          `cliente${i + 1}@teste.com`,
          `111${i}1111${i}${i}${i}`, // CPF fake
          hashedPassword,
          tenantId,
          true,
          `CART${String(i + 1).padStart(4, '0')}`
        ]);

        console.log(`   ✓ Cliente criado: cliente${i + 1}@teste.com (Provedor: ${provedor.nome})`);
      }

      // Parceiro
      const existingPartner = await client.query(
        'SELECT id FROM parceiros WHERE email = $1',
        [`parceiro${i + 1}@teste.com`]
      );

      if (existingPartner.rows.length === 0) {
        // Buscar tenant_id do provedor
        const tenantResult2 = await client.query(
          'SELECT tenant_id FROM provedores WHERE id = $1',
          [provedor.id]
        );
        const tenantId2 = tenantResult2.rows[0].tenant_id;

        await client.query(`
          INSERT INTO parceiros (
            nome_empresa, email, senha, tenant_id, ativo
          ) VALUES ($1, $2, $3, $4, $5)
        `, [
          `Parceiro ${i + 1} Ltda`,
          `parceiro${i + 1}@teste.com`,
          hashedPassword,
          tenantId2,
          true
        ]);

        console.log(`   ✓ Parceiro criado: parceiro${i + 1}@teste.com (Provedor: ${provedor.nome})`);
      }
    }

    // 4. Logs de acesso de exemplo
    console.log('\n4️⃣ Criando logs de acesso de exemplo...');

    const logsExample = await client.query(`
      SELECT dp.id as dominio_id, dp.provedor_id, dp.dominio
      FROM dominios_personalizados dp
      WHERE dp.ativo = true
      LIMIT 3
    `);

    for (const log of logsExample.rows) {
      // Inserir alguns logs de exemplo
      const paths = ['/carteirinha', '/painel', '/auth/login', '/'];

      for (let j = 0; j < 5; j++) {
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
          log.dominio_id,
          log.provedor_id,
          `192.168.1.${100 + j}`,
          'Mozilla/5.0 (Test Browser)',
          paths[j % paths.length],
          'GET',
          200,
          Math.floor(Math.random() * 300) + 50
        ]);
      }

      console.log(`   ✓ Logs criados para: ${log.dominio}`);
    }

    // 5. Instruções finais
    console.log('\n🎉 Configuração de teste concluída!\n');

    console.log('📝 Próximos passos:\n');

    console.log('1️⃣ Adicionar ao arquivo hosts (como administrador):');
    console.log('   Windows: C:\\Windows\\System32\\drivers\\etc\\hosts');
    console.log('   Linux/Mac: /etc/hosts\n');

    console.log('   Adicione estas linhas:');
    console.log('   127.0.0.1 empresa1.localhost');
    console.log('   127.0.0.1 empresa2.localhost');
    console.log('   127.0.0.1 clube.localhost\n');

    console.log('2️⃣ Iniciar o servidor de desenvolvimento:');
    console.log('   npm run dev (ou bun dev)\n');

    console.log('3️⃣ Testar os domínios:\n');

    console.log('🌐 URLs para testar:');
    provedorIds.forEach((prov, i) => {
      console.log(`\n   ${prov.nome}:`);
      console.log(`   http://empresa${i + 1}.localhost:3000/auth/login`);
      console.log(`   http://empresa${i + 1}.localhost:3000/carteirinha`);
      console.log(`   http://empresa${i + 1}.localhost:3000/painel`);
      console.log(`   http://empresa${i + 1}.localhost:3000/dashboard`);
    });

    console.log('\n👤 Credenciais para teste:');
    console.log('   Provedores: empresa1@teste.com / 123456');
    console.log('   Clientes: cliente1@teste.com / 123456');
    console.log('   Parceiros: parceiro1@teste.com / 123456\n');

    console.log('🔧 Gestão de domínios:');
    console.log('   http://localhost:3000/admin-configuracoes/dominios\n');

    console.log('⚠️  IMPORTANTE:');
    console.log('   - Use sempre a porta :3000 nos domínios localhost');
    console.log('   - Limpe cookies se tiver problemas de sessão');
    console.log('   - Verifique o console do navegador para logs');

  } catch (error) {
    console.error('❌ Erro na configuração:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  setupLocalDomains().catch(console.error);
}

module.exports = { setupLocalDomains };
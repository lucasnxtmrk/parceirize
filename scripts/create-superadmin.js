const { Pool } = require('pg');

// Configuração do banco
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Delus9798-@localhost:5432/protege',
});

async function createSuperAdmin() {
  let client;
  
  try {
    client = await pool.connect();
    console.log('🔗 Conectado ao PostgreSQL. Criando SuperAdmin...');

    // Hash da senha gerada pelo gerar_hash.js
    const senhaHash = '$2b$10$W8Wr1PDzSsWneEkkqMDSluT7stOXcZ6GeZzq.Eln9G3a03CvfvSdG';
    const nome = 'NEXTMARK Admin';
    const email = 'admin@nextmark.com.br';

    // Verificar se já existe
    const existsCheck = await client.query(
      'SELECT id FROM superadmins WHERE email = $1',
      [email]
    );

    if (existsCheck.rows.length > 0) {
      console.log('⚠️ SuperAdmin já existe com este email.');
      const superadmin = existsCheck.rows[0];
      console.log(`✅ ID do SuperAdmin: ${superadmin.id}`);
      return superadmin;
    }

    // Inserir SuperAdmin
    const result = await client.query(
      `INSERT INTO superadmins (nome, email, senha, ativo, created_at) 
       VALUES ($1, $2, $3, true, NOW()) 
       RETURNING id, nome, email, created_at`,
      [nome, email, senhaHash]
    );

    const superadmin = result.rows[0];
    
    console.log('✅ SuperAdmin criado com sucesso!');
    console.log(`📧 Email: ${superadmin.email}`);
    console.log(`🔑 Senha: 123456 (padrão do gerar_hash.js)`);
    console.log(`🆔 ID: ${superadmin.id}`);
    console.log(`📅 Criado em: ${superadmin.created_at}`);
    
    // Verificar tabela de provedores (migração de admins)
    const provedores = await client.query(
      `SELECT p.id, p.nome_empresa, p.email, pl.nome as plano_nome, p.ativo
       FROM provedores p 
       LEFT JOIN planos pl ON p.plano_id = pl.id
       ORDER BY p.created_at DESC`
    );

    console.log('\n📋 Provedores migrados dos admins antigos:');
    if (provedores.rows.length === 0) {
      console.log('  ⚠️ Nenhum provedor encontrado. Verifique se existiam admins na tabela "admins".');
    } else {
      provedores.rows.forEach(p => {
        console.log(`  ✅ ${p.nome_empresa} (${p.email}) - ${p.plano_nome} - ${p.ativo ? 'Ativo' : 'Inativo'}`);
      });
    }

    return superadmin;
    
  } catch (error) {
    console.error('❌ Erro ao criar SuperAdmin:', error.message);
    throw error;
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

// Executar criação
createSuperAdmin()
  .then(() => {
    console.log('\n🎉 SuperAdmin configurado com sucesso!');
    console.log('🔗 Agora você pode fazer login em: /auth/login');
    console.log('📧 Email: admin@nextmark.com.br');
    console.log('🔑 Senha: 123456');
    console.log('🎯 Será redirecionado para: /superadmin/dashboard');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Falha ao criar SuperAdmin:', error);
    process.exit(1);
  });
#!/usr/bin/env node

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Delus9798-@localhost:5432/protege',
});

async function fixPasswords() {
  const client = await pool.connect();

  try {
    console.log('🔐 Gerando hash correto para senha 123456...');

    // Gerar hash correto
    const correctHash = bcrypt.hashSync('123456', 12);
    console.log('Hash gerado:', correctHash);
    console.log('Tamanho:', correctHash.length);

    // Testar se o hash funciona
    const isValid = bcrypt.compareSync('123456', correctHash);
    console.log('Hash válido:', isValid);

    if (!isValid) {
      throw new Error('Hash gerado é inválido!');
    }

    console.log('\n🔄 Atualizando senhas...');

    // Atualizar clientes
    const clientesResult = await client.query('UPDATE clientes SET senha = $1', [correctHash]);
    console.log(`✅ ${clientesResult.rowCount} clientes atualizados`);

    // Atualizar parceiros
    const parceirosResult = await client.query('UPDATE parceiros SET senha = $1', [correctHash]);
    console.log(`✅ ${parceirosResult.rowCount} parceiros atualizados`);

    // Atualizar provedores
    const provedoresResult = await client.query('UPDATE provedores SET senha = $1', [correctHash]);
    console.log(`✅ ${provedoresResult.rowCount} provedores atualizados`);

    // Atualizar admins
    const adminsResult = await client.query('UPDATE admins SET senha = $1', [correctHash]);
    console.log(`✅ ${adminsResult.rowCount} admins atualizados`);

    // Atualizar superadmins
    const superadminsResult = await client.query('UPDATE superadmins SET senha = $1', [correctHash]);
    console.log(`✅ ${superadminsResult.rowCount} superadmins atualizados`);

    console.log('\n🧪 Verificando se foi salvo corretamente...');

    // Verificar um cliente
    const checkClient = await client.query(`
      SELECT senha, LENGTH(senha) as tamanho
      FROM clientes
      WHERE cpf_cnpj = '105.630.394-85'
      AND tenant_id = '2da2a5f3-fea6-4112-9203-0f4b38097d77'
    `);

    if (checkClient.rows.length > 0) {
      const savedHash = checkClient.rows[0].senha;
      const savedLength = checkClient.rows[0].tamanho;
      console.log(`Hash salvo (${savedLength} chars):`, savedHash);

      // Testar se o hash salvo funciona
      const savedIsValid = bcrypt.compareSync('123456', savedHash);
      console.log('Hash salvo é válido:', savedIsValid);

      if (savedIsValid) {
        console.log('\n🎉 SUCESSO! Todas as senhas foram corrigidas!');
        console.log('\n📋 Credenciais para teste (senha: 123456):');
        console.log('👤 Cliente: CPF 105.630.394-85 em teste.localhost:3000/auth/login');
        console.log('🏢 Provedor: teste@multitenant.com em teste.localhost:3000/admin/login');
        console.log('👑 Superadmin: admin@nextmark.com.br em admin.localhost:3000/auth/login');
      } else {
        console.log('❌ ERRO: Hash não foi salvo corretamente!');
      }
    }

  } catch (error) {
    console.error('❌ Erro ao corrigir senhas:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

fixPasswords();
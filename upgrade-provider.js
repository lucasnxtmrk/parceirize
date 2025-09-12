const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  try {
    console.log('🔧 Alterando Empresa Principal para plano Enterprise...');
    
    const result = await pool.query(`
      UPDATE provedores 
      SET plano_id = 3 
      WHERE id = 1
      RETURNING nome_empresa, plano_id
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Sucesso! Empresa Principal agora tem plano Enterprise');
      console.log(`🏢 Empresa: ${result.rows[0].nome_empresa}`);
      console.log(`📋 Novo Plano ID: ${result.rows[0].plano_id} (Enterprise)`);
      
      // Verificar se funcionou
      const verify = await pool.query(`
        SELECT p.nome_empresa, pl.nome as plano_nome
        FROM provedores p
        LEFT JOIN planos pl ON p.plano_id = pl.id
        WHERE p.id = 1
      `);
      
      console.log(`✨ Confirmação - Plano atual: ${verify.rows[0].plano_nome}`);
    } else {
      console.log('❌ Erro na atualização');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await pool.end();
  }
})();
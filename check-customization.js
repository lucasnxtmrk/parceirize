const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  try {
    console.log('🔍 Verificando provedores e suas customizações:\n');
    
    const result = await pool.query(`
      SELECT 
        p.id, 
        p.nome_empresa, 
        p.tenant_id, 
        p.plano_id,
        pl.nome as plano_nome,
        p.cor_primaria, 
        p.cor_secundaria, 
        p.logo_url
      FROM provedores p
      LEFT JOIN planos pl ON p.plano_id = pl.id
      ORDER BY p.id
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ Nenhum provedor encontrado');
      return;
    }
    
    result.rows.forEach(row => {
      console.log('─'.repeat(50));
      console.log(`📊 ID: ${row.id} | 🏢 Empresa: ${row.nome_empresa}`);
      console.log(`📋 Plano: ${row.plano_nome} (ID: ${row.plano_id})`);
      console.log(`🆔 Tenant ID: ${row.tenant_id}`);
      console.log(`🎨 Cor Primária: ${row.cor_primaria || 'Não definida'}`);
      console.log(`🎨 Cor Secundária: ${row.cor_secundaria || 'Não definida'}`);
      console.log(`🖼️ Logo: ${row.logo_url || 'Não definido'}`);
      console.log(`✨ Customização habilitada: ${row.plano_id === 3 ? '✅ SIM (Enterprise)' : '❌ NÃO (Plano insuficiente)'}`);
      console.log();
    });
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await pool.end();
  }
})();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function testCustomizationFields() {
  try {
    console.log('🔍 Verificando campos de customização na tabela provedores...');

    // Verificar se as colunas existem
    const columnsQuery = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'provedores' 
      AND column_name IN ('logo_url', 'cor_primaria', 'cor_secundaria', 'cor_fundo_menu', 'cor_texto_menu', 'cor_hover_menu')
      ORDER BY column_name;
    `;

    const result = await pool.query(columnsQuery);
    
    console.log('📊 Colunas encontradas:');
    result.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type}) - Default: ${col.column_default || 'NULL'}`);
    });

    // Verificar se existem registros na tabela
    const countQuery = 'SELECT COUNT(*) as total FROM provedores';
    const countResult = await pool.query(countQuery);
    console.log(`\n📈 Total de provedores: ${countResult.rows[0].total}`);

    if (result.rows.length < 6) {
      console.log('\n⚠️  Algumas colunas estão faltando. Adicionando...');
      
      const missingColumns = [
        'cor_fundo_menu TEXT DEFAULT \'#f8f9fa\'',
        'cor_texto_menu TEXT DEFAULT \'#495057\'',
        'cor_hover_menu TEXT'
      ];

      for (const column of missingColumns) {
        try {
          const addColumnQuery = `ALTER TABLE provedores ADD COLUMN IF NOT EXISTS ${column}`;
          await pool.query(addColumnQuery);
          console.log(`   ✅ Adicionado: ${column.split(' ')[0]}`);
        } catch (err) {
          console.log(`   ⚠️  ${column.split(' ')[0]}: ${err.message}`);
        }
      }
    } else {
      console.log('\n✅ Todas as colunas necessárias estão presentes!');
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

testCustomizationFields();
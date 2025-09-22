const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:Delus9798-@localhost:5432/protege';
  const pool = new Pool({ connectionString });

  try {
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'add-origem-sgp-column.sql'),
      'utf8'
    );

    console.log('🔄 Adicionando colunas SGP na tabela clientes...');

    await pool.query(migrationSQL);

    // Verificar se a migração foi bem-sucedida
    const result = await pool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'clientes' AND column_name IN ('origem_sgp', 'cpf_cnpj', 'sgp_id', 'sgp_dados')
      ORDER BY column_name
    `);

    if (result.rows.length >= 4) {
      console.log('✅ Migração concluída com sucesso!');
      console.log('✅ Colunas SGP adicionadas:');
      result.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type}`);
      });
    } else {
      console.log('❌ Erro: nem todas as colunas foram criadas');
    }

  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('✅ Colunas SGP já existem!');
    } else {
      console.error('❌ Erro na migração:', error.message);
      process.exit(1);
    }
  } finally {
    await pool.end();
  }
}

runMigration();
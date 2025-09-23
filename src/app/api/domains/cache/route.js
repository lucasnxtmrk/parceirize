import { Pool } from 'pg';
import { NextResponse } from 'next/server';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET() {
  try {
    console.log('🔄 Atualizando cache de domínios...');

    const result = await pool.query(`
      SELECT
        dp.dominio,
        dp.provedor_id,
        dp.tipo,
        dp.verificado,
        dp.ativo,
        p.nome_empresa,
        p.tenant_id
      FROM dominios_personalizados dp
      INNER JOIN provedores p ON p.id = dp.provedor_id
      WHERE dp.ativo = true
      ORDER BY dp.dominio
    `);

    const domains = result.rows;
    const timestamp = Date.now();

    console.log(`✅ Cache atualizado: ${domains.length} domínios carregados`);

    return NextResponse.json({
      domains,
      timestamp,
      count: domains.length
    });
  } catch (error) {
    console.error('❌ Erro ao buscar domínios para cache:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    console.log('🗑️ Limpando cache de domínios...');

    // Esta rota é chamada quando há mudanças nos domínios
    // para forçar o middleware a recarregar o cache
    return NextResponse.json({
      message: 'Cache limpo com sucesso',
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('❌ Erro ao limpar cache:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
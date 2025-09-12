import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { options } from '../../../auth/[...nextauth]/options';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET() {
  try {
    const session = await getServerSession(options);
    
    if (!session || session.user.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas superadmins podem acessar.' },
        { status: 403 }
      );
    }

    // Query para buscar resumo geral
    const resumoQuery = `
      SELECT 
        (SELECT COUNT(*) FROM provedores WHERE ativo = true) as total_provedores,
        (SELECT COUNT(*) FROM clientes WHERE ativo = true) as total_clientes,
        (SELECT COUNT(*) FROM vouchers) as total_vouchers,
        (SELECT COALESCE(SUM(pl.preco), 0) 
         FROM provedores p 
         JOIN planos pl ON p.plano_id = pl.id 
         WHERE p.ativo = true 
         AND (p.data_vencimento IS NULL OR p.data_vencimento > CURRENT_DATE)
        ) as receita_mensal
    `;

    const result = await pool.query(resumoQuery);
    const resumo = result.rows[0];

    return NextResponse.json({
      totalProvedores: parseInt(resumo.total_provedores) || 0,
      totalClientes: parseInt(resumo.total_clientes) || 0,
      totalVouchers: parseInt(resumo.total_vouchers) || 0,
      receitaMensal: parseFloat(resumo.receita_mensal) || 0
    });

  } catch (error) {
    console.error('Erro ao buscar resumo:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
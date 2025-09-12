import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { options } from '../../auth/[...nextauth]/options';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET() {
  try {
    // Verificar autenticação de superadmin
    const session = await getServerSession(options);
    
    if (!session || session.user.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas superadmins podem acessar.' },
        { status: 403 }
      );
    }

    // Queries para buscar estatísticas completas
    const statsQuery = `
      SELECT 
        -- Contadores de provedores
        COUNT(*) as total_provedores,
        COUNT(*) FILTER (WHERE p.ativo = true) as provedores_ativos,
        
        -- Receitas (calculadas com base nos planos)
        SUM(pl.preco) FILTER (WHERE p.ativo = true) as receita_mensal,
        SUM(pl.preco * 12) FILTER (WHERE p.ativo = true) as receita_anual
      FROM provedores p
      LEFT JOIN planos pl ON p.plano_id = pl.id
    `;

    // Query para contar clientes globalmente
    const clientesQuery = `
      SELECT COUNT(*) as total_clientes
      FROM clientes 
      WHERE ativo = true
    `;

    // Query para contar parceiros globalmente
    const parceirosQuery = `
      SELECT COUNT(*) as total_parceiros
      FROM parceiros 
      WHERE ativo = true
    `;

    // Query para contar vouchers
    const vouchersQuery = `
      SELECT 
        COUNT(DISTINCT v.id) as total_vouchers,
        COUNT(DISTINCT vu.voucher_id) as vouchers_utilizados
      FROM vouchers v
      LEFT JOIN voucher_utilizados vu ON v.id = vu.voucher_id
    `;

    // Executar todas as queries em paralelo
    const [statsResult, clientesResult, parceirosResult, vouchersResult] = await Promise.all([
      pool.query(statsQuery),
      pool.query(clientesQuery),
      pool.query(parceirosQuery),
      pool.query(vouchersQuery)
    ]);

    const stats = statsResult.rows[0];
    const clientes = clientesResult.rows[0];
    const parceiros = parceirosResult.rows[0];
    const vouchers = vouchersResult.rows[0];

    // Converter strings para números
    const response = {
      totalProvedores: parseInt(stats.total_provedores) || 0,
      provedoresAtivos: parseInt(stats.provedores_ativos) || 0,
      receitaMensal: parseFloat(stats.receita_mensal) || 0,
      receitaAnual: parseFloat(stats.receita_anual) || 0,
      totalClientes: parseInt(clientes.total_clientes) || 0,
      totalParceiros: parseInt(parceiros.total_parceiros) || 0,
      totalVouchers: parseInt(vouchers.total_vouchers) || 0,
      vouchersUtilizados: parseInt(vouchers.vouchers_utilizados) || 0
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Erro ao buscar estatísticas do dashboard:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
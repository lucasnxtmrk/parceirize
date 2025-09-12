import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { options } from '../../auth/[...nextauth]/options';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(request) {
  try {
    const session = await getServerSession(options);
    
    if (!session || session.user.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas superadmins podem acessar.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 25;
    const search = searchParams.get('search') || '';
    const plano = searchParams.get('plano') || '';
    const status = searchParams.get('status') || '';
    const vencimento = searchParams.get('vencimento') || '';

    // Construir WHERE clauses
    const whereConditions = ['1=1'];
    const queryParams = [];
    let paramIndex = 1;

    // Filtro de busca (nome da empresa, email)
    if (search) {
      whereConditions.push(`(
        p.nome_empresa ILIKE $${paramIndex} OR 
        p.email ILIKE $${paramIndex}
      )`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    // Filtro por plano
    if (plano) {
      whereConditions.push(`p.plano_id = $${paramIndex}`);
      queryParams.push(plano);
      paramIndex++;
    }

    // Filtro por status
    if (status === 'ativo') {
      whereConditions.push(`p.ativo = true`);
    } else if (status === 'inativo') {
      whereConditions.push(`p.ativo = false`);
    }

    // Filtro por vencimento
    if (vencimento === 'vencido') {
      whereConditions.push(`p.data_vencimento < CURRENT_DATE`);
    } else if (vencimento === 'proximo') {
      whereConditions.push(`p.data_vencimento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'`);
    } else if (vencimento === 'vigente') {
      whereConditions.push(`(p.data_vencimento IS NULL OR p.data_vencimento > CURRENT_DATE + INTERVAL '30 days')`);
    }

    const whereClause = whereConditions.join(' AND ');

    // Query principal para buscar provedores com detalhes completos
    const provedoresQuery = `
      SELECT 
        p.*,
        pl.nome as plano_nome,
        pl.preco as plano_preco,
        pl.limite_clientes as plano_limite_clientes,
        pl.limite_parceiros as plano_limite_parceiros,
        pl.limite_vouchers as plano_limite_vouchers,
        COALESCE(c_stats.total_clientes, 0) as total_clientes,
        COALESCE(par_stats.total_parceiros, 0) as total_parceiros,
        COALESCE(v_stats.total_vouchers, 0) as total_vouchers,
        COALESCE(v_stats.vouchers_utilizados, 0) as vouchers_utilizados,
        pl.preco as receita_mensal
      FROM provedores p
      LEFT JOIN planos pl ON p.plano_id = pl.id
      LEFT JOIN (
        SELECT 
          tenant_id,
          COUNT(*) as total_clientes
        FROM clientes 
        WHERE ativo = true
        GROUP BY tenant_id
      ) c_stats ON p.tenant_id = c_stats.tenant_id
      LEFT JOIN (
        SELECT 
          tenant_id,
          COUNT(*) as total_parceiros
        FROM parceiros 
        WHERE ativo = true
        GROUP BY tenant_id
      ) par_stats ON p.tenant_id = par_stats.tenant_id
      LEFT JOIN (
        SELECT 
          par.tenant_id,
          COUNT(v.id) as total_vouchers,
          COUNT(v.id) FILTER (WHERE v.utilizado = true) as vouchers_utilizados
        FROM vouchers v
        JOIN parceiros par ON v.parceiro_id = par.id
        GROUP BY par.tenant_id
      ) v_stats ON p.tenant_id = v_stats.tenant_id
      WHERE ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    // Query para contar total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM provedores p
      LEFT JOIN planos pl ON p.plano_id = pl.id
      WHERE ${whereClause}
    `;

    // Query para estatísticas
    const statsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE p.ativo = true) as ativos,
        COUNT(*) FILTER (WHERE p.ativo = false) as inativos,
        COUNT(*) FILTER (WHERE p.data_vencimento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days') as vencimento_proximo
      FROM provedores p
      LEFT JOIN planos pl ON p.plano_id = pl.id
      WHERE ${whereClause}
    `;

    const offset = (page - 1) * limit;
    const provedoresParams = [...queryParams, limit, offset];
    const countParams = queryParams;
    const statsParams = queryParams;

    // Executar queries em paralelo
    const [provedoresResult, countResult, statsResult] = await Promise.all([
      pool.query(provedoresQuery, provedoresParams),
      pool.query(countQuery, countParams),
      pool.query(statsQuery, statsParams)
    ]);

    const provedores = provedoresResult.rows;
    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);
    const stats = {
      total: parseInt(statsResult.rows[0].total),
      ativos: parseInt(statsResult.rows[0].ativos),
      inativos: parseInt(statsResult.rows[0].inativos),
      vencimento_proximo: parseInt(statsResult.rows[0].vencimento_proximo)
    };

    return NextResponse.json({
      provedores,
      total,
      totalPages,
      currentPage: page,
      stats
    });

  } catch (error) {
    console.error('Erro ao buscar detalhes dos provedores:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
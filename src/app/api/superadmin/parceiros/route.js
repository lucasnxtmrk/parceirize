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
    const limit = parseInt(searchParams.get('limit')) || 50;
    const search = searchParams.get('search') || '';
    const provedor = searchParams.get('provedor') || '';
    const status = searchParams.get('status') || '';
    const nicho = searchParams.get('nicho') || '';
    const aprovacao = searchParams.get('aprovacao') || '';

    // Construir WHERE clauses
    const whereConditions = ['1=1'];
    const queryParams = [];
    let paramIndex = 1;

    // Filtro de busca (nome fantasia, email)
    if (search) {
      whereConditions.push(`(
        par.nome_fantasia ILIKE $${paramIndex} OR 
        par.email ILIKE $${paramIndex}
      )`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    // Filtro por provedor
    if (provedor) {
      whereConditions.push(`par.provedor_id = $${paramIndex}`);
      queryParams.push(provedor);
      paramIndex++;
    }

    // Filtro por status
    if (status === 'ativo') {
      whereConditions.push(`par.ativo = true`);
    } else if (status === 'inativo') {
      whereConditions.push(`par.ativo = false`);
    }

    // Filtro por nicho
    if (nicho) {
      whereConditions.push(`par.nicho_id = $${paramIndex}`);
      queryParams.push(nicho);
      paramIndex++;
    }

    // Filtro por aprovação
    if (aprovacao === 'aprovado') {
      whereConditions.push(`par.aprovado = true`);
    } else if (aprovacao === 'pendente') {
      whereConditions.push(`par.aprovado = false`);
    }

    const whereClause = whereConditions.join(' AND ');

    // Query principal para buscar parceiros
    const parceirosQuery = `
      SELECT 
        par.*,
        p.nome_empresa as provedor_nome,
        pl.nome as provedor_plano,
        n.nome as nicho_nome,
        COALESCE(v_stats.total_vouchers, 0) as total_vouchers,
        COALESCE(v_stats.vouchers_utilizados, 0) as vouchers_utilizados
      FROM parceiros par
      LEFT JOIN provedores p ON par.provedor_id = p.id
      LEFT JOIN planos pl ON p.plano_id = pl.id
      LEFT JOIN nichos n ON par.nicho_id = n.id
      LEFT JOIN (
        SELECT 
          parceiro_id,
          COUNT(*) as total_vouchers,
          COUNT(*) FILTER (WHERE utilizado = true) as vouchers_utilizados
        FROM vouchers
        GROUP BY parceiro_id
      ) v_stats ON par.id = v_stats.parceiro_id
      WHERE ${whereClause}
      ORDER BY par.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    // Query para contar total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM parceiros par
      LEFT JOIN provedores p ON par.provedor_id = p.id
      LEFT JOIN planos pl ON p.plano_id = pl.id
      LEFT JOIN nichos n ON par.nicho_id = n.id
      WHERE ${whereClause}
    `;

    // Query para estatísticas
    const statsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE par.ativo = true) as ativos,
        COUNT(*) FILTER (WHERE par.ativo = false) as inativos,
        COUNT(*) FILTER (WHERE par.aprovado = true) as aprovados
      FROM parceiros par
      LEFT JOIN provedores p ON par.provedor_id = p.id
      LEFT JOIN planos pl ON p.plano_id = pl.id
      LEFT JOIN nichos n ON par.nicho_id = n.id
      WHERE ${whereClause}
    `;

    const offset = (page - 1) * limit;
    const parceirosParams = [...queryParams, limit, offset];
    const countParams = queryParams;
    const statsParams = queryParams;

    // Executar queries em paralelo
    const [parceirosResult, countResult, statsResult] = await Promise.all([
      pool.query(parceirosQuery, parceirosParams),
      pool.query(countQuery, countParams),
      pool.query(statsQuery, statsParams)
    ]);

    const parceiros = parceirosResult.rows;
    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);
    const stats = {
      total: parseInt(statsResult.rows[0].total),
      ativos: parseInt(statsResult.rows[0].ativos),
      inativos: parseInt(statsResult.rows[0].inativos),
      aprovados: parseInt(statsResult.rows[0].aprovados)
    };

    return NextResponse.json({
      parceiros,
      total,
      totalPages,
      currentPage: page,
      stats
    });

  } catch (error) {
    console.error('Erro ao buscar parceiros:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
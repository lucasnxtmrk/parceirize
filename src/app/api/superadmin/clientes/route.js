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
    const plano = searchParams.get('plano') || '';

    // Construir WHERE clauses
    const whereConditions = ['1=1'];
    const queryParams = [];
    let paramIndex = 1;

    // Filtro de busca (nome, email, CPF)
    if (search) {
      whereConditions.push(`(
        c.nome ILIKE $${paramIndex} OR 
        c.email ILIKE $${paramIndex} OR 
        c.cpf ILIKE $${paramIndex}
      )`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    // Filtro por provedor
    if (provedor) {
      whereConditions.push(`p.id = $${paramIndex}`);
      queryParams.push(provedor);
      paramIndex++;
    }

    // Filtro por status
    if (status === 'ativo') {
      whereConditions.push(`c.ativo = true`);
    } else if (status === 'inativo') {
      whereConditions.push(`c.ativo = false`);
    }

    // Filtro por plano do provedor
    if (plano) {
      whereConditions.push(`pl.nome ILIKE $${paramIndex}`);
      queryParams.push(`%${plano}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    // Query principal para buscar clientes
    const clientesQuery = `
      SELECT 
        c.*,
        c.data_criacao as created_at,
        p.nome_empresa as provedor_nome,
        pl.nome as provedor_plano,
        'Padrão' as plano_nome
      FROM clientes c
      LEFT JOIN provedores p ON c.tenant_id = p.tenant_id
      LEFT JOIN planos pl ON p.plano_id = pl.id
      WHERE ${whereClause}
      ORDER BY c.data_criacao DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    // Query para contar total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM clientes c
      LEFT JOIN provedores p ON c.tenant_id = p.tenant_id
      LEFT JOIN planos pl ON p.plano_id = pl.id
      WHERE ${whereClause}
    `;

    // Query para estatísticas
    const statsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE c.ativo = true) as ativos,
        COUNT(*) FILTER (WHERE c.ativo = false) as inativos,
        COUNT(*) FILTER (WHERE c.data_criacao >= DATE_TRUNC('month', CURRENT_DATE)) as novos_mes
      FROM clientes c
      LEFT JOIN provedores p ON c.tenant_id = p.tenant_id
      LEFT JOIN planos pl ON p.plano_id = pl.id
      WHERE ${whereClause}
    `;

    const offset = (page - 1) * limit;
    const clientesParams = [...queryParams, limit, offset];
    const countParams = queryParams;
    const statsParams = queryParams;

    // Executar queries em paralelo
    const [clientesResult, countResult, statsResult] = await Promise.all([
      pool.query(clientesQuery, clientesParams),
      pool.query(countQuery, countParams),
      pool.query(statsQuery, statsParams)
    ]);

    const clientes = clientesResult.rows;
    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);
    const stats = {
      total: parseInt(statsResult.rows[0].total),
      ativos: parseInt(statsResult.rows[0].ativos),
      inativos: parseInt(statsResult.rows[0].inativos),
      novos_mes: parseInt(statsResult.rows[0].novos_mes)
    };

    return NextResponse.json({
      clientes,
      total,
      totalPages,
      currentPage: page,
      stats
    });

  } catch (error) {
    console.error('Erro ao buscar clientes:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
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
    const search = searchParams.get('search') || '';
    const status_pagamento = searchParams.get('status_pagamento') || '';
    const plano = searchParams.get('plano') || '';

    // Construir WHERE clauses
    const whereConditions = ['1=1'];
    const queryParams = [];
    let paramIndex = 1;

    // Filtro de busca
    if (search) {
      whereConditions.push(`(
        p.nome_empresa ILIKE $${paramIndex} OR
        p.email ILIKE $${paramIndex}
      )`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    // Filtro por status de pagamento
    if (status_pagamento === 'vencido') {
      whereConditions.push(`p.data_vencimento < CURRENT_DATE`);
    } else if (status_pagamento === 'pago') {
      whereConditions.push(`(p.data_vencimento IS NULL OR p.data_vencimento >= CURRENT_DATE)`);
    } else if (status_pagamento === 'pendente') {
      whereConditions.push(`p.data_vencimento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'`);
    }

    // Filtro por plano
    if (plano) {
      whereConditions.push(`p.plano_id = $${paramIndex}`);
      queryParams.push(plano);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    // Query principal para buscar provedores com dados financeiros
    const provedoresQuery = `
      SELECT
        p.*,
        pl.nome as plano_nome,
        pl.preco as plano_preco,

        -- Determinar status de pagamento baseado na data de vencimento
        CASE
          WHEN p.data_vencimento IS NULL THEN 'sem_vencimento'
          WHEN p.data_vencimento < CURRENT_DATE THEN 'vencido'
          WHEN p.data_vencimento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days' THEN 'pendente'
          ELSE 'pago'
        END as status_pagamento,

        -- Dados do último pagamento (simulado - você pode criar uma tabela de pagamentos)
        -- Por enquanto, vamos usar a data de criação como referência
        p.created_at as ultimo_pagamento,
        pl.preco as valor_ultimo_pagamento

      FROM provedores p
      LEFT JOIN planos pl ON p.plano_id = pl.id
      WHERE ${whereClause}
      ORDER BY
        CASE
          WHEN p.data_vencimento IS NULL THEN 3
          WHEN p.data_vencimento < CURRENT_DATE THEN 0
          WHEN p.data_vencimento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days' THEN 1
          ELSE 2
        END,
        p.data_vencimento ASC NULLS LAST
    `;

    // Query para estatísticas financeiras
    const statsQuery = `
      SELECT
        -- Receita total estimada (baseada nos planos ativos)
        SUM(pl.preco) FILTER (WHERE p.ativo = true) as receita_mensal,
        SUM(pl.preco * 12) FILTER (WHERE p.ativo = true) as receita_total,

        -- Contagem de provedores por status
        COUNT(*) FILTER (WHERE p.ativo = true AND (p.data_vencimento IS NULL OR p.data_vencimento >= CURRENT_DATE)) as provedores_pagos,
        COUNT(*) FILTER (WHERE p.data_vencimento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days') as provedores_pendentes,
        COUNT(*) FILTER (WHERE p.data_vencimento < CURRENT_DATE) as provedores_vencidos

      FROM provedores p
      LEFT JOIN planos pl ON p.plano_id = pl.id
      WHERE ${whereClause}
    `;

    // Executar queries em paralelo
    const [provedoresResult, statsResult] = await Promise.all([
      pool.query(provedoresQuery, queryParams),
      pool.query(statsQuery, queryParams)
    ]);

    const provedores = provedoresResult.rows;
    const stats = statsResult.rows[0];

    return NextResponse.json({
      provedores,
      stats: {
        receita_total: parseFloat(stats.receita_total || 0),
        receita_mensal: parseFloat(stats.receita_mensal || 0),
        provedores_pagos: parseInt(stats.provedores_pagos || 0),
        provedores_pendentes: parseInt(stats.provedores_pendentes || 0),
        provedores_vencidos: parseInt(stats.provedores_vencidos || 0)
      }
    });

  } catch (error) {
    console.error('Erro ao buscar dados financeiros:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
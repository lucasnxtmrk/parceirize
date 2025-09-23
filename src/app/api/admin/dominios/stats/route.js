import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * GET /api/admin/dominios/stats
 * Estatísticas de uso dos domínios
 */
export async function GET(request) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

    if (!token || !['provedor', 'superadmin'].includes(token.user.role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const periodo = searchParams.get('periodo') || '30'; // dias
    const dominio_id = searchParams.get('dominio_id');

    // Para superadmin, pode ver todos os domínios ou de um provedor específico
    const provedorId = token.user.role === 'superadmin'
      ? searchParams.get('provider_id')
      : token.user.id;

    // Construir query base
    let whereConditions = ['dp.ativo = true'];
    let params = [];
    let paramIndex = 1;

    // Filtro por provedor
    if (provedorId) {
      whereConditions.push(`dp.provedor_id = $${paramIndex++}`);
      params.push(provedorId);
    }

    // Filtro por domínio específico
    if (dominio_id) {
      whereConditions.push(`dp.id = $${paramIndex++}`);
      params.push(dominio_id);
    }

    // Filtro por período
    whereConditions.push(`ad.criado_em >= NOW() - INTERVAL '${parseInt(periodo)} days'`);

    const whereClause = whereConditions.join(' AND ');

    // Query principal de estatísticas
    const statsQuery = `
      SELECT
        dp.id,
        dp.dominio,
        dp.tipo,
        dp.verificado,
        dp.criado_em,
        dp.verificado_em,
        dp.ultimo_acesso,
        p.nome_empresa,

        -- Estatísticas de acesso
        COUNT(ad.id) as total_acessos,
        COUNT(DISTINCT ad.ip_address) as ips_unicos,
        COUNT(DISTINCT DATE(ad.criado_em)) as dias_com_acesso,

        -- Acessos por tipo de usuário
        COUNT(CASE WHEN ad.user_tipo = 'cliente' THEN 1 END) as acessos_clientes,
        COUNT(CASE WHEN ad.user_tipo = 'parceiro' THEN 1 END) as acessos_parceiros,
        COUNT(CASE WHEN ad.user_tipo = 'provedor' THEN 1 END) as acessos_provedores,
        COUNT(CASE WHEN ad.user_tipo IS NULL THEN 1 END) as acessos_anonimos,

        -- Performance
        AVG(ad.tempo_resposta_ms) as tempo_resposta_medio,
        MAX(ad.tempo_resposta_ms) as tempo_resposta_maximo,

        -- Status codes
        COUNT(CASE WHEN ad.status_code BETWEEN 200 AND 299 THEN 1 END) as status_2xx,
        COUNT(CASE WHEN ad.status_code BETWEEN 400 AND 499 THEN 1 END) as status_4xx,
        COUNT(CASE WHEN ad.status_code BETWEEN 500 AND 599 THEN 1 END) as status_5xx

      FROM dominios_personalizados dp
      LEFT JOIN provedores p ON dp.provedor_id = p.id
      LEFT JOIN acessos_dominio ad ON dp.id = ad.dominio_id
      WHERE ${whereClause}
      GROUP BY dp.id, dp.dominio, dp.tipo, dp.verificado, dp.criado_em, dp.verificado_em, dp.ultimo_acesso, p.nome_empresa
      ORDER BY total_acessos DESC, dp.criado_em DESC
    `;

    const statsResult = await pool.query(statsQuery, params);

    // Query para acessos por dia (últimos 30 dias)
    const dailyStatsQuery = `
      SELECT
        DATE(ad.criado_em) as data,
        COUNT(ad.id) as acessos,
        COUNT(DISTINCT ad.ip_address) as ips_unicos
      FROM acessos_dominio ad
      INNER JOIN dominios_personalizados dp ON ad.dominio_id = dp.id
      WHERE ${whereClause}
      GROUP BY DATE(ad.criado_em)
      ORDER BY data DESC
      LIMIT 30
    `;

    const dailyResult = await pool.query(dailyStatsQuery, params);

    // Query para páginas mais acessadas
    const topPagesQuery = `
      SELECT
        ad.path,
        COUNT(ad.id) as acessos,
        COUNT(DISTINCT ad.ip_address) as ips_unicos,
        AVG(ad.tempo_resposta_ms) as tempo_resposta_medio
      FROM acessos_dominio ad
      INNER JOIN dominios_personalizados dp ON ad.dominio_id = dp.id
      WHERE ${whereClause}
        AND ad.path IS NOT NULL
      GROUP BY ad.path
      ORDER BY acessos DESC
      LIMIT 10
    `;

    const topPagesResult = await pool.query(topPagesQuery, params);

    // Query para resumo geral
    const summaryQuery = `
      SELECT
        COUNT(DISTINCT dp.id) as total_dominios,
        COUNT(DISTINCT CASE WHEN dp.verificado = true THEN dp.id END) as dominios_verificados,
        COUNT(DISTINCT CASE WHEN dp.tipo = 'subdominio' THEN dp.id END) as subdominios,
        COUNT(DISTINCT CASE WHEN dp.tipo = 'personalizado' THEN dp.id END) as dominios_personalizados,
        COUNT(DISTINCT ad.ip_address) as total_ips_unicos,
        SUM(CASE WHEN ad.criado_em >= NOW() - INTERVAL '24 hours' THEN 1 ELSE 0 END) as acessos_ultimas_24h
      FROM dominios_personalizados dp
      LEFT JOIN acessos_dominio ad ON dp.id = ad.dominio_id
      WHERE dp.ativo = true
        ${provedorId ? `AND dp.provedor_id = $${params.length + 1}` : ''}
    `;

    const summaryParams = provedorId ? [...params, provedorId] : params;
    const summaryResult = await pool.query(summaryQuery, summaryParams);

    return NextResponse.json({
      success: true,
      periodo_dias: parseInt(periodo),
      resumo: summaryResult.rows[0],
      dominios: statsResult.rows,
      acessos_por_dia: dailyResult.rows,
      paginas_mais_acessadas: topPagesResult.rows,
      gerado_em: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro ao buscar estatísticas de domínios:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/dominios/stats/export
 * Exporta estatísticas em CSV
 */
export async function POST(request) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

    if (!token || !['provedor', 'superadmin'].includes(token.user.role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { periodo = '30', formato = 'csv' } = await request.json();

    const provedorId = token.user.role === 'superadmin'
      ? null
      : token.user.id;

    // Query para exportação
    const exportQuery = `
      SELECT
        dp.dominio,
        dp.tipo,
        dp.verificado,
        TO_CHAR(dp.criado_em, 'YYYY-MM-DD HH24:MI:SS') as criado_em,
        TO_CHAR(dp.verificado_em, 'YYYY-MM-DD HH24:MI:SS') as verificado_em,
        p.nome_empresa,
        COUNT(ad.id) as total_acessos,
        COUNT(DISTINCT ad.ip_address) as ips_unicos,
        COUNT(DISTINCT DATE(ad.criado_em)) as dias_com_acesso,
        ROUND(AVG(ad.tempo_resposta_ms), 2) as tempo_resposta_medio_ms
      FROM dominios_personalizados dp
      LEFT JOIN provedores p ON dp.provedor_id = p.id
      LEFT JOIN acessos_dominio ad ON dp.id = ad.dominio_id
        AND ad.criado_em >= NOW() - INTERVAL '${parseInt(periodo)} days'
      WHERE dp.ativo = true
        ${provedorId ? 'AND dp.provedor_id = $1' : ''}
      GROUP BY dp.id, dp.dominio, dp.tipo, dp.verificado, dp.criado_em, dp.verificado_em, p.nome_empresa
      ORDER BY total_acessos DESC
    `;

    const params = provedorId ? [provedorId] : [];
    const result = await pool.query(exportQuery, params);

    if (formato === 'csv') {
      // Gerar CSV
      const headers = [
        'Dominio',
        'Tipo',
        'Verificado',
        'Criado Em',
        'Verificado Em',
        'Empresa',
        'Total Acessos',
        'IPs Únicos',
        'Dias com Acesso',
        'Tempo Resposta Médio (ms)'
      ];

      const csvContent = [
        headers.join(','),
        ...result.rows.map(row => [
          `"${row.dominio}"`,
          `"${row.tipo}"`,
          `"${row.verificado ? 'Sim' : 'Não'}"`,
          `"${row.criado_em || ''}"`,
          `"${row.verificado_em || ''}"`,
          `"${row.nome_empresa || ''}"`,
          row.total_acessos,
          row.ips_unicos,
          row.dias_com_acesso,
          row.tempo_resposta_medio_ms || 0
        ].join(','))
      ].join('\n');

      return new Response(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="dominios-stats-${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    }

    // Formato JSON
    return NextResponse.json({
      success: true,
      dados: result.rows,
      periodo_dias: parseInt(periodo),
      exportado_em: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro ao exportar estatísticas:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
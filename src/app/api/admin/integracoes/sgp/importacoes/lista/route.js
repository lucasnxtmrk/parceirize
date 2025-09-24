import { Pool } from 'pg';
import { getServerSession } from 'next-auth';
import { options } from '@/app/api/auth/[...nextauth]/options';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET(req) {
  try {
    const session = await getServerSession(options);
    if (!session || !['provedor', 'superadmin'].includes(session.user.role)) {
      return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403 });
    }

    const url = new URL(req.url);
    const status = url.searchParams.get('status'); // all, queued, running, completed, failed
    const limit = parseInt(url.searchParams.get('limit')) || 50;
    const offset = parseInt(url.searchParams.get('offset')) || 0;

    // Definir provedor_id baseado no papel do usuário
    let provedorId = null;
    if (session.user.role === 'provedor') {
      // Obter o provedor do usuário logado
      const provedorResult = await pool.query(
        'SELECT id FROM provedores WHERE email = $1',
        [session.user.email]
      );

      if (provedorResult.rows.length === 0) {
        return new Response(JSON.stringify({ error: 'Provedor não encontrado' }), { status: 404 });
      }

      provedorId = provedorResult.rows[0].id;
    }

    // Construir query base
    let whereClause = '';
    let queryParams = [];
    let paramIndex = 1;

    // Filtrar por provedor se não for superadmin
    if (provedorId) {
      whereClause += `WHERE provedor_id = $${paramIndex}`;
      queryParams.push(provedorId);
      paramIndex++;
    }

    // Filtrar por status se especificado
    if (status && status !== 'all') {
      whereClause += provedorId ? ' AND ' : 'WHERE ';
      whereClause += `status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    // Query principal para listar importações
    const query = `
      SELECT
        j.id,
        j.nome_importacao,
        j.status,
        j.progresso_percent,
        j.total_estimado,
        j.processados,
        j.criados,
        j.atualizados,
        j.erros,
        j.mensagem_atual,
        j.eta_segundos,
        j.queue_position,
        j.created_at,
        j.started_at,
        j.finalizado_em,
        p.email as provedor_email,
        p.nome_empresa as provedor_nome
      FROM import_jobs j
      JOIN provedores p ON j.provedor_id = p.id
      ${whereClause}
      ORDER BY j.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);

    const result = await pool.query(query, queryParams);

    // Query para contar o total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM import_jobs j
      JOIN provedores p ON j.provedor_id = p.id
      ${whereClause}
    `;

    const countParams = queryParams.slice(0, -2); // Remove limit e offset
    const countResult = await pool.query(countQuery, countParams);

    // Estatísticas gerais (opcional)
    const statsQuery = `
      SELECT
        status,
        COUNT(*) as count
      FROM import_jobs j
      ${provedorId ? 'WHERE provedor_id = $1' : ''}
      GROUP BY status
    `;

    const statsParams = provedorId ? [provedorId] : [];
    const statsResult = await pool.query(statsQuery, statsParams);

    const stats = {};
    statsResult.rows.forEach(row => {
      stats[row.status] = parseInt(row.count);
    });

    return new Response(JSON.stringify({
      success: true,
      data: {
        importacoes: result.rows,
        pagination: {
          total: parseInt(countResult.rows[0].total),
          limit,
          offset,
          hasMore: offset + limit < parseInt(countResult.rows[0].total)
        },
        stats
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Erro ao listar importações:', error);
    return new Response(JSON.stringify({
      error: 'Erro interno do servidor',
      details: error.message
    }), { status: 500 });
  }
}
import { Pool } from 'pg';
import { getServerSession } from 'next-auth';
import { options } from '@/app/api/auth/[...nextauth]/options';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function getProvedor(email) {
  const r = await pool.query('SELECT id, email FROM provedores WHERE email = $1', [email]);
  return r.rows[0] || null;
}

export async function GET(req) {
  try {
    const session = await getServerSession(options);
    if (!session || !['provedor', 'superadmin'].includes(session.user.role)) {
      return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403 });
    }

    // Obter provedor
    const provedor = await getProvedor(session.user.email);
    if (!provedor) {
      return new Response(JSON.stringify({ error: 'Provedor não encontrado' }), { status: 404 });
    }

    // Buscar importação ativa
    const result = await pool.query(
      `SELECT
        id,
        status,
        total_estimado,
        processados,
        criados,
        atualizados,
        erros,
        progresso_percent,
        eta_segundos,
        mensagem_atual,
        configuracao,
        created_at,
        finalizado_em
      FROM import_jobs
      WHERE provedor_id = $1
        AND status IN ('running', 'queued')
      ORDER BY created_at DESC
      LIMIT 1`,
      [provedor.id]
    );

    if (result.rows.length === 0) {
      return new Response(JSON.stringify({
        hasActiveImport: false,
        job: null
      }), { status: 200 });
    }

    const job = result.rows[0];

    return new Response(JSON.stringify({
      hasActiveImport: true,
      job: {
        id: job.id,
        status: job.status,
        fase: job.status === 'queued' ? 'na_fila' : 'processando',
        mensagem: job.mensagem_atual,
        total: job.total_estimado || 0,
        processados: job.processados || 0,
        criados: job.criados || 0,
        atualizados: job.atualizados || 0,
        erros: job.erros || 0,
        progresso_percent: job.progresso_percent || 0,
        eta_segundos: job.eta_segundos,
        configuracao: job.configuracao,
        created_at: job.created_at,
        finalizado_em: job.finalizado_em
      }
    }), { status: 200 });

  } catch (error) {
    console.error('Erro ao verificar status da importação:', error);
    return new Response(JSON.stringify({
      error: 'Erro interno do servidor',
      details: error.message
    }), { status: 500 });
  }
}
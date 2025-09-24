import { Pool } from 'pg';
import { getServerSession } from 'next-auth';
import { options } from '@/app/api/auth/[...nextauth]/options';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function getProvedor(email) {
  try {
    console.log('🔍 Buscando provedor para email:', email);
    const r = await pool.query('SELECT id, email FROM provedores WHERE email = $1', [email]);
    console.log('📊 Query provedores resultado:', r.rows.length, 'rows');
    return r.rows[0] || null;
  } catch (error) {
    console.error('❌ Erro na query getProvedor:', error);
    throw error;
  }
}

export async function GET(req) {
  try {
    const session = await getServerSession(options);
    if (!session || !['provedor', 'superadmin'].includes(session.user.role)) {
      return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403 });
    }

    console.log('🔍 Status SGP - Email do usuário:', session.user.email);

    // Obter provedor
    const provedor = await getProvedor(session.user.email);
    if (!provedor) {
      console.log('❌ Status SGP - Provedor não encontrado na tabela provedores para email:', session.user.email);

      // Verificar se usuário está na tabela admins (sistema antigo)
      try {
        const adminCheck = await pool.query('SELECT id, email, tipo FROM admins WHERE email = $1', [session.user.email]);
        console.log('🔍 Verificando tabela admins:', adminCheck.rows.length, 'rows encontradas');
        if (adminCheck.rows.length > 0) {
          console.log('📋 Usuário encontrado em admins:', adminCheck.rows[0]);
          return new Response(JSON.stringify({
            error: 'Usuário encontrado em tabela admins, mas sistema espera provedores. Migração necessária.'
          }), { status: 500 });
        }
      } catch (adminError) {
        console.error('❌ Erro ao verificar tabela admins:', adminError);
      }

      return new Response(JSON.stringify({ error: 'Provedor não encontrado' }), { status: 404 });
    }

    console.log('✅ Status SGP - Provedor encontrado:', { id: provedor.id, email: provedor.email });

    // Buscar importação ativa
    console.log('🔍 Status SGP - Buscando jobs para provedor_id:', provedor.id);

    let result;
    try {
      result = await pool.query(
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
      console.log('📊 Status SGP - Resultados encontrados:', result.rows.length);
    } catch (dbError) {
      console.error('❌ Erro na query import_jobs:', dbError);

      // Verificar se a tabela existe
      try {
        const tableCheck = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name = 'import_jobs'
          );
        `);
        console.log('🔍 Tabela import_jobs existe?', tableCheck.rows[0]?.exists);
      } catch (checkError) {
        console.error('❌ Erro ao verificar tabela:', checkError);
      }

      throw dbError;
    }

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
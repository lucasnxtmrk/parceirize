import { Pool } from 'pg';
import { getServerSession } from 'next-auth';
import { options } from '@/app/api/auth/[...nextauth]/options';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET(req, { params }) {
  try {
    const session = await getServerSession(options);
    if (!session || !['provedor', 'superadmin'].includes(session.user.role)) {
      return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403 });
    }

    const { id } = params;

    if (!id || isNaN(parseInt(id))) {
      return new Response(JSON.stringify({ error: 'ID da importação inválido' }), { status: 400 });
    }

    // Definir provedor_id baseado no papel do usuário
    let provedorId = null;
    if (session.user.role === 'provedor') {
      const provedorResult = await pool.query(
        'SELECT id FROM provedores WHERE email = $1',
        [session.user.email]
      );

      if (provedorResult.rows.length === 0) {
        return new Response(JSON.stringify({ error: 'Provedor não encontrado' }), { status: 404 });
      }

      provedorId = provedorResult.rows[0].id;
    }

    // Query para obter detalhes da importação
    let query = `
      SELECT
        j.id,
        j.nome_importacao,
        j.status,
        j.configuracao,
        j.progresso_percent,
        j.total_estimado,
        j.processados,
        j.criados,
        j.atualizados,
        j.erros,
        j.mensagem_atual,
        j.eta_segundos,
        j.queue_position,
        j.worker_id,
        j.resultados,
        j.logs,
        j.created_at,
        j.started_at,
        j.finalizado_em,
        j.updated_at,
        p.email as provedor_email,
        p.nome as provedor_nome
      FROM import_jobs j
      JOIN provedores p ON j.provedor_id = p.id
      WHERE j.id = $1
    `;

    let queryParams = [parseInt(id)];

    // Se não for superadmin, filtrar por provedor
    if (provedorId) {
      query += ` AND j.provedor_id = $2`;
      queryParams.push(provedorId);
    }

    const result = await pool.query(query, queryParams);

    if (result.rows.length === 0) {
      return new Response(JSON.stringify({ error: 'Importação não encontrada' }), { status: 404 });
    }

    const importacao = result.rows[0];

    // Calcular estatísticas de tempo
    const stats = {
      duracao_total: null,
      duracao_processamento: null,
      velocidade_media: null,
      tempo_na_fila: null
    };

    if (importacao.started_at && importacao.finalizado_em) {
      const inicio = new Date(importacao.started_at);
      const fim = new Date(importacao.finalizado_em);
      stats.duracao_total = Math.round((fim - inicio) / 1000); // segundos

      if (importacao.processados > 0) {
        stats.velocidade_media = Math.round(importacao.processados / stats.duracao_total * 60); // por minuto
      }
    }

    if (importacao.created_at && importacao.started_at) {
      const criado = new Date(importacao.created_at);
      const inicio = new Date(importacao.started_at);
      stats.tempo_na_fila = Math.round((inicio - criado) / 1000); // segundos
    }

    if (importacao.started_at && importacao.status === 'running') {
      const inicio = new Date(importacao.started_at);
      const agora = new Date();
      stats.duracao_processamento = Math.round((agora - inicio) / 1000); // segundos

      if (importacao.processados > 0) {
        stats.velocidade_media = Math.round(importacao.processados / stats.duracao_processamento * 60); // por minuto
      }
    }

    // Formatear logs se existirem
    let logsFormatados = [];
    if (importacao.logs && Array.isArray(importacao.logs)) {
      logsFormatados = importacao.logs.map(log => {
        try {
          // Se o log for JSON, parsear
          return typeof log === 'string' ? JSON.parse(log) : log;
        } catch {
          // Se não for JSON válido, retornar como string
          return { timestamp: new Date().toISOString(), mensagem: log };
        }
      });
    }

    // Parsear configuração e resultados se existirem
    let configuracao = {};
    let resultados = {};

    try {
      configuracao = typeof importacao.configuracao === 'string'
        ? JSON.parse(importacao.configuracao)
        : importacao.configuracao || {};
    } catch (e) {
      configuracao = { erro: 'Configuração inválida' };
    }

    try {
      resultados = typeof importacao.resultados === 'string'
        ? JSON.parse(importacao.resultados)
        : importacao.resultados || {};
    } catch (e) {
      resultados = { erro: 'Resultados inválidos' };
    }

    return new Response(JSON.stringify({
      success: true,
      data: {
        ...importacao,
        configuracao,
        resultados,
        logs: logsFormatados,
        stats
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Erro ao obter detalhes da importação:', error);
    return new Response(JSON.stringify({
      error: 'Erro interno do servidor',
      details: error.message
    }), { status: 500 });
  }
}

// Endpoint para cancelar importação (se estiver na fila)
export async function DELETE(req, { params }) {
  try {
    const session = await getServerSession(options);
    if (!session || !['provedor', 'superadmin'].includes(session.user.role)) {
      return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403 });
    }

    const { id } = params;

    if (!id || isNaN(parseInt(id))) {
      return new Response(JSON.stringify({ error: 'ID da importação inválido' }), { status: 400 });
    }

    // Definir provedor_id baseado no papel do usuário
    let provedorId = null;
    if (session.user.role === 'provedor') {
      const provedorResult = await pool.query(
        'SELECT id FROM provedores WHERE email = $1',
        [session.user.email]
      );

      if (provedorResult.rows.length === 0) {
        return new Response(JSON.stringify({ error: 'Provedor não encontrado' }), { status: 404 });
      }

      provedorId = provedorResult.rows[0].id;
    }

    // Verificar se a importação existe e pode ser cancelada
    let checkQuery = `
      SELECT id, status, provedor_id
      FROM import_jobs
      WHERE id = $1
    `;

    let queryParams = [parseInt(id)];

    if (provedorId) {
      checkQuery += ` AND provedor_id = $2`;
      queryParams.push(provedorId);
    }

    const checkResult = await pool.query(checkQuery, queryParams);

    if (checkResult.rows.length === 0) {
      return new Response(JSON.stringify({ error: 'Importação não encontrada' }), { status: 404 });
    }

    const importacao = checkResult.rows[0];

    if (!['queued'].includes(importacao.status)) {
      return new Response(JSON.stringify({
        error: 'Só é possível cancelar importações que estão na fila (status: queued)'
      }), { status: 400 });
    }

    // Cancelar a importação
    await pool.query(
      `UPDATE import_jobs
       SET status = 'failed',
           mensagem_atual = 'Cancelada pelo usuário',
           finalizado_em = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [parseInt(id)]
    );

    return new Response(JSON.stringify({
      success: true,
      message: 'Importação cancelada com sucesso'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Erro ao cancelar importação:', error);
    return new Response(JSON.stringify({
      error: 'Erro interno do servidor',
      details: error.message
    }), { status: 500 });
  }
}
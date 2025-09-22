/**
 * SERVIÇO DE CRON PERSISTENTE
 *
 * Este serviço mantém cron jobs persistentes no banco de dados,
 * funcionando mesmo após reinicializações do servidor.
 */

import { Pool } from 'pg';
import SGPSyncService from '@/lib/sgp-sync-service';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const sgpSync = new SGPSyncService();

export class PersistentCronService {
  constructor() {
    this.isCheckingCrons = false;
    this.checkInterval = 5 * 60 * 1000; // Verificar a cada 5 minutos
    this.startPeriodicCheck();
  }

  /**
   * Inicia verificação periódica dos cron jobs
   */
  startPeriodicCheck() {
    // Verificar imediatamente
    this.checkAndExecuteCrons();

    // Verificar a cada 5 minutos
    setInterval(() => {
      this.checkAndExecuteCrons();
    }, this.checkInterval);

    console.log('🔄 Sistema de cron persistente iniciado - verificações a cada 5 minutos');
  }

  /**
   * Verifica e executa cron jobs que devem rodar
   */
  async checkAndExecuteCrons() {
    if (this.isCheckingCrons) {
      return; // Evitar execuções simultâneas
    }

    this.isCheckingCrons = true;

    try {
      // Buscar cron jobs que devem executar
      const result = await pool.query(`
        SELECT nome, descricao, intervalo_horas
        FROM cron_jobs
        WHERE ativo = TRUE
        AND deve_executar_cron(nome) = TRUE
      `);

      for (const job of result.rows) {
        console.log(`⚡ Executando cron job: ${job.nome}`);
        await this.executeCronJob(job.nome);
      }

    } catch (error) {
      console.error('❌ Erro ao verificar cron jobs:', error.message);
    } finally {
      this.isCheckingCrons = false;
    }
  }

  /**
   * Executa um cron job específico
   */
  async executeCronJob(nomeJob) {
    const startTime = Date.now();

    try {
      // Marcar início da execução
      await pool.query('SELECT iniciar_execucao_cron($1)', [nomeJob]);

      console.log(`🚀 Iniciando execução do job: ${nomeJob}`);

      let resultado = {};

      // Executar job específico
      switch (nomeJob) {
        case 'sgp_sync_inteligente':
          resultado = await this.executarSincronizacaoSGP();
          break;

        default:
          throw new Error(`Job não reconhecido: ${nomeJob}`);
      }

      const duracao = Math.round((Date.now() - startTime) / 1000);

      // Marcar sucesso
      await pool.query(
        'SELECT finalizar_execucao_cron($1, $2, $3, $4)',
        [nomeJob, 'success', JSON.stringify(resultado), duracao]
      );

      console.log(`✅ Job ${nomeJob} concluído com sucesso em ${duracao}s`);

      return { success: true, resultado, duracao };

    } catch (error) {
      const duracao = Math.round((Date.now() - startTime) / 1000);

      // Marcar erro
      await pool.query(
        'SELECT finalizar_execucao_cron($1, $2, $3, $4)',
        [nomeJob, 'error', JSON.stringify({ erro: error.message }), duracao]
      );

      console.error(`❌ Erro no job ${nomeJob}:`, error.message);

      return { success: false, erro: error.message, duracao };
    }
  }

  /**
   * Executa sincronização SGP inteligente
   */
  async executarSincronizacaoSGP() {
    console.log('🧠 Executando sincronização SGP inteligente...');

    const resultados = await sgpSync.sincronizarTodos();

    let totalSincronizacoes = 0;
    let totalNovos = 0;
    let totalAtualizados = 0;
    let totalErros = 0;

    for (const resultado of resultados) {
      if (resultado.resultado && !resultado.erro) {
        totalSincronizacoes++;
        totalNovos += resultado.resultado.novos || 0;
        totalAtualizados += resultado.resultado.atualizados || 0;
        totalErros += resultado.resultado.erros || 0;
      } else if (resultado.erro) {
        console.error(`Erro na sincronização provedor_id ${resultado.provedor_id}:`, resultado.erro);
        totalErros++;
      }
    }

    const resumo = {
      total_provedores: totalSincronizacoes,
      total_novos: totalNovos,
      total_atualizados: totalAtualizados,
      total_erros: totalErros,
      timestamp: new Date().toISOString(),
      resultados_detalhados: resultados
    };

    // Log de auditoria global
    await pool.query(
      `INSERT INTO tenant_logs (tenant_id, usuario_tipo, usuario_id, acao, detalhes, created_at)
       VALUES (NULL, 'sistema', 0, 'sync_automatico_persistente', $1, NOW())`,
      [JSON.stringify(resumo)]
    );

    console.log(`✅ Sincronização persistente concluída: ${totalSincronizacoes} provedores, ${totalNovos} novos, ${totalAtualizados} atualizados`);

    return resumo;
  }

  /**
   * Ativar/desativar um cron job
   */
  async toggleCronJob(nomeJob, ativo) {
    const result = await pool.query(
      'UPDATE cron_jobs SET ativo = $1, updated_at = NOW() WHERE nome = $2 RETURNING *',
      [ativo, nomeJob]
    );

    if (result.rows.length === 0) {
      throw new Error(`Cron job não encontrado: ${nomeJob}`);
    }

    console.log(`🔄 Cron job ${nomeJob} ${ativo ? 'ativado' : 'desativado'}`);
    return result.rows[0];
  }

  /**
   * Atualizar intervalo de um cron job
   */
  async updateCronInterval(nomeJob, intervaloHoras) {
    const result = await pool.query(
      `UPDATE cron_jobs SET
        intervalo_horas = $1,
        next_run = calcular_proximo_run($1),
        updated_at = NOW()
       WHERE nome = $2 RETURNING *`,
      [intervaloHoras, nomeJob]
    );

    if (result.rows.length === 0) {
      throw new Error(`Cron job não encontrado: ${nomeJob}`);
    }

    console.log(`⏰ Intervalo do cron job ${nomeJob} atualizado para ${intervaloHoras}h`);
    return result.rows[0];
  }

  /**
   * Executar cron job manualmente
   */
  async runCronJobNow(nomeJob) {
    console.log(`🏃‍♂️ Executando ${nomeJob} manualmente...`);
    return await this.executeCronJob(nomeJob);
  }

  /**
   * Obter status de todos os cron jobs
   */
  async getCronJobsStatus() {
    const result = await pool.query(`
      SELECT
        nome,
        descricao,
        intervalo_horas,
        ativo,
        last_run,
        next_run,
        total_execucoes,
        ultima_duracao_segundos,
        ultimo_status,
        ultimo_resultado,
        deve_executar_cron(nome) as deve_executar_agora,
        CASE
          WHEN last_run IS NULL THEN 'Nunca executado'
          WHEN ultimo_status = 'running' AND last_run < NOW() - INTERVAL '2 hours' THEN 'Timeout (possível erro)'
          WHEN ultimo_status = 'running' THEN 'Executando...'
          WHEN ultimo_status = 'success' THEN 'Última execução: sucesso'
          WHEN ultimo_status = 'error' THEN 'Última execução: erro'
          ELSE ultimo_status
        END as status_descricao
      FROM cron_jobs
      ORDER BY nome
    `);

    return result.rows;
  }

  /**
   * Obter histórico de execuções de um cron job
   */
  async getCronJobHistory(nomeJob, limit = 10) {
    const result = await pool.query(`
      SELECT
        acao,
        detalhes,
        created_at
      FROM tenant_logs
      WHERE acao IN ('sync_automatico_persistente', 'sync_automatico_erro')
      ORDER BY created_at DESC
      LIMIT $1
    `, [limit]);

    return result.rows;
  }

  /**
   * Resetar status de um cron job (útil para resolver travamentos)
   */
  async resetCronJob(nomeJob) {
    const result = await pool.query(
      `UPDATE cron_jobs SET
        ultimo_status = 'pending',
        next_run = calcular_proximo_run(intervalo_horas),
        updated_at = NOW()
       WHERE nome = $1 RETURNING *`,
      [nomeJob]
    );

    if (result.rows.length === 0) {
      throw new Error(`Cron job não encontrado: ${nomeJob}`);
    }

    console.log(`🔄 Cron job ${nomeJob} resetado`);
    return result.rows[0];
  }
}

// Instância singleton do serviço
let persistentCronInstance = null;

export function getPersistentCronService() {
  if (!persistentCronInstance) {
    persistentCronInstance = new PersistentCronService();
  }
  return persistentCronInstance;
}

export default PersistentCronService;
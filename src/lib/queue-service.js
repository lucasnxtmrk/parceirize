import { Pool } from 'pg';

class QueueService {
  constructor() {
    this.pool = new Pool({ connectionString: process.env.DATABASE_URL });
    this.workerId = `worker_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.isProcessing = false;
    this.processInterval = null;
    this.autoStarted = false;

    console.log(`🔧 QueueService criado com worker ID: ${this.workerId}`);
  }

  // Auto-iniciar processamento se ainda não foi iniciado
  ensureProcessingStarted() {
    if (!this.autoStarted) {
      console.log('🚀 Auto-iniciando processamento da fila...');
      this.startProcessing();
      this.autoStarted = true;
    }
  }

  // Adicionar job à fila
  async enqueueJob(provedorId, config) {
    try {
      // Verificar se já existe um job ativo para este provedor
      const existing = await this.pool.query(
        `SELECT id, status FROM import_jobs
         WHERE provedor_id = $1 AND status IN ('queued', 'running')
         ORDER BY created_at DESC LIMIT 1`,
        [provedorId]
      );

      if (existing.rows.length > 0) {
        throw new Error('Já existe uma importação em andamento para este provedor');
      }

      // Obter próxima posição na fila
      const queueResult = await this.pool.query(
        `SELECT COALESCE(MAX(queue_position), 0) + 1 as next_position
         FROM import_jobs WHERE status = 'queued'`
      );
      const queuePosition = queueResult.rows[0].next_position;

      // Criar novo job
      const jobResult = await this.pool.query(
        `INSERT INTO import_jobs (
          provedor_id, status, configuracao, mensagem_atual, queue_position
        ) VALUES ($1, 'queued', $2, $3, $4) RETURNING id`,
        [
          provedorId,
          JSON.stringify(config),
          `Na fila (posição ${queuePosition})`,
          queuePosition
        ]
      );

      console.log(`📋 Job ${jobResult.rows[0].id} adicionado à fila na posição ${queuePosition}`);

      // Garantir que o processamento esteja rodando
      this.ensureProcessingStarted();

      return jobResult.rows[0].id;
    } catch (error) {
      console.error('Erro ao enfileirar job:', error);
      throw error;
    }
  }

  // Iniciar processamento da fila
  startProcessing() {
    if (this.isProcessing) return;

    this.isProcessing = true;
    console.log(`🚀 Worker ${this.workerId} iniciado`);

    this.processInterval = setInterval(() => {
      this.processNextJob().catch(error => {
        console.error('Erro no processamento da fila:', error);
      });
    }, 5000); // Verificar a cada 5 segundos
  }

  // Parar processamento
  stopProcessing() {
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
    }
    this.isProcessing = false;
    console.log(`⏹️ Worker ${this.workerId} parado`);
  }

  // Processar próximo job da fila
  async processNextJob() {
    try {
      // Buscar próximo job na fila
      const result = await this.pool.query(
        `UPDATE import_jobs
         SET status = 'running',
             worker_id = $1,
             started_at = NOW(),
             mensagem_atual = 'Processando...'
         WHERE id = (
           SELECT id FROM import_jobs
           WHERE status = 'queued'
           ORDER BY queue_position ASC, created_at ASC
           LIMIT 1
           FOR UPDATE SKIP LOCKED
         )
         RETURNING *`,
        [this.workerId]
      );

      if (result.rows.length === 0) {
        // Não há jobs na fila
        return;
      }

      const job = result.rows[0];
      console.log(`⚡ Processando job ${job.id} para provedor ${job.provedor_id}`);

      // Processar o job (chamar a função de importação)
      await this.executeImportJob(job);

    } catch (error) {
      console.error('Erro ao processar job:', error);
    }
  }

  // Executar a importação
  async executeImportJob(job) {
    try {
      // PostgreSQL JSONB retorna object, não string
      const config = typeof job.configuracao === 'string'
        ? JSON.parse(job.configuracao)
        : job.configuracao || {};
      console.log(`🔄 Iniciando importação para job ${job.id}...`);

      // Importar a lógica de importação
      const { executarImportacaoSGP } = await import('./sgp-import-worker.js');

      // Executar importação com callback de progresso
      const resultado = await executarImportacaoSGP(job, config, async (progress) => {
        // Atualizar progresso no banco
        await this.pool.query(
          `UPDATE import_jobs SET
            total_estimado = COALESCE($1, total_estimado),
            processados = COALESCE($2, processados),
            criados = COALESCE($3, criados),
            atualizados = COALESCE($4, atualizados),
            erros = COALESCE($5, erros),
            progresso_percent = COALESCE($6, progresso_percent),
            eta_segundos = $7,
            mensagem_atual = COALESCE($8, mensagem_atual),
            updated_at = NOW()
           WHERE id = $9`,
          [
            progress.total,
            progress.processados,
            progress.criados,
            progress.atualizados,
            progress.erros,
            progress.progresso_percent,
            progress.eta_segundos,
            progress.mensagem,
            job.id
          ]
        );
      });

      // Marcar como concluído
      await this.pool.query(
        `UPDATE import_jobs
         SET status = 'completed',
             finalizado_em = NOW(),
             resultados = $1,
             mensagem_atual = 'Importação concluída com sucesso'
         WHERE id = $2`,
        [JSON.stringify(resultado), job.id]
      );

      console.log(`✅ Job ${job.id} concluído:`, resultado);

    } catch (error) {
      console.error(`❌ Erro no job ${job.id}:`, error);

      // Marcar como erro
      await this.pool.query(
        `UPDATE import_jobs
         SET status = 'failed',
             mensagem_atual = $1,
             finalizado_em = NOW()
         WHERE id = $2`,
        [error.message, job.id]
      );
    }
  }

  // Obter posição na fila para um provedor
  async getQueuePosition(provedorId) {
    try {
      const result = await this.pool.query(
        `SELECT queue_position, status
         FROM import_jobs
         WHERE provedor_id = $1 AND status IN ('queued', 'running')
         ORDER BY created_at DESC LIMIT 1`,
        [provedorId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const job = result.rows[0];
      if (job.status === 'running') {
        return 0; // Está sendo processado agora
      }

      // Contar quantos jobs estão na frente
      const countResult = await this.pool.query(
        `SELECT COUNT(*) as ahead
         FROM import_jobs
         WHERE status = 'queued' AND queue_position < $1`,
        [job.queue_position]
      );

      return parseInt(countResult.rows[0].ahead) + 1;
    } catch (error) {
      console.error('Erro ao obter posição na fila:', error);
      return null;
    }
  }

  // Limpar jobs antigos
  async cleanupOldJobs() {
    try {
      await this.pool.query(
        `DELETE FROM import_jobs
         WHERE status IN ('completed', 'failed')
           AND finalizado_em < NOW() - INTERVAL '7 days'`
      );
    } catch (error) {
      console.error('Erro ao limpar jobs antigos:', error);
    }
  }
}

// Instância singleton
let queueService = null;

export function getQueueService() {
  if (!queueService) {
    queueService = new QueueService();
  }
  return queueService;
}

export default QueueService;
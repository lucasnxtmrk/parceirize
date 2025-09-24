-- Criar tabela import_jobs para sistema de filas de importação
CREATE TABLE IF NOT EXISTS import_jobs (
  id SERIAL PRIMARY KEY,
  provedor_id INTEGER REFERENCES provedores(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'queued',
  nome_importacao VARCHAR(255) DEFAULT 'Importação SGP',
  configuracao JSONB NOT NULL DEFAULT '{}',
  queue_position INTEGER,
  worker_id VARCHAR(100),
  total_estimado INTEGER,
  processados INTEGER DEFAULT 0,
  criados INTEGER DEFAULT 0,
  atualizados INTEGER DEFAULT 0,
  erros INTEGER DEFAULT 0,
  progresso_percent DECIMAL(5,2) DEFAULT 0,
  eta_segundos INTEGER,
  mensagem_atual TEXT,
  resultados JSONB,
  logs TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  finalizado_em TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para otimizar consultas
CREATE INDEX IF NOT EXISTS idx_import_jobs_provedor ON import_jobs(provedor_id);
CREATE INDEX IF NOT EXISTS idx_import_jobs_status ON import_jobs(status);
CREATE INDEX IF NOT EXISTS idx_import_jobs_queue ON import_jobs(queue_position) WHERE status = 'queued';
CREATE INDEX IF NOT EXISTS idx_import_jobs_created ON import_jobs(created_at);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_import_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_import_jobs_updated_at ON import_jobs;
CREATE TRIGGER update_import_jobs_updated_at
  BEFORE UPDATE ON import_jobs
  FOR EACH ROW EXECUTE FUNCTION update_import_jobs_updated_at();

-- Comentários para documentação
COMMENT ON TABLE import_jobs IS 'Fila de jobs de importação SGP';
COMMENT ON COLUMN import_jobs.nome_importacao IS 'Nome descritivo da importação para identificação';
COMMENT ON COLUMN import_jobs.logs IS 'Array de logs detalhados do processamento';
COMMENT ON COLUMN import_jobs.queue_position IS 'Posição na fila de processamento';
COMMENT ON COLUMN import_jobs.worker_id IS 'ID do worker que está processando o job';
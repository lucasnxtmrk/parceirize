-- ================================================
-- SCRIPT PARA ADICIONAR SISTEMA DE CRON PERSISTENTE
-- ================================================

-- Criar tabela de controle de cron jobs
CREATE TABLE IF NOT EXISTS cron_jobs (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) UNIQUE NOT NULL,
  descricao TEXT,
  intervalo_horas INTEGER NOT NULL DEFAULT 12,
  ativo BOOLEAN DEFAULT TRUE,
  last_run TIMESTAMP,
  next_run TIMESTAMP,
  total_execucoes INTEGER DEFAULT 0,
  ultima_duracao_segundos INTEGER,
  ultimo_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'running', 'success', 'error'
  ultimo_resultado JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Inserir job de sincronização SGP
INSERT INTO cron_jobs (nome, descricao, intervalo_horas, ativo)
VALUES (
  'sgp_sync_inteligente',
  'Sincronização inteligente SGP - busca apenas clientes com contratos ativos e mudanças recentes',
  12,
  TRUE
) ON CONFLICT (nome) DO UPDATE SET
  descricao = EXCLUDED.descricao,
  intervalo_horas = EXCLUDED.intervalo_horas,
  updated_at = NOW();

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_cron_jobs_nome ON cron_jobs(nome);
CREATE INDEX IF NOT EXISTS idx_cron_jobs_ativo ON cron_jobs(ativo);
CREATE INDEX IF NOT EXISTS idx_cron_jobs_next_run ON cron_jobs(next_run);

-- Função para calcular próxima execução
CREATE OR REPLACE FUNCTION calcular_proximo_run(intervalo_horas INTEGER)
RETURNS TIMESTAMP AS $$
BEGIN
  RETURN NOW() + (intervalo_horas || ' hours')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- Função para verificar se cron deve executar
CREATE OR REPLACE FUNCTION deve_executar_cron(nome_job VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
  job_record RECORD;
BEGIN
  SELECT * INTO job_record
  FROM cron_jobs
  WHERE nome = nome_job AND ativo = TRUE;

  -- Se job não existe ou está inativo
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Se nunca executou, deve executar
  IF job_record.last_run IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Se já passou do next_run, deve executar
  IF job_record.next_run IS NULL OR NOW() >= job_record.next_run THEN
    RETURN TRUE;
  END IF;

  -- Se está rodando há muito tempo (timeout), deve executar
  IF job_record.ultimo_status = 'running' AND
     job_record.last_run < NOW() - INTERVAL '2 hours' THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Função para marcar início de execução
CREATE OR REPLACE FUNCTION iniciar_execucao_cron(nome_job VARCHAR)
RETURNS VOID AS $$
BEGIN
  UPDATE cron_jobs SET
    ultimo_status = 'running',
    last_run = NOW(),
    updated_at = NOW()
  WHERE nome = nome_job;
END;
$$ LANGUAGE plpgsql;

-- Função para marcar fim de execução
CREATE OR REPLACE FUNCTION finalizar_execucao_cron(
  nome_job VARCHAR,
  status VARCHAR,
  resultado JSONB,
  duracao_segundos INTEGER
)
RETURNS VOID AS $$
BEGIN
  UPDATE cron_jobs SET
    ultimo_status = status,
    next_run = calcular_proximo_run(intervalo_horas),
    total_execucoes = total_execucoes + 1,
    ultima_duracao_segundos = duracao_segundos,
    ultimo_resultado = resultado,
    updated_at = NOW()
  WHERE nome = nome_job;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_cron_jobs_updated_at ON cron_jobs;
CREATE TRIGGER update_cron_jobs_updated_at
  BEFORE UPDATE ON cron_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comentários para documentação
COMMENT ON TABLE cron_jobs IS 'Controle de execução de cron jobs persistente no banco';
COMMENT ON COLUMN cron_jobs.nome IS 'Nome único do cron job';
COMMENT ON COLUMN cron_jobs.intervalo_horas IS 'Intervalo entre execuções em horas';
COMMENT ON COLUMN cron_jobs.last_run IS 'Timestamp da última execução';
COMMENT ON COLUMN cron_jobs.next_run IS 'Timestamp da próxima execução calculada';
COMMENT ON COLUMN cron_jobs.ultimo_status IS 'Status da última execução: pending, running, success, error';
COMMENT ON COLUMN cron_jobs.ultimo_resultado IS 'Resultado detalhado da última execução (JSON)';

-- Mostrar status atual
SELECT
  nome,
  ativo,
  intervalo_horas,
  last_run,
  next_run,
  total_execucoes,
  ultimo_status,
  deve_executar_cron(nome) as deve_executar_agora
FROM cron_jobs;

COMMIT;
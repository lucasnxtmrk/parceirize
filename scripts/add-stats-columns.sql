-- Adicionar colunas de estatísticas na tabela integracoes
ALTER TABLE integracoes ADD COLUMN IF NOT EXISTS stats_ultima_importacao JSONB DEFAULT '{}';
ALTER TABLE integracoes ADD COLUMN IF NOT EXISTS ultima_importacao_completa TIMESTAMP;

-- Adicionar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_integracoes_ultima_importacao ON integracoes(ultima_importacao_completa);

-- Comentários para documentar
COMMENT ON COLUMN integracoes.stats_ultima_importacao IS 'Estatísticas da última importação (JSON)';
COMMENT ON COLUMN integracoes.ultima_importacao_completa IS 'Timestamp da última importação completa';
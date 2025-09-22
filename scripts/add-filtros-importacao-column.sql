-- Adicionar coluna filtros_importacao na tabela integracoes
ALTER TABLE integracoes ADD COLUMN filtros_importacao JSONB DEFAULT '{}';

-- Adicionar comentário para documentar a coluna
COMMENT ON COLUMN integracoes.filtros_importacao IS 'Filtros padrão para importação/sincronização (JSON)';
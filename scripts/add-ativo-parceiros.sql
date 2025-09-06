-- Adicionar coluna ativo na tabela parceiros
ALTER TABLE parceiros ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE NOT NULL;

-- Comentário na coluna
COMMENT ON COLUMN parceiros.ativo IS 'Status ativo/inativo do parceiro (sincronizado via SGP)';
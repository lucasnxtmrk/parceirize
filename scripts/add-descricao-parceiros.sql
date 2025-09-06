-- Adicionar coluna descrição na tabela parceiros
ALTER TABLE parceiros ADD COLUMN IF NOT EXISTS descricao TEXT;

-- Comentário na coluna
COMMENT ON COLUMN parceiros.descricao IS 'Descrição do negócio do parceiro';
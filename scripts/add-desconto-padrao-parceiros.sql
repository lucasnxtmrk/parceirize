-- Adicionar coluna desconto_padrao na tabela parceiros
-- Esta coluna permitirá que cada parceiro tenha um desconto padrão aplicado aos produtos sem desconto específico

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='parceiros' AND column_name='desconto_padrao'
  ) THEN
    ALTER TABLE parceiros ADD COLUMN desconto_padrao DECIMAL(5,2) DEFAULT 0.00;
  END IF;
END $$;

-- Comentário na coluna
COMMENT ON COLUMN parceiros.desconto_padrao IS 'Desconto padrão aplicado aos produtos deste parceiro quando o produto não possui desconto específico (percentual)';

-- Adicionar constraint para garantir que o desconto seja entre 0 e 100
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name='check_parceiros_desconto_padrao'
  ) THEN
    ALTER TABLE parceiros ADD CONSTRAINT check_parceiros_desconto_padrao
    CHECK (desconto_padrao >= 0 AND desconto_padrao <= 100);
  END IF;
END $$;

SELECT 'Coluna desconto_padrao adicionada à tabela parceiros com sucesso!' as status;
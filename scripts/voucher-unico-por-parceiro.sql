-- Migração para garantir voucher único por parceiro
-- Criado em: 2025-01-19

-- ===============================
-- 1. ATUALIZAR ESTRUTURA DA TABELA VOUCHERS
-- ===============================

-- Adicionar colunas necessárias se não existirem
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='vouchers' AND column_name='titulo'
  ) THEN
    ALTER TABLE vouchers ADD COLUMN titulo VARCHAR(255);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='vouchers' AND column_name='tipo_desconto'
  ) THEN
    ALTER TABLE vouchers ADD COLUMN tipo_desconto VARCHAR(20) DEFAULT 'percentual' CHECK (tipo_desconto IN ('percentual', 'valor_fixo'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='vouchers' AND column_name='valor_desconto'
  ) THEN
    ALTER TABLE vouchers ADD COLUMN valor_desconto DECIMAL(10,2);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='vouchers' AND column_name='condicoes'
  ) THEN
    ALTER TABLE vouchers ADD COLUMN condicoes TEXT;
  END IF;
END $$;

-- ===============================
-- 2. REMOVER VOUCHERS DUPLICADOS (MANTER APENAS O MAIS RECENTE)
-- ===============================

-- Remover vouchers duplicados por parceiro, mantendo apenas o mais recente
DELETE FROM vouchers
WHERE id NOT IN (
    SELECT DISTINCT ON (parceiro_id) id
    FROM vouchers
    ORDER BY parceiro_id, data_criacao DESC
);

-- ===============================
-- 3. CRIAR CONSTRAINT UNIQUE PARA VOUCHER ÚNICO POR PARCEIRO
-- ===============================

-- Criar índice único para garantir apenas 1 voucher por parceiro
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_voucher_per_parceiro
ON vouchers(parceiro_id);

-- ===============================
-- 4. MIGRAR DADOS EXISTENTES
-- ===============================

-- Atualizar vouchers existentes com dados padrão
UPDATE vouchers
SET
  titulo = COALESCE(titulo, 'Desconto Exclusivo'),
  tipo_desconto = COALESCE(tipo_desconto, 'percentual'),
  valor_desconto = COALESCE(valor_desconto, desconto),
  condicoes = COALESCE(condicoes, 'Válido para compras no estabelecimento. Não cumulativo com outras promoções.')
WHERE titulo IS NULL OR valor_desconto IS NULL;

-- ===============================
-- 5. COMENTÁRIOS NAS NOVAS COLUNAS
-- ===============================

COMMENT ON COLUMN vouchers.titulo IS 'Título do voucher (ex: Desconto Exclusivo)';
COMMENT ON COLUMN vouchers.tipo_desconto IS 'Tipo do desconto: percentual ou valor_fixo';
COMMENT ON COLUMN vouchers.valor_desconto IS 'Valor do desconto (% ou R$)';
COMMENT ON COLUMN vouchers.condicoes IS 'Termos e condições de uso do voucher';

-- ===============================
-- 6. FUNÇÃO PARA VALIDAR VOUCHER ÚNICO
-- ===============================

CREATE OR REPLACE FUNCTION validate_unique_voucher_per_parceiro()
RETURNS TRIGGER AS $$
BEGIN
    -- Verificar se já existe voucher para este parceiro
    IF EXISTS (
        SELECT 1 FROM vouchers
        WHERE parceiro_id = NEW.parceiro_id
        AND id != COALESCE(NEW.id, 0)
    ) THEN
        RAISE EXCEPTION 'Cada parceiro pode ter apenas um voucher. Edite o voucher existente.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ===============================
-- 7. TRIGGER PARA VALIDAR VOUCHER ÚNICO
-- ===============================

DROP TRIGGER IF EXISTS trigger_validate_unique_voucher ON vouchers;

CREATE TRIGGER trigger_validate_unique_voucher
    BEFORE INSERT OR UPDATE ON vouchers
    FOR EACH ROW
    EXECUTE FUNCTION validate_unique_voucher_per_parceiro();

-- ===============================
-- 8. LOG DA MIGRAÇÃO
-- ===============================

INSERT INTO tenant_logs (tenant_id, acao, detalhes, created_at)
VALUES (
  NULL,
  'Migração voucher único por parceiro executada',
  '{"migration": "voucher-unico-por-parceiro", "constraint": "idx_unique_voucher_per_parceiro", "trigger": "validate_unique_voucher_per_parceiro"}',
  NOW()
);

-- Finalizar migração
SELECT 'Migração voucher único por parceiro concluída com sucesso!' as status;
-- Adicionar colunas necessárias à tabela planos se não existirem

-- Adicionar coluna descricao
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='planos' AND column_name='descricao'
  ) THEN
    ALTER TABLE planos ADD COLUMN descricao TEXT NULL;
  END IF;
END $$;

-- Adicionar coluna recursos (JSON)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='planos' AND column_name='recursos'
  ) THEN
    ALTER TABLE planos ADD COLUMN recursos JSONB NULL;
  END IF;
END $$;

-- Adicionar coluna updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='planos' AND column_name='updated_at'
  ) THEN
    ALTER TABLE planos ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
  END IF;
END $$;

-- Atualizar planos existentes com descrições e recursos padrão
UPDATE planos SET 
  descricao = CASE 
    WHEN nome = 'Básico' THEN 'Plano ideal para pequenos negócios que estão começando'
    WHEN nome = 'Profissional' THEN 'Plano completo para empresas em crescimento'
    WHEN nome = 'Enterprise' THEN 'Solução empresarial com recursos ilimitados'
    ELSE 'Plano personalizado'
  END,
  recursos = CASE 
    WHEN nome = 'Básico' THEN '["Dashboard básico", "Suporte por email", "Relatórios mensais"]'::jsonb
    WHEN nome = 'Profissional' THEN '["Dashboard avançado", "API completa", "Suporte prioritário", "Relatórios personalizados", "Integração SGP"]'::jsonb
    WHEN nome = 'Enterprise' THEN '["Recursos ilimitados", "Suporte 24/7", "API completa", "Relatórios avançados", "Múltiplas integrações", "Customizações"]'::jsonb
    ELSE '["Recursos básicos"]'::jsonb
  END,
  updated_at = NOW()
WHERE descricao IS NULL OR recursos IS NULL;

-- Verificar se existe a tabela voucher_utilizacoes, caso contrário usar campo utilizado
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name='voucher_utilizacoes'
  ) THEN
    -- Se não existe a tabela voucher_utilizacoes, vamos garantir que existe a coluna utilizado em vouchers
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name='vouchers' AND column_name='utilizado'
    ) THEN
      ALTER TABLE vouchers ADD COLUMN utilizado BOOLEAN DEFAULT FALSE;
    END IF;
  END IF;
END $$;

-- Adicionar campos de timestamp em provedores se não existirem
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='provedores' AND column_name='data_vencimento'
  ) THEN
    ALTER TABLE provedores ADD COLUMN data_vencimento DATE NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='provedores' AND column_name='created_at'
  ) THEN
    ALTER TABLE provedores ADD COLUMN created_at TIMESTAMP DEFAULT NOW();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='provedores' AND column_name='updated_at'
  ) THEN
    ALTER TABLE provedores ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
  END IF;
END $$;

-- Atualizar created_at para registros existentes que não têm essa informação
UPDATE provedores SET created_at = NOW() WHERE created_at IS NULL;
UPDATE provedores SET updated_at = NOW() WHERE updated_at IS NULL;
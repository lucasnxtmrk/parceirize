-- ===============================
-- MIGRAÇÃO: OTIMIZAÇÃO INTEGRAÇÃO SGP
-- ===============================
-- Adiciona campos para otimizar importação e sincronização de clientes do SGP

-- 1. ADICIONAR NOVOS CAMPOS NA TABELA CLIENTES
DO $$
BEGIN
  -- CPF/CNPJ do cliente
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='clientes' AND column_name='cpf_cnpj'
  ) THEN
    ALTER TABLE clientes ADD COLUMN cpf_cnpj VARCHAR(20);
  END IF;

  -- ID do cliente no SGP
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='clientes' AND column_name='sgp_id'
  ) THEN
    ALTER TABLE clientes ADD COLUMN sgp_id INTEGER;
  END IF;

  -- Data do último contrato ativo no SGP
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='clientes' AND column_name='ultimo_contrato_ativo'
  ) THEN
    ALTER TABLE clientes ADD COLUMN ultimo_contrato_ativo DATE;
  END IF;

  -- Última atividade registrada no SGP
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='clientes' AND column_name='data_ultima_atividade'
  ) THEN
    ALTER TABLE clientes ADD COLUMN data_ultima_atividade TIMESTAMP;
  END IF;

  -- Dados completos do SGP em formato JSON
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='clientes' AND column_name='sgp_dados'
  ) THEN
    ALTER TABLE clientes ADD COLUMN sgp_dados JSONB;
  END IF;

  -- Flag para indicar se veio do SGP
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='clientes' AND column_name='origem_sgp'
  ) THEN
    ALTER TABLE clientes ADD COLUMN origem_sgp BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- 2. CRIAR ÍNDICES PARA OTIMIZAÇÃO
CREATE INDEX IF NOT EXISTS idx_clientes_cpf_cnpj ON clientes(cpf_cnpj);
CREATE INDEX IF NOT EXISTS idx_clientes_sgp_id ON clientes(sgp_id);
CREATE INDEX IF NOT EXISTS idx_clientes_origem_sgp ON clientes(origem_sgp);
CREATE INDEX IF NOT EXISTS idx_clientes_ultimo_contrato_ativo ON clientes(ultimo_contrato_ativo);
CREATE INDEX IF NOT EXISTS idx_clientes_data_ultima_atividade ON clientes(data_ultima_atividade);

-- 3. ADICIONAR CAMPOS À TABELA INTEGRACOES
DO $$
BEGIN
  -- Filtros de importação
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='integracoes' AND column_name='filtros_importacao'
  ) THEN
    ALTER TABLE integracoes ADD COLUMN filtros_importacao JSONB DEFAULT '{}';
  END IF;

  -- Estatísticas da última importação
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='integracoes' AND column_name='stats_ultima_importacao'
  ) THEN
    ALTER TABLE integracoes ADD COLUMN stats_ultima_importacao JSONB;
  END IF;

  -- Data da última importação completa
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='integracoes' AND column_name='ultima_importacao_completa'
  ) THEN
    ALTER TABLE integracoes ADD COLUMN ultima_importacao_completa TIMESTAMP;
  END IF;
END $$;

-- 4. ADICIONAR CONSTRAINTS DE VALIDAÇÃO
DO $$
BEGIN
  -- Validar formato CPF/CNPJ
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name='check_clientes_cpf_cnpj_format'
  ) THEN
    ALTER TABLE clientes ADD CONSTRAINT check_clientes_cpf_cnpj_format
    CHECK (cpf_cnpj IS NULL OR cpf_cnpj ~ '^[0-9]{3}\.?[0-9]{3}\.?[0-9]{3}-?[0-9]{2}$|^[0-9]{2}\.?[0-9]{3}\.?[0-9]{3}/?[0-9]{4}-?[0-9]{2}$');
  END IF;

  -- SGP ID deve ser único quando não nulo
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name='uq_clientes_sgp_id'
  ) THEN
    ALTER TABLE clientes ADD CONSTRAINT uq_clientes_sgp_id UNIQUE (sgp_id, tenant_id);
  END IF;
END $$;

-- 5. COMENTÁRIOS NAS COLUNAS
COMMENT ON COLUMN clientes.cpf_cnpj IS 'CPF ou CNPJ do cliente conforme registrado no SGP';
COMMENT ON COLUMN clientes.sgp_id IS 'ID único do cliente no sistema SGP';
COMMENT ON COLUMN clientes.ultimo_contrato_ativo IS 'Data do último contrato ativo no SGP';
COMMENT ON COLUMN clientes.data_ultima_atividade IS 'Timestamp da última atividade registrada no SGP';
COMMENT ON COLUMN clientes.sgp_dados IS 'Dados completos do cliente no SGP em formato JSON';
COMMENT ON COLUMN clientes.origem_sgp IS 'Indica se o cliente foi importado do SGP';

COMMENT ON COLUMN integracoes.filtros_importacao IS 'Configurações de filtros para importação SGP';
COMMENT ON COLUMN integracoes.stats_ultima_importacao IS 'Estatísticas da última importação realizada';
COMMENT ON COLUMN integracoes.ultima_importacao_completa IS 'Data/hora da última importação completa';

-- 6. ATUALIZAR REGISTROS EXISTENTES
-- Marcar clientes existentes que vieram de integração SGP
UPDATE clientes
SET origem_sgp = TRUE
WHERE email LIKE '%@sgp.local' OR
      (SELECT COUNT(*) FROM integracoes WHERE tipo = 'SGP') > 0;

-- Finalização
SELECT 'Migração SGP Optimization concluída com sucesso!' as resultado;
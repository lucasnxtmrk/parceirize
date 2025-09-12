-- Migração para adicionar campos de localização às tabelas clientes, parceiros e provedores
-- Criado em: 2025-01-10

-- ===============================
-- 1. ADICIONAR CAMPOS À TABELA CLIENTES
-- ===============================

DO $$
BEGIN
  -- Adicionar CEP
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='clientes' AND column_name='cep'
  ) THEN
    ALTER TABLE clientes ADD COLUMN cep VARCHAR(10);
  END IF;

  -- Adicionar cidade
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='clientes' AND column_name='cidade'
  ) THEN
    ALTER TABLE clientes ADD COLUMN cidade VARCHAR(100);
  END IF;

  -- Adicionar estado
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='clientes' AND column_name='estado'
  ) THEN
    ALTER TABLE clientes ADD COLUMN estado VARCHAR(2);
  END IF;

  -- Adicionar latitude
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='clientes' AND column_name='latitude'
  ) THEN
    ALTER TABLE clientes ADD COLUMN latitude DECIMAL(10, 8);
  END IF;

  -- Adicionar longitude
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='clientes' AND column_name='longitude'
  ) THEN
    ALTER TABLE clientes ADD COLUMN longitude DECIMAL(11, 8);
  END IF;

  -- Adicionar endereço completo
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='clientes' AND column_name='endereco'
  ) THEN
    ALTER TABLE clientes ADD COLUMN endereco TEXT;
  END IF;
END $$;

-- ===============================
-- 2. ADICIONAR CAMPOS À TABELA PARCEIROS
-- ===============================

DO $$
BEGIN
  -- Adicionar CEP
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='parceiros' AND column_name='cep'
  ) THEN
    ALTER TABLE parceiros ADD COLUMN cep VARCHAR(10);
  END IF;

  -- Adicionar cidade
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='parceiros' AND column_name='cidade'
  ) THEN
    ALTER TABLE parceiros ADD COLUMN cidade VARCHAR(100);
  END IF;

  -- Adicionar estado
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='parceiros' AND column_name='estado'
  ) THEN
    ALTER TABLE parceiros ADD COLUMN estado VARCHAR(2);
  END IF;

  -- Adicionar latitude
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='parceiros' AND column_name='latitude'
  ) THEN
    ALTER TABLE parceiros ADD COLUMN latitude DECIMAL(10, 8);
  END IF;

  -- Adicionar longitude
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='parceiros' AND column_name='longitude'
  ) THEN
    ALTER TABLE parceiros ADD COLUMN longitude DECIMAL(11, 8);
  END IF;

  -- Adicionar endereço completo
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='parceiros' AND column_name='endereco'
  ) THEN
    ALTER TABLE parceiros ADD COLUMN endereco TEXT;
  END IF;
END $$;

-- ===============================
-- 3. ADICIONAR CAMPOS À TABELA PROVEDORES
-- ===============================

DO $$
BEGIN
  -- Adicionar CEP
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='provedores' AND column_name='cep'
  ) THEN
    ALTER TABLE provedores ADD COLUMN cep VARCHAR(10);
  END IF;

  -- Adicionar cidade
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='provedores' AND column_name='cidade'
  ) THEN
    ALTER TABLE provedores ADD COLUMN cidade VARCHAR(100);
  END IF;

  -- Adicionar estado
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='provedores' AND column_name='estado'
  ) THEN
    ALTER TABLE provedores ADD COLUMN estado VARCHAR(2);
  END IF;

  -- Adicionar latitude
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='provedores' AND column_name='latitude'
  ) THEN
    ALTER TABLE provedores ADD COLUMN latitude DECIMAL(10, 8);
  END IF;

  -- Adicionar longitude
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='provedores' AND column_name='longitude'
  ) THEN
    ALTER TABLE provedores ADD COLUMN longitude DECIMAL(11, 8);
  END IF;

  -- Adicionar endereço completo
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='provedores' AND column_name='endereco'
  ) THEN
    ALTER TABLE provedores ADD COLUMN endereco TEXT;
  END IF;
END $$;

-- ===============================
-- 4. CRIAR ÍNDICES PARA PERFORMANCE
-- ===============================

-- Índices para busca por localização em clientes
CREATE INDEX IF NOT EXISTS idx_clientes_cep ON clientes(cep);
CREATE INDEX IF NOT EXISTS idx_clientes_cidade_estado ON clientes(cidade, estado);
CREATE INDEX IF NOT EXISTS idx_clientes_coords ON clientes(latitude, longitude);

-- Índices para busca por localização em parceiros
CREATE INDEX IF NOT EXISTS idx_parceiros_cep ON parceiros(cep);
CREATE INDEX IF NOT EXISTS idx_parceiros_cidade_estado ON parceiros(cidade, estado);
CREATE INDEX IF NOT EXISTS idx_parceiros_coords ON parceiros(latitude, longitude);

-- Índices para busca por localização em provedores
CREATE INDEX IF NOT EXISTS idx_provedores_cep ON provedores(cep);
CREATE INDEX IF NOT EXISTS idx_provedores_cidade_estado ON provedores(cidade, estado);
CREATE INDEX IF NOT EXISTS idx_provedores_coords ON provedores(latitude, longitude);

-- ===============================
-- 5. COMENTÁRIOS NAS COLUNAS
-- ===============================

COMMENT ON COLUMN clientes.cep IS 'CEP do cliente (formato: 00000-000)';
COMMENT ON COLUMN clientes.cidade IS 'Cidade do cliente';
COMMENT ON COLUMN clientes.estado IS 'Estado do cliente (sigla UF)';
COMMENT ON COLUMN clientes.latitude IS 'Latitude do endereço do cliente';
COMMENT ON COLUMN clientes.longitude IS 'Longitude do endereço do cliente';
COMMENT ON COLUMN clientes.endereco IS 'Endereço completo do cliente';

COMMENT ON COLUMN parceiros.cep IS 'CEP do estabelecimento parceiro (formato: 00000-000)';
COMMENT ON COLUMN parceiros.cidade IS 'Cidade do estabelecimento parceiro';
COMMENT ON COLUMN parceiros.estado IS 'Estado do estabelecimento parceiro (sigla UF)';
COMMENT ON COLUMN parceiros.latitude IS 'Latitude do endereço do parceiro';
COMMENT ON COLUMN parceiros.longitude IS 'Longitude do endereço do parceiro';
COMMENT ON COLUMN parceiros.endereco IS 'Endereço completo do parceiro';

COMMENT ON COLUMN provedores.cep IS 'CEP da sede do provedor (formato: 00000-000)';
COMMENT ON COLUMN provedores.cidade IS 'Cidade da sede do provedor';
COMMENT ON COLUMN provedores.estado IS 'Estado da sede do provedor (sigla UF)';
COMMENT ON COLUMN provedores.latitude IS 'Latitude do endereço do provedor';
COMMENT ON COLUMN provedores.longitude IS 'Longitude do endereço do provedor';
COMMENT ON COLUMN provedores.endereco IS 'Endereço completo do provedor';

-- ===============================
-- 6. VALIDAÇÕES (CONSTRAINTS)
-- ===============================

-- Validar formato de CEP (apenas dígitos, 8 caracteres)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name='check_clientes_cep_format'
  ) THEN
    ALTER TABLE clientes ADD CONSTRAINT check_clientes_cep_format 
    CHECK (cep IS NULL OR cep ~ '^[0-9]{5}-?[0-9]{3}$');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name='check_parceiros_cep_format'
  ) THEN
    ALTER TABLE parceiros ADD CONSTRAINT check_parceiros_cep_format 
    CHECK (cep IS NULL OR cep ~ '^[0-9]{5}-?[0-9]{3}$');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name='check_provedores_cep_format'
  ) THEN
    ALTER TABLE provedores ADD CONSTRAINT check_provedores_cep_format 
    CHECK (cep IS NULL OR cep ~ '^[0-9]{5}-?[0-9]{3}$');
  END IF;
END $$;

-- Validar códigos de estado (UF)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name='check_clientes_estado_valid'
  ) THEN
    ALTER TABLE clientes ADD CONSTRAINT check_clientes_estado_valid 
    CHECK (estado IS NULL OR estado IN (
      'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
      'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
    ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name='check_parceiros_estado_valid'
  ) THEN
    ALTER TABLE parceiros ADD CONSTRAINT check_parceiros_estado_valid 
    CHECK (estado IS NULL OR estado IN (
      'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
      'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
    ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name='check_provedores_estado_valid'
  ) THEN
    ALTER TABLE provedores ADD CONSTRAINT check_provedores_estado_valid 
    CHECK (estado IS NULL OR estado IN (
      'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
      'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
    ));
  END IF;
END $$;

-- ===============================
-- 7. LOG DA MIGRAÇÃO
-- ===============================

INSERT INTO tenant_logs (tenant_id, acao, detalhes, created_at)
VALUES (
  NULL,
  'Migração de localização executada',
  '{"migration": "add-location-fields", "tables": ["clientes", "parceiros", "provedores"], "fields": ["cep", "cidade", "estado", "latitude", "longitude", "endereco"]}',
  NOW()
);

-- Finalizar migração
SELECT 'Migração de campos de localização concluída com sucesso!' as status;
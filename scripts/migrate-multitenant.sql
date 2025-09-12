-- ========================================
-- MIGRAÇÃO PARA ARQUITETURA MULTI-TENANT
-- ========================================

-- 1. CRIAR TABELA DE PLANOS
CREATE TABLE IF NOT EXISTS planos (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(50) NOT NULL,
  preco DECIMAL(10,2) NOT NULL,
  limite_clientes INT NULL, -- NULL = ilimitado
  limite_parceiros INT NULL, -- NULL = ilimitado  
  limite_vouchers INT NULL, -- NULL = ilimitado
  limite_produtos INT NULL, -- NULL = ilimitado
  tem_subdominio BOOLEAN DEFAULT FALSE,
  tem_api BOOLEAN DEFAULT FALSE,
  tem_export BOOLEAN DEFAULT FALSE,
  integracoes_sgp INT DEFAULT 1,
  suporte_tipo VARCHAR(20) DEFAULT 'email',
  historico_meses INT DEFAULT 6,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Inserir planos padrão (verificando se já existem)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM planos WHERE nome = 'Básico') THEN
    INSERT INTO planos (nome, preco, limite_clientes, limite_parceiros, limite_vouchers, limite_produtos, tem_subdominio, tem_api, tem_export, integracoes_sgp, suporte_tipo, historico_meses)
    VALUES ('Básico', 297.00, 500, 10, 100, 50, false, false, false, 1, 'email', 6);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM planos WHERE nome = 'Profissional') THEN
    INSERT INTO planos (nome, preco, limite_clientes, limite_parceiros, limite_vouchers, limite_produtos, tem_subdominio, tem_api, tem_export, integracoes_sgp, suporte_tipo, historico_meses)
    VALUES ('Profissional', 597.00, 2000, 50, 500, 200, true, true, true, 3, 'prioritario', 12);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM planos WHERE nome = 'Enterprise') THEN
    INSERT INTO planos (nome, preco, limite_clientes, limite_parceiros, limite_vouchers, limite_produtos, tem_subdominio, tem_api, tem_export, integracoes_sgp, suporte_tipo, historico_meses)
    VALUES ('Enterprise', 1197.00, NULL, NULL, NULL, NULL, true, true, true, NULL, 'telefone', NULL);
  END IF;
END $$;

-- 2. CRIAR TABELA DE SUPERADMINS
CREATE TABLE IF NOT EXISTS superadmins (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  senha TEXT NOT NULL,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. CRIAR TABELA DE PROVEDORES (ex-admins)
CREATE TABLE IF NOT EXISTS provedores (
  id SERIAL PRIMARY KEY,
  tenant_id UUID DEFAULT gen_random_uuid() UNIQUE,
  nome_empresa VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  senha TEXT NOT NULL,
  subdominio VARCHAR(50) UNIQUE NULL, -- empresa.parceirize.com
  plano_id INT REFERENCES planos(id) DEFAULT 1,
  ativo BOOLEAN DEFAULT TRUE,
  data_vencimento DATE NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_provedores_tenant_id ON provedores(tenant_id);
CREATE INDEX IF NOT EXISTS idx_provedores_subdominio ON provedores(subdominio);

-- 4. MIGRAR ADMINS ATUAIS PARA PROVEDORES
INSERT INTO provedores (nome_empresa, email, senha, plano_id, ativo)
SELECT 
  'Empresa Principal' as nome_empresa,
  email,
  senha,
  2 as plano_id, -- Plano Profissional
  true as ativo
FROM admins
WHERE NOT EXISTS (
  SELECT 1 FROM provedores WHERE provedores.email = admins.email
);

-- 5. ADICIONAR TENANT_ID EM TODAS AS TABELAS EXISTENTES

-- Clientes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='clientes' AND column_name='tenant_id'
  ) THEN
    ALTER TABLE clientes ADD COLUMN tenant_id UUID;
  END IF;
END $$;

-- Parceiros
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='parceiros' AND column_name='tenant_id'
  ) THEN
    ALTER TABLE parceiros ADD COLUMN tenant_id UUID;
  END IF;
END $$;

-- Vouchers (se existir a tabela)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='vouchers') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name='vouchers' AND column_name='tenant_id'
    ) THEN
      ALTER TABLE vouchers ADD COLUMN tenant_id UUID;
    END IF;
  END IF;
END $$;

-- Produtos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='produtos' AND column_name='tenant_id'
  ) THEN
    ALTER TABLE produtos ADD COLUMN tenant_id UUID;
  END IF;
END $$;

-- Pedidos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='pedidos' AND column_name='tenant_id'
  ) THEN
    ALTER TABLE pedidos ADD COLUMN tenant_id UUID;
  END IF;
END $$;

-- Integrações
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='integracoes' AND column_name='tenant_id'
  ) THEN
    ALTER TABLE integracoes ADD COLUMN tenant_id UUID;
  END IF;
END $$;

-- 6. POPULAR TENANT_ID PARA DADOS EXISTENTES
-- (Assumindo que todos os dados atuais pertencem ao primeiro provedor)
UPDATE clientes SET tenant_id = (SELECT tenant_id FROM provedores LIMIT 1) WHERE tenant_id IS NULL;
UPDATE parceiros SET tenant_id = (SELECT tenant_id FROM provedores LIMIT 1) WHERE tenant_id IS NULL;
UPDATE produtos SET tenant_id = (SELECT tenant_id FROM provedores LIMIT 1) WHERE tenant_id IS NULL;
UPDATE pedidos SET tenant_id = (SELECT tenant_id FROM provedores LIMIT 1) WHERE tenant_id IS NULL;
UPDATE integracoes SET tenant_id = (SELECT tenant_id FROM provedores LIMIT 1) WHERE tenant_id IS NULL;

-- Atualizar vouchers se existir
UPDATE vouchers SET tenant_id = (SELECT tenant_id FROM provedores LIMIT 1) WHERE tenant_id IS NULL AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='vouchers');

-- 7. ADICIONAR FOREIGN KEYS PARA TENANT_ID
ALTER TABLE clientes ADD CONSTRAINT fk_clientes_tenant FOREIGN KEY (tenant_id) REFERENCES provedores(tenant_id);
ALTER TABLE parceiros ADD CONSTRAINT fk_parceiros_tenant FOREIGN KEY (tenant_id) REFERENCES provedores(tenant_id);
ALTER TABLE produtos ADD CONSTRAINT fk_produtos_tenant FOREIGN KEY (tenant_id) REFERENCES provedores(tenant_id);
ALTER TABLE pedidos ADD CONSTRAINT fk_pedidos_tenant FOREIGN KEY (tenant_id) REFERENCES provedores(tenant_id);
ALTER TABLE integracoes ADD CONSTRAINT fk_integracoes_tenant FOREIGN KEY (tenant_id) REFERENCES provedores(tenant_id);

-- 8. CRIAR ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_clientes_tenant ON clientes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_parceiros_tenant ON parceiros(tenant_id);
CREATE INDEX IF NOT EXISTS idx_produtos_tenant ON produtos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_tenant ON pedidos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_integracoes_tenant ON integracoes(tenant_id);

-- 9. CRIAR TABELA DE LOG DE AÇÕES (AUDITORIA)
CREATE TABLE IF NOT EXISTS tenant_logs (
  id SERIAL PRIMARY KEY,
  tenant_id UUID REFERENCES provedores(tenant_id),
  usuario_tipo VARCHAR(20), -- 'superadmin', 'provedor', 'parceiro', 'cliente'
  usuario_id INT,
  acao VARCHAR(100),
  detalhes JSONB,
  ip_address INET,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_logs_tenant ON tenant_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_logs_created ON tenant_logs(created_at);

-- 10. CRIAR VIEW PARA ESTATÍSTICAS POR TENANT
CREATE OR REPLACE VIEW tenant_stats AS
SELECT 
  p.tenant_id,
  p.nome_empresa,
  p.plano_id,
  pl.nome as plano_nome,
  COUNT(DISTINCT c.id) as total_clientes,
  COUNT(DISTINCT pa.id) as total_parceiros,
  COUNT(DISTINCT pr.id) as total_produtos,
  COUNT(DISTINCT pe.id) as total_pedidos,
  p.ativo,
  p.data_vencimento
FROM provedores p
LEFT JOIN planos pl ON p.plano_id = pl.id
LEFT JOIN clientes c ON p.tenant_id = c.tenant_id
LEFT JOIN parceiros pa ON p.tenant_id = pa.tenant_id  
LEFT JOIN produtos pr ON p.tenant_id = pr.tenant_id
LEFT JOIN pedidos pe ON p.tenant_id = pe.tenant_id
GROUP BY p.tenant_id, p.nome_empresa, p.plano_id, pl.nome, p.ativo, p.data_vencimento;

-- 11. INSERIR SUPERADMIN PADRÃO (será feito manualmente após migração)

COMMENT ON TABLE provedores IS 'Provedores (ex-admins) - cada um é um tenant isolado';
COMMENT ON COLUMN provedores.tenant_id IS 'UUID único para isolamento de dados';
COMMENT ON TABLE superadmins IS 'Administradores da NEXTMARK - gerenciam todos os tenants';
COMMENT ON TABLE planos IS 'Planos de assinatura com limitações específicas';
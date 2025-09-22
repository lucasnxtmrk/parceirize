-- =========================================================
-- SCRIPT DE MIGRAÇÃO PARA CORRIGIR FALHAS DE SEGURANÇA
-- =========================================================

-- 1. CRIAR ÍNDICES ÚNICOS PARA EMAIL GLOBAL
-- =========================================================

-- Primeiro, vamos verificar se há emails duplicados
SELECT 'CLIENTES' as tabela, email, COUNT(*) as total
FROM clientes
GROUP BY email
HAVING COUNT(*) > 1

UNION ALL

SELECT 'PARCEIROS' as tabela, email, COUNT(*) as total
FROM parceiros
GROUP BY email
HAVING COUNT(*) > 1

UNION ALL

SELECT 'PROVEDORES' as tabela, email, COUNT(*) as total
FROM provedores
GROUP BY email
HAVING COUNT(*) > 1

UNION ALL

SELECT 'SUPERADMINS' as tabela, email, COUNT(*) as total
FROM superadmins
GROUP BY email
HAVING COUNT(*) > 1;

-- 2. ADICIONAR TENANT_ID ONDE ESTÁ FALTANDO
-- =========================================================

-- Produtos precisam de tenant_id para isolamento
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='produtos' AND column_name='tenant_id'
  ) THEN
    ALTER TABLE produtos ADD COLUMN tenant_id INT;

    -- Popular tenant_id baseado no parceiro
    UPDATE produtos SET tenant_id = p.tenant_id
    FROM parceiros p
    WHERE produtos.parceiro_id = p.id;

    -- Adicionar constraint NOT NULL após popular
    ALTER TABLE produtos ALTER COLUMN tenant_id SET NOT NULL;
  END IF;
END $$;

-- Carrinho precisa de tenant_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='carrinho' AND column_name='tenant_id'
  ) THEN
    ALTER TABLE carrinho ADD COLUMN tenant_id INT;

    -- Popular tenant_id baseado no cliente
    UPDATE carrinho SET tenant_id = c.tenant_id
    FROM clientes c
    WHERE carrinho.cliente_id = c.id;

    ALTER TABLE carrinho ALTER COLUMN tenant_id SET NOT NULL;
  END IF;
END $$;

-- Pedidos precisam de tenant_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='pedidos' AND column_name='tenant_id'
  ) THEN
    ALTER TABLE pedidos ADD COLUMN tenant_id INT;

    -- Popular tenant_id baseado no cliente
    UPDATE pedidos SET tenant_id = c.tenant_id
    FROM clientes c
    WHERE pedidos.cliente_id = c.id;

    ALTER TABLE pedidos ALTER COLUMN tenant_id SET NOT NULL;
  END IF;
END $$;

-- Vouchers precisam de tenant_id (se ainda não tiver)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='vouchers' AND column_name='tenant_id'
  ) THEN
    ALTER TABLE vouchers ADD COLUMN tenant_id INT;

    -- Popular tenant_id baseado no parceiro
    UPDATE vouchers SET tenant_id = p.tenant_id
    FROM parceiros p
    WHERE vouchers.parceiro_id = p.id;

    ALTER TABLE vouchers ALTER COLUMN tenant_id SET NOT NULL;
  END IF;
END $$;

-- 3. CRIAR TABELA DE LOGS DE AUDITORIA SEGURA
-- =========================================================

CREATE TABLE IF NOT EXISTS tenant_logs (
  id SERIAL PRIMARY KEY,
  tenant_id INT,  -- NULL para ações de superadmin
  usuario_tipo VARCHAR(20) NOT NULL CHECK (usuario_tipo IN ('superadmin', 'provedor', 'parceiro', 'cliente')),
  usuario_id INT NOT NULL,
  acao VARCHAR(100) NOT NULL,
  detalhes JSONB,
  ip_address INET,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance nos logs
CREATE INDEX IF NOT EXISTS idx_tenant_logs_tenant ON tenant_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_logs_usuario ON tenant_logs(usuario_id, usuario_tipo);
CREATE INDEX IF NOT EXISTS idx_tenant_logs_acao ON tenant_logs(acao);
CREATE INDEX IF NOT EXISTS idx_tenant_logs_data ON tenant_logs(created_at DESC);

-- 4. ADICIONAR FOREIGN KEYS AUSENTES
-- =========================================================

-- FK para produtos -> parceiros
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_produtos_parceiro'
  ) THEN
    ALTER TABLE produtos
    ADD CONSTRAINT fk_produtos_parceiro
    FOREIGN KEY (parceiro_id) REFERENCES parceiros(id) ON DELETE CASCADE;
  END IF;
END $$;

-- FK para vouchers -> parceiros
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_vouchers_parceiro'
  ) THEN
    ALTER TABLE vouchers
    ADD CONSTRAINT fk_vouchers_parceiro
    FOREIGN KEY (parceiro_id) REFERENCES parceiros(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 5. ÍNDICES PARA PERFORMANCE E SEGURANÇA
-- =========================================================

-- Índices para consultas de autenticação
CREATE INDEX IF NOT EXISTS idx_clientes_email_ativo ON clientes(email, ativo) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_parceiros_email ON parceiros(email);
CREATE INDEX IF NOT EXISTS idx_provedores_email_ativo ON provedores(email, ativo) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_superadmins_email_ativo ON superadmins(email, ativo) WHERE ativo = true;

-- Índices para isolamento multi-tenant
CREATE INDEX IF NOT EXISTS idx_clientes_tenant ON clientes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_parceiros_tenant ON parceiros(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_tenant ON vouchers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_produtos_tenant ON produtos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_carrinho_tenant ON carrinho(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_tenant ON pedidos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_voucher_utilizados_tenant ON voucher_utilizados(tenant_id);

-- Índices compostos para queries frequentes
CREATE INDEX IF NOT EXISTS idx_vouchers_parceiro_tenant ON vouchers(parceiro_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_produtos_parceiro_tenant ON produtos(parceiro_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_carrinho_cliente_tenant ON carrinho(cliente_id, tenant_id);

-- 6. CONSTRAINTS DE SEGURANÇA
-- =========================================================

-- Garantir que emails não tenham caracteres perigosos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'chk_clientes_email_format'
  ) THEN
    ALTER TABLE clientes
    ADD CONSTRAINT chk_clientes_email_format
    CHECK (email ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'chk_parceiros_email_format'
  ) THEN
    ALTER TABLE parceiros
    ADD CONSTRAINT chk_parceiros_email_format
    CHECK (email ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
  END IF;
END $$;

-- Constraint para descontos válidos (0-100%)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'chk_vouchers_desconto_range'
  ) THEN
    ALTER TABLE vouchers
    ADD CONSTRAINT chk_vouchers_desconto_range
    CHECK (desconto >= 0 AND desconto <= 100);
  END IF;
END $$;

-- Constraint para preços válidos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'chk_produtos_preco_positivo'
  ) THEN
    ALTER TABLE produtos
    ADD CONSTRAINT chk_produtos_preco_positivo
    CHECK (preco >= 0);
  END IF;
END $$;

-- 7. CONFIGURAÇÕES DE SEGURANÇA DO POSTGRESQL
-- =========================================================

-- Revogar permissões públicas desnecessárias
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO PUBLIC;

-- Criar função para verificar integridade multi-tenant
CREATE OR REPLACE FUNCTION check_tenant_integrity()
RETURNS TABLE(tabela TEXT, problema TEXT, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT 'clientes'::TEXT, 'sem tenant_id'::TEXT, COUNT(*)
  FROM clientes WHERE tenant_id IS NULL
  UNION ALL
  SELECT 'parceiros'::TEXT, 'sem tenant_id'::TEXT, COUNT(*)
  FROM parceiros WHERE tenant_id IS NULL
  UNION ALL
  SELECT 'vouchers'::TEXT, 'sem tenant_id'::TEXT, COUNT(*)
  FROM vouchers WHERE tenant_id IS NULL
  UNION ALL
  SELECT 'produtos'::TEXT, 'sem tenant_id'::TEXT, COUNT(*)
  FROM produtos WHERE tenant_id IS NULL
  UNION ALL
  SELECT 'vouchers'::TEXT, 'tenant_id inconsistente'::TEXT, COUNT(*)
  FROM vouchers v
  INNER JOIN parceiros p ON v.parceiro_id = p.id
  WHERE v.tenant_id != p.tenant_id;
END;
$$ LANGUAGE plpgsql;

-- 8. COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =========================================================

COMMENT ON TABLE tenant_logs IS 'Log de auditoria multi-tenant com dados sanitizados';
COMMENT ON COLUMN tenant_logs.detalhes IS 'Detalhes da ação sem dados sensíveis';
COMMENT ON COLUMN clientes.tenant_id IS 'ID do provedor para isolamento multi-tenant';
COMMENT ON COLUMN parceiros.tenant_id IS 'ID do provedor para isolamento multi-tenant';
COMMENT ON COLUMN vouchers.tenant_id IS 'ID do provedor para isolamento multi-tenant';
COMMENT ON COLUMN produtos.tenant_id IS 'ID do provedor para isolamento multi-tenant';

-- 9. FINALIZAÇÃO
-- =========================================================

-- Executar verificação de integridade
SELECT * FROM check_tenant_integrity() WHERE count > 0;

-- Mostrar estatísticas finais
SELECT
  'Tabelas com tenant_id' as tipo,
  COUNT(*) as total
FROM information_schema.columns
WHERE column_name = 'tenant_id'

UNION ALL

SELECT
  'Índices criados' as tipo,
  COUNT(*) as total
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%';

COMMIT;
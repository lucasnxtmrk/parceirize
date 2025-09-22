-- ========================================
-- MELHORIAS DE TENANT ISOLATION
-- ========================================

-- 1. Adicionar tenant_id na tabela voucher_utilizados se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='voucher_utilizados' AND column_name='tenant_id'
  ) THEN
    ALTER TABLE voucher_utilizados ADD COLUMN tenant_id UUID;
  END IF;
END $$;

-- 2. Popular tenant_id na tabela voucher_utilizados baseado no voucher
UPDATE voucher_utilizados vu
SET tenant_id = v.tenant_id
FROM vouchers v
WHERE vu.voucher_id = v.id AND vu.tenant_id IS NULL;

-- 3. Adicionar foreign key para tenant_id na voucher_utilizados
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_voucher_utilizados_tenant'
  ) THEN
    ALTER TABLE voucher_utilizados
    ADD CONSTRAINT fk_voucher_utilizados_tenant
    FOREIGN KEY (tenant_id) REFERENCES provedores(tenant_id);
  END IF;
END $$;

-- 4. Criar índice para performance com tenant_id
CREATE INDEX IF NOT EXISTS idx_voucher_utilizados_tenant ON voucher_utilizados(tenant_id);
CREATE INDEX IF NOT EXISTS idx_voucher_utilizados_tenant_cliente ON voucher_utilizados(tenant_id, cliente_id);
CREATE INDEX IF NOT EXISTS idx_voucher_utilizados_tenant_voucher ON voucher_utilizados(tenant_id, voucher_id);

-- 5. Adicionar tenant_id na tabela produtos se não existir (já deve existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='produtos' AND column_name='tenant_id'
  ) THEN
    ALTER TABLE produtos ADD COLUMN tenant_id UUID;
    -- Popular tenant_id baseado no parceiro
    UPDATE produtos pr
    SET tenant_id = pa.tenant_id
    FROM parceiros pa
    WHERE pr.parceiro_id = pa.id AND pr.tenant_id IS NULL;
  END IF;
END $$;

-- 6. Adicionar tenant_id na tabela carrinho se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='carrinho' AND column_name='tenant_id'
  ) THEN
    ALTER TABLE carrinho ADD COLUMN tenant_id UUID;
    -- Popular tenant_id baseado no cliente
    UPDATE carrinho c
    SET tenant_id = cl.tenant_id
    FROM clientes cl
    WHERE c.cliente_id = cl.id AND c.tenant_id IS NULL;
  END IF;
END $$;

-- 7. Adicionar tenant_id na tabela pedido_itens se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='pedido_itens' AND column_name='tenant_id'
  ) THEN
    ALTER TABLE pedido_itens ADD COLUMN tenant_id UUID;
    -- Popular tenant_id baseado no pedido
    UPDATE pedido_itens pi
    SET tenant_id = pe.tenant_id
    FROM pedidos pe
    WHERE pi.pedido_id = pe.id AND pi.tenant_id IS NULL;
  END IF;
END $$;

-- 8. Índices adicionais para performance multi-tenant
CREATE INDEX IF NOT EXISTS idx_produtos_tenant_parceiro ON produtos(tenant_id, parceiro_id);
CREATE INDEX IF NOT EXISTS idx_carrinho_tenant_cliente ON carrinho(tenant_id, cliente_id);
CREATE INDEX IF NOT EXISTS idx_pedido_itens_tenant ON pedido_itens(tenant_id);

-- 9. View para estatísticas por tenant (melhorada)
CREATE OR REPLACE VIEW tenant_stats_detailed AS
SELECT
  p.tenant_id,
  p.id as provedor_id,
  p.nome_empresa,
  p.ativo as provedor_ativo,
  p.data_vencimento,
  pl.nome as plano_nome,
  pl.preco as plano_preco,

  -- Estatísticas de clientes
  COUNT(DISTINCT c.id) as total_clientes,
  COUNT(DISTINCT c.id) FILTER (WHERE c.ativo = true) as clientes_ativos,

  -- Estatísticas de parceiros
  COUNT(DISTINCT pa.id) as total_parceiros,
  COUNT(DISTINCT pa.id) FILTER (WHERE pa.ativo = true) as parceiros_ativos,

  -- Estatísticas de produtos
  COUNT(DISTINCT pr.id) as total_produtos,
  COUNT(DISTINCT pr.id) FILTER (WHERE pr.ativo = true) as produtos_ativos,

  -- Estatísticas de vouchers
  COUNT(DISTINCT v.id) as total_vouchers,
  COUNT(DISTINCT vu.id) as vouchers_utilizados,

  -- Estatísticas de pedidos
  COUNT(DISTINCT pe.id) as total_pedidos,
  COUNT(DISTINCT pe.id) FILTER (WHERE pe.status = 'validado') as pedidos_validados,
  COALESCE(SUM(DISTINCT pe.total), 0) as volume_vendas,

  -- Última atividade
  GREATEST(
    COALESCE(MAX(c.data_criacao), '1900-01-01'::timestamp),
    COALESCE(MAX(pa.data_criacao), '1900-01-01'::timestamp),
    COALESCE(MAX(pe.created_at), '1900-01-01'::timestamp),
    COALESCE(MAX(vu.data_utilizacao), '1900-01-01'::timestamp)
  ) as ultima_atividade

FROM provedores p
LEFT JOIN planos pl ON p.plano_id = pl.id
LEFT JOIN clientes c ON p.tenant_id = c.tenant_id
LEFT JOIN parceiros pa ON p.tenant_id = pa.tenant_id
LEFT JOIN produtos pr ON p.tenant_id = pr.tenant_id
LEFT JOIN vouchers v ON p.tenant_id = v.tenant_id
LEFT JOIN voucher_utilizados vu ON p.tenant_id = vu.tenant_id
LEFT JOIN pedidos pe ON p.tenant_id = pe.tenant_id
GROUP BY
  p.tenant_id, p.id, p.nome_empresa, p.ativo, p.data_vencimento,
  pl.nome, pl.preco;

-- 10. Função para validar isolamento de tenant em operações críticas
CREATE OR REPLACE FUNCTION validate_tenant_access(
  user_tenant_id UUID,
  resource_tenant_id UUID,
  user_role TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  -- SuperAdmin tem acesso a tudo
  IF user_role = 'superadmin' THEN
    RETURN TRUE;
  END IF;

  -- Outros usuários só acessam dados do próprio tenant
  IF user_tenant_id IS NULL OR resource_tenant_id IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN user_tenant_id = resource_tenant_id;
END;
$$ LANGUAGE plpgsql;

-- 11. Comentários para documentação
COMMENT ON VIEW tenant_stats_detailed IS 'Estatísticas detalhadas por tenant com isolamento de dados';
COMMENT ON FUNCTION validate_tenant_access IS 'Função para validar acesso baseado em tenant isolation';

-- 12. Criar trigger para garantir tenant_id em voucher_utilizados
CREATE OR REPLACE FUNCTION set_voucher_utilizados_tenant()
RETURNS TRIGGER AS $$
BEGIN
  -- Se tenant_id não foi fornecido, buscar do voucher
  IF NEW.tenant_id IS NULL THEN
    SELECT v.tenant_id INTO NEW.tenant_id
    FROM vouchers v
    WHERE v.id = NEW.voucher_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_voucher_utilizados_tenant ON voucher_utilizados;
CREATE TRIGGER trg_voucher_utilizados_tenant
  BEFORE INSERT ON voucher_utilizados
  FOR EACH ROW
  EXECUTE FUNCTION set_voucher_utilizados_tenant();

-- 13. Verificações finais de integridade
DO $$
DECLARE
  orphaned_records INTEGER;
BEGIN
  -- Verificar se há registros órfãos em voucher_utilizados
  SELECT COUNT(*) INTO orphaned_records
  FROM voucher_utilizados vu
  LEFT JOIN vouchers v ON vu.voucher_id = v.id
  WHERE v.id IS NULL;

  IF orphaned_records > 0 THEN
    RAISE NOTICE 'AVISO: % registros órfãos encontrados em voucher_utilizados', orphaned_records;
  END IF;

  -- Verificar se há registros sem tenant_id
  SELECT COUNT(*) INTO orphaned_records
  FROM voucher_utilizados
  WHERE tenant_id IS NULL;

  IF orphaned_records > 0 THEN
    RAISE NOTICE 'AVISO: % registros sem tenant_id em voucher_utilizados', orphaned_records;
  END IF;
END $$;
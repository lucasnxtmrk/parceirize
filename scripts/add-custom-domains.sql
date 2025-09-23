-- ========================================
-- MIGRAÇÃO PARA DOMÍNIOS PERSONALIZADOS
-- ========================================

-- 1. CRIAR TABELA DE DOMÍNIOS PERSONALIZADOS
CREATE TABLE IF NOT EXISTS dominios_personalizados (
  id SERIAL PRIMARY KEY,
  provedor_id INT NOT NULL REFERENCES provedores(id) ON DELETE CASCADE,
  dominio VARCHAR(255) UNIQUE NOT NULL,
  tipo VARCHAR(20) DEFAULT 'personalizado' CHECK (tipo IN ('subdominio', 'personalizado')),
  verificado BOOLEAN DEFAULT FALSE,
  verificacao_token VARCHAR(100),
  verificacao_metodo VARCHAR(20) DEFAULT 'dns_txt' CHECK (verificacao_metodo IN ('dns_txt', 'meta_tag')),
  ssl_status VARCHAR(20) DEFAULT 'pendente' CHECK (ssl_status IN ('pendente', 'ativo', 'expirado', 'erro')),
  ssl_expiracao DATE,
  ativo BOOLEAN DEFAULT TRUE,
  criado_em TIMESTAMP DEFAULT NOW(),
  verificado_em TIMESTAMP,
  ultimo_acesso TIMESTAMP,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- 2. CRIAR TABELA DE LOGS DE ACESSO POR DOMÍNIO
CREATE TABLE IF NOT EXISTS acessos_dominio (
  id SERIAL PRIMARY KEY,
  dominio_id INT REFERENCES dominios_personalizados(id) ON DELETE CASCADE,
  provedor_id INT REFERENCES provedores(id) ON DELETE CASCADE,
  ip_address INET,
  user_agent TEXT,
  path VARCHAR(500),
  metodo VARCHAR(10),
  status_code INT,
  tempo_resposta_ms INT,
  user_id INT, -- Pode referenciar qualquer tabela de usuário
  user_tipo VARCHAR(20), -- 'cliente', 'parceiro', 'provedor'
  criado_em TIMESTAMP DEFAULT NOW()
);

-- 3. CRIAR ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_dominios_dominio ON dominios_personalizados(dominio);
CREATE INDEX IF NOT EXISTS idx_dominios_provedor ON dominios_personalizados(provedor_id);
CREATE INDEX IF NOT EXISTS idx_dominios_verificado ON dominios_personalizados(verificado);
CREATE INDEX IF NOT EXISTS idx_dominios_ativo ON dominios_personalizados(ativo);
CREATE INDEX IF NOT EXISTS idx_dominios_tipo ON dominios_personalizados(tipo);

CREATE INDEX IF NOT EXISTS idx_acessos_dominio ON acessos_dominio(dominio_id);
CREATE INDEX IF NOT EXISTS idx_acessos_provedor ON acessos_dominio(provedor_id);
CREATE INDEX IF NOT EXISTS idx_acessos_criado ON acessos_dominio(criado_em);
CREATE INDEX IF NOT EXISTS idx_acessos_ip ON acessos_dominio(ip_address);

-- 4. ADICIONAR DOMÍNIO PERSONALIZADO À TABELA PROVEDORES (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='provedores' AND column_name='dominio_personalizado_principal'
  ) THEN
    ALTER TABLE provedores ADD COLUMN dominio_personalizado_principal VARCHAR(255);
  END IF;
END $$;

-- 5. MIGRAR SUBDOMÍNIOS EXISTENTES PARA A NOVA TABELA
INSERT INTO dominios_personalizados (provedor_id, dominio, tipo, verificado, ativo)
SELECT
  id as provedor_id,
  subdominio || '.parceirize.com' as dominio,
  'subdominio' as tipo,
  true as verificado,
  ativo
FROM provedores
WHERE subdominio IS NOT NULL
  AND subdominio != ''
  AND NOT EXISTS (
    SELECT 1 FROM dominios_personalizados
    WHERE dominio = provedores.subdominio || '.parceirize.com'
  );

-- 6. CRIAR FUNÇÃO PARA BUSCAR PROVEDOR POR DOMÍNIO
CREATE OR REPLACE FUNCTION buscar_provedor_por_dominio(domain_name VARCHAR)
RETURNS TABLE(
  provedor_id INT,
  tenant_id UUID,
  nome_empresa VARCHAR,
  email VARCHAR,
  dominio VARCHAR,
  tipo VARCHAR,
  verificado BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.tenant_id,
    p.nome_empresa,
    p.email,
    dp.dominio,
    dp.tipo,
    dp.verificado
  FROM provedores p
  INNER JOIN dominios_personalizados dp ON p.id = dp.provedor_id
  WHERE dp.dominio = domain_name
    AND dp.ativo = true
    AND dp.verificado = true
    AND p.ativo = true;
END;
$$ LANGUAGE plpgsql;

-- 7. CRIAR FUNÇÃO PARA GERAR TOKEN DE VERIFICAÇÃO
CREATE OR REPLACE FUNCTION gerar_token_verificacao()
RETURNS VARCHAR(100) AS $$
BEGIN
  -- Usar random() para compatibilidade com PostgreSQL mais antigo
  RETURN 'parceirize-verify-' || md5(random()::text || clock_timestamp()::text);
END;
$$ LANGUAGE plpgsql;

-- 8. CRIAR TRIGGER PARA ATUALIZAR ÚLTIMO ACESSO
CREATE OR REPLACE FUNCTION atualizar_ultimo_acesso()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE dominios_personalizados
  SET ultimo_acesso = NEW.criado_em
  WHERE id = NEW.dominio_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ultimo_acesso
  AFTER INSERT ON acessos_dominio
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_ultimo_acesso();

-- 9. CRIAR VIEW PARA ESTATÍSTICAS DE DOMÍNIO
CREATE OR REPLACE VIEW stats_dominios AS
SELECT
  dp.id,
  dp.dominio,
  dp.tipo,
  dp.verificado,
  p.nome_empresa,
  COUNT(ad.id) as total_acessos,
  COUNT(DISTINCT ad.ip_address) as ips_unicos,
  MAX(ad.criado_em) as ultimo_acesso_registrado,
  AVG(ad.tempo_resposta_ms) as tempo_resposta_medio
FROM dominios_personalizados dp
LEFT JOIN provedores p ON dp.provedor_id = p.id
LEFT JOIN acessos_dominio ad ON dp.id = ad.dominio_id
GROUP BY dp.id, dp.dominio, dp.tipo, dp.verificado, p.nome_empresa;

-- 10. INSERIR DADOS DE EXEMPLO PARA TESTE
DO $$
DECLARE
  provedor_teste_id INT;
BEGIN
  -- Buscar um provedor para teste
  SELECT id INTO provedor_teste_id FROM provedores LIMIT 1;

  IF provedor_teste_id IS NOT NULL THEN
    -- Inserir domínio de exemplo apenas se não existir
    INSERT INTO dominios_personalizados (
      provedor_id,
      dominio,
      tipo,
      verificado,
      verificacao_token,
      verificacao_metodo,
      ssl_status
    )
    SELECT
      provedor_teste_id,
      'exemplo.parceirize.com',
      'subdominio',
      true,
      gerar_token_verificacao(),
      'dns_txt',
      'ativo'
    WHERE NOT EXISTS (
      SELECT 1 FROM dominios_personalizados
      WHERE dominio = 'exemplo.parceirize.com'
    );
  END IF;
END $$;

-- 11. COMENTÁRIOS E DOCUMENTAÇÃO
COMMENT ON TABLE dominios_personalizados IS 'Armazena domínios (subdomínios e personalizados) para cada provedor';
COMMENT ON COLUMN dominios_personalizados.tipo IS 'subdominio: empresa.parceirize.com | personalizado: descontos.empresa.com.br';
COMMENT ON COLUMN dominios_personalizados.verificacao_metodo IS 'dns_txt: registro TXT no DNS | meta_tag: meta tag no HTML';
COMMENT ON COLUMN dominios_personalizados.ssl_status IS 'Status do certificado SSL';
COMMENT ON COLUMN dominios_personalizados.metadata IS 'Dados adicionais em JSON (config SSL, etc)';

COMMENT ON TABLE acessos_dominio IS 'Logs de acesso para monitoramento e analytics por domínio';
COMMENT ON FUNCTION buscar_provedor_por_dominio(VARCHAR) IS 'Busca provedor por domínio verificado e ativo';

-- 12. CONCEDER PERMISSÕES (se necessário)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON dominios_personalizados TO app_user;
-- GRANT SELECT, INSERT ON acessos_dominio TO app_user;
-- GRANT EXECUTE ON FUNCTION buscar_provedor_por_dominio(VARCHAR) TO app_user;

-- Finalização
SELECT 'Migração de domínios personalizados concluída com sucesso!' as resultado;
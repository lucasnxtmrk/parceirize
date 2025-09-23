-- Adicionar coluna subdominio na tabela provedores
-- Este script adiciona a funcionalidade de subdomínios dinâmicos

-- 1. Adicionar coluna subdominio
ALTER TABLE provedores
ADD COLUMN subdominio VARCHAR(50) UNIQUE;

-- 2. Criar índice para performance
CREATE INDEX idx_provedores_subdominio ON provedores(subdominio);

-- 3. Função para validar subdomínio
CREATE OR REPLACE FUNCTION validar_subdominio(sub_domain VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
  -- Verificar se é nulo ou vazio
  IF sub_domain IS NULL OR LENGTH(TRIM(sub_domain)) = 0 THEN
    RETURN FALSE;
  END IF;

  -- Converter para lowercase
  sub_domain := LOWER(TRIM(sub_domain));

  -- Verificar formato (apenas letras, números e hífen, não pode começar/terminar com hífen)
  IF sub_domain !~ '^[a-z0-9][a-z0-9-]{0,48}[a-z0-9]$' AND LENGTH(sub_domain) > 1 THEN
    RETURN FALSE;
  END IF;

  -- Para subdomínios de 1 caractere
  IF LENGTH(sub_domain) = 1 AND sub_domain !~ '^[a-z0-9]$' THEN
    RETURN FALSE;
  END IF;

  -- Verificar se já existe
  IF EXISTS (SELECT 1 FROM provedores WHERE LOWER(subdominio) = sub_domain) THEN
    RETURN FALSE;
  END IF;

  -- Verificar se já existe como domínio personalizado
  IF EXISTS (SELECT 1 FROM dominios_personalizados WHERE LOWER(dominio) = sub_domain || '.parceirize.com') THEN
    RETURN FALSE;
  END IF;

  -- Verificar domínios reservados
  IF sub_domain IN (
    'admin', 'api', 'www', 'app', 'cdn', 'static', 'mail', 'ftp', 'blog',
    'docs', 'help', 'support', 'portal', 'painel', 'dashboard', 'login',
    'auth', 'oauth', 'ssl', 'secure', 'test', 'dev', 'stage', 'prod'
  ) THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 4. Função para criar domínio automaticamente quando provedor é criado
CREATE OR REPLACE FUNCTION criar_dominio_automatico()
RETURNS TRIGGER AS $$
BEGIN
  -- Se tem subdomínio, criar entrada na tabela dominios_personalizados
  IF NEW.subdominio IS NOT NULL AND LENGTH(TRIM(NEW.subdominio)) > 0 THEN
    INSERT INTO dominios_personalizados (
      provedor_id,
      dominio,
      tipo,
      verificado,
      ativo,
      criado_em,
      verificado_em
    ) VALUES (
      NEW.id,
      LOWER(TRIM(NEW.subdominio)) || '.parceirize.com',
      'subdominio',
      true,  -- Subdomínios próprios são pré-verificados
      true,
      NOW(),
      NOW()
    );

    -- Log da criação
    RAISE NOTICE 'Domínio criado automaticamente: %.parceirize.com para provedor %',
      LOWER(TRIM(NEW.subdominio)), NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Trigger para criar domínio automaticamente
DROP TRIGGER IF EXISTS trigger_criar_dominio ON provedores;
CREATE TRIGGER trigger_criar_dominio
  AFTER INSERT ON provedores
  FOR EACH ROW
  EXECUTE FUNCTION criar_dominio_automatico();

-- 6. Função para atualizar domínio quando subdomínio muda
CREATE OR REPLACE FUNCTION atualizar_dominio_automatico()
RETURNS TRIGGER AS $$
BEGIN
  -- Se subdomínio mudou
  IF OLD.subdominio IS DISTINCT FROM NEW.subdominio THEN

    -- Desativar domínio antigo se existir
    IF OLD.subdominio IS NOT NULL THEN
      UPDATE dominios_personalizados
      SET ativo = false,
          atualizado_em = NOW()
      WHERE provedor_id = NEW.id
        AND dominio = LOWER(TRIM(OLD.subdominio)) || '.parceirize.com'
        AND tipo = 'subdominio';

      RAISE NOTICE 'Domínio antigo desativado: %.parceirize.com', LOWER(TRIM(OLD.subdominio));
    END IF;

    -- Criar novo domínio se novo subdomínio não for nulo
    IF NEW.subdominio IS NOT NULL AND LENGTH(TRIM(NEW.subdominio)) > 0 THEN
      INSERT INTO dominios_personalizados (
        provedor_id,
        dominio,
        tipo,
        verificado,
        ativo,
        criado_em,
        verificado_em
      ) VALUES (
        NEW.id,
        LOWER(TRIM(NEW.subdominio)) || '.parceirize.com',
        'subdominio',
        true,
        true,
        NOW(),
        NOW()
      );

      RAISE NOTICE 'Novo domínio criado: %.parceirize.com para provedor %',
        LOWER(TRIM(NEW.subdominio)), NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Trigger para atualizar domínio quando subdomínio muda
DROP TRIGGER IF EXISTS trigger_atualizar_dominio ON provedores;
CREATE TRIGGER trigger_atualizar_dominio
  AFTER UPDATE ON provedores
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_dominio_automatico();

-- 8. Função helper para buscar provedor por subdomínio
CREATE OR REPLACE FUNCTION buscar_provedor_por_subdominio(sub_domain VARCHAR)
RETURNS TABLE(
  provedor_id INTEGER,
  tenant_id VARCHAR,
  nome_empresa VARCHAR,
  email VARCHAR,
  subdominio VARCHAR,
  dominio VARCHAR,
  ativo BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id as provedor_id,
    p.tenant_id,
    p.nome_empresa,
    p.email,
    p.subdominio,
    dp.dominio,
    p.ativo
  FROM provedores p
  INNER JOIN dominios_personalizados dp ON p.id = dp.provedor_id
  WHERE LOWER(p.subdominio) = LOWER(sub_domain)
    AND dp.tipo = 'subdominio'
    AND dp.ativo = true
    AND dp.verificado = true
    AND p.ativo = true;
END;
$$ LANGUAGE plpgsql;

-- 9. Adicionar comentários nas tabelas
COMMENT ON COLUMN provedores.subdominio IS 'Subdomínio único do provedor (ex: "empresa" para empresa.parceirize.com)';
COMMENT ON FUNCTION validar_subdominio(VARCHAR) IS 'Valida se um subdomínio é válido e único no sistema';
COMMENT ON FUNCTION criar_dominio_automatico() IS 'Trigger function que cria domínio automaticamente quando provedor é inserido';
COMMENT ON FUNCTION atualizar_dominio_automatico() IS 'Trigger function que atualiza domínio quando subdomínio do provedor muda';
COMMENT ON FUNCTION buscar_provedor_por_subdominio(VARCHAR) IS 'Busca provedor por subdomínio de forma otimizada';

-- 10. Inserir alguns dados de teste (opcional)
-- UPDATE provedores SET subdominio = 'teste' WHERE id = 1;
-- UPDATE provedores SET subdominio = 'empresa1' WHERE id = 2;
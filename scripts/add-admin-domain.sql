-- Script para adicionar domínio admin como reservado no sistema
-- Este script configura o domínio admin.parceirize.com.br como domínio de superadmin

BEGIN;

-- 1. Criar/verificar provedor especial para sistema administrativo
INSERT INTO provedores (
  nome_empresa,
  email,
  senha,
  tenant_id,
  ativo,
  plano_id
)
VALUES (
  'Sistema Administrativo',
  'admin@parceirize.com.br',
  '$2b$10$disabled.hash.for.system.provider',
  gen_random_uuid(),
  true,
  1 -- Plano básico, ajustar conforme necessário
)
ON CONFLICT (email) DO UPDATE SET
  nome_empresa = EXCLUDED.nome_empresa,
  ativo = EXCLUDED.ativo
RETURNING id;

-- Obter ID do provedor administrativo
DO $$
DECLARE
  admin_provider_id INTEGER;
BEGIN
  SELECT id INTO admin_provider_id FROM provedores WHERE email = 'admin@parceirize.com.br';

  -- 2. Inserir domínio de superadmin na tabela de domínios personalizados
  INSERT INTO dominios_personalizados (
    provedor_id,
    dominio,
    tipo,
    verificado,
    verificado_em,
    ativo
  )
  VALUES (
    admin_provider_id,
    'admin.parceirize.com.br',
    'personalizado',
    true, -- Já verificado por padrão
    NOW(),
    true
  )
  ON CONFLICT (dominio) DO UPDATE SET
    tipo = EXCLUDED.tipo,
    verificado = EXCLUDED.verificado,
    verificado_em = EXCLUDED.verificado_em,
    ativo = EXCLUDED.ativo;
END;
$$;

-- 3. Inserir também as variações localhost para desenvolvimento
DO $$
DECLARE
  admin_provider_id INTEGER;
BEGIN
  SELECT id INTO admin_provider_id FROM provedores WHERE email = 'admin@parceirize.com.br';

  INSERT INTO dominios_personalizados (
    provedor_id,
    dominio,
    tipo,
    verificado,
    verificado_em,
    ativo
  )
  VALUES
  (
    admin_provider_id,
    'admin.localhost',
    'personalizado',
    true,
    NOW(),
    true
  ),
  (
    admin_provider_id,
    'admin.localhost:3000',
    'personalizado',
    true,
    NOW(),
    true
  )
  ON CONFLICT (dominio) DO UPDATE SET
    tipo = EXCLUDED.tipo,
    verificado = EXCLUDED.verificado,
    verificado_em = EXCLUDED.verificado_em,
    ativo = EXCLUDED.ativo;
END;
$$;

-- 4. Atualizar a função buscar_provedor_por_dominio para suportar domínios de superadmin
DROP FUNCTION IF EXISTS buscar_provedor_por_dominio(VARCHAR(255));

CREATE FUNCTION buscar_provedor_por_dominio(hostname_param VARCHAR(255))
RETURNS TABLE(
  provedor_id INTEGER,
  tenant_id UUID,
  nome_empresa VARCHAR(255),
  email VARCHAR(255),
  dominio VARCHAR(255),
  tipo VARCHAR(50),
  verificado BOOLEAN,
  isSuperadmin BOOLEAN
) AS $$
BEGIN
  -- Primeiro verificar se é domínio de superadmin (baseado no nome do domínio)
  RETURN QUERY
  SELECT
    NULL::INTEGER as provedor_id,
    NULL::UUID as tenant_id,
    'Administração do Sistema'::VARCHAR(255) as nome_empresa,
    'admin@parceirize.com.br'::VARCHAR(255) as email,
    dp.dominio,
    'superadmin'::VARCHAR(50) as tipo,
    dp.verificado,
    true as isSuperadmin
  FROM dominios_personalizados dp
  WHERE dp.dominio = hostname_param
    AND (
      dp.dominio LIKE 'admin.%'
      OR dp.dominio = 'admin.localhost'
      OR dp.dominio = 'admin.localhost:3000'
    )
    AND dp.ativo = true
    AND dp.verificado = true;

  -- Se não encontrou domínio de superadmin, buscar provedores normais
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT
      p.id as provedor_id,
      p.tenant_id,
      p.nome_empresa,
      p.email,
      dp.dominio,
      dp.tipo,
      dp.verificado,
      false as isSuperadmin
    FROM dominios_personalizados dp
    INNER JOIN provedores p ON dp.provedor_id = p.id
    WHERE dp.dominio = hostname_param
      AND dp.ativo = true
      AND dp.verificado = true
      AND p.ativo = true
      AND NOT (
        dp.dominio LIKE 'admin.%'
        OR dp.dominio = 'admin.localhost'
        OR dp.dominio = 'admin.localhost:3000'
      );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 5. Verificar se existe pelo menos um superadmin no sistema
DO $$
DECLARE
  superadmin_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO superadmin_count FROM superadmins WHERE ativo = true;

  IF superadmin_count = 0 THEN
    RAISE NOTICE 'AVISO: Nenhum superadmin encontrado no sistema!';
    RAISE NOTICE 'Considere criar um superadmin antes de usar o domínio admin.';
    RAISE NOTICE 'Exemplo: INSERT INTO superadmins (nome, email, senha, ativo) VALUES (''Admin'', ''admin@parceirize.com.br'', ''$2b$10$hash'', true);';
  ELSE
    RAISE NOTICE 'Sistema configurado com % superadmin(s) ativo(s)', superadmin_count;
  END IF;
END;
$$;

COMMIT;

-- 6. Exibir status da configuração
SELECT
  'Configuração dos domínios administrativos:' as status;

SELECT
  dominio,
  tipo,
  verificado,
  ativo
FROM dominios_personalizados
WHERE dominio LIKE 'admin.%' OR dominio = 'admin.localhost' OR dominio = 'admin.localhost:3000'
ORDER BY dominio;
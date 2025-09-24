-- Corrigir função com nomes corretos de colunas da tabela dominios_personalizados

CREATE OR REPLACE FUNCTION atualizar_dominio_automatico()
RETURNS TRIGGER AS $$
DECLARE
  novo_dominio VARCHAR;
  dominio_exists INTEGER;
BEGIN
  -- Se subdomínio mudou
  IF OLD.subdominio IS DISTINCT FROM NEW.subdominio THEN

    -- Desativar domínio antigo se existir
    IF OLD.subdominio IS NOT NULL THEN
      UPDATE dominios_personalizados
      SET ativo = false
      WHERE provedor_id = NEW.id
        AND dominio = LOWER(TRIM(OLD.subdominio)) || '.parceirize.com.br'
        AND tipo = 'subdominio';

      RAISE NOTICE 'Domínio antigo desativado: %.parceirize.com.br', LOWER(TRIM(OLD.subdominio));
    END IF;

    -- Criar novo domínio se novo subdomínio não for nulo
    IF NEW.subdominio IS NOT NULL AND LENGTH(TRIM(NEW.subdominio)) > 0 THEN
      novo_dominio := LOWER(TRIM(NEW.subdominio)) || '.parceirize.com.br';

      -- Verificar se o domínio já existe
      SELECT COUNT(*) INTO dominio_exists
      FROM dominios_personalizados
      WHERE dominio = novo_dominio;

      IF dominio_exists = 0 THEN
        -- Domínio não existe, pode criar
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
          novo_dominio,
          'subdominio',
          true,
          true,
          NOW(),
          NOW()
        );

        RAISE NOTICE 'Novo domínio criado: % para provedor %', novo_dominio, NEW.id;
      ELSE
        -- Domínio já existe, apenas reativar se necessário e transferir para novo provedor
        UPDATE dominios_personalizados
        SET ativo = true,
            provedor_id = NEW.id
        WHERE dominio = novo_dominio;

        RAISE NOTICE 'Domínio existente reativado: % para provedor %', novo_dominio, NEW.id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Também vamos corrigir a função de criação para evitar problemas similares
CREATE OR REPLACE FUNCTION criar_dominio_automatico()
RETURNS TRIGGER AS $$
DECLARE
  novo_dominio VARCHAR;
  dominio_exists INTEGER;
BEGIN
  -- Só criar domínio se subdomínio foi fornecido
  IF NEW.subdominio IS NOT NULL AND LENGTH(TRIM(NEW.subdominio)) > 0 THEN
    novo_dominio := LOWER(TRIM(NEW.subdominio)) || '.parceirize.com.br';

    -- Verificar se o domínio já existe
    SELECT COUNT(*) INTO dominio_exists
    FROM dominios_personalizados
    WHERE dominio = novo_dominio;

    IF dominio_exists = 0 THEN
      -- Domínio não existe, pode criar
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
        novo_dominio,
        'subdominio',
        true,
        true,
        NOW(),
        NOW()
      );

      RAISE NOTICE 'Domínio criado automaticamente: % para provedor %', novo_dominio, NEW.id;
    ELSE
      RAISE NOTICE 'Domínio % já existe, não foi criado novamente', novo_dominio;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
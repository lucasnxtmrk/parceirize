-- Migration para V2: SGP Admin + Sistema de Transformação Cliente → Parceiro
-- Execute este script após fazer backup do banco de dados

BEGIN;

-- 1. Adicionar campo tipo_cliente na tabela clientes
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS tipo_cliente VARCHAR(50) DEFAULT 'cliente' NOT NULL;

-- 2. Atualizar registros existentes
UPDATE clientes SET tipo_cliente = 'cliente' WHERE tipo_cliente IS NULL;

-- 3. Adicionar campo admin_id na tabela integracoes para suportar SGP no admin
ALTER TABLE integracoes ADD COLUMN IF NOT EXISTS admin_id INTEGER REFERENCES admins(id);

-- 4. Adicionar campo last_sync para controlar última sincronização
ALTER TABLE integracoes ADD COLUMN IF NOT EXISTS last_sync TIMESTAMP;

-- 5. Permitir parceiro_id ser nulo (para integrações do admin)
ALTER TABLE integracoes ALTER COLUMN parceiro_id DROP NOT NULL;

-- 6. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_clientes_tipo_cliente ON clientes(tipo_cliente);
CREATE INDEX IF NOT EXISTS idx_clientes_email_tipo ON clientes(email, tipo_cliente);
CREATE INDEX IF NOT EXISTS idx_integracoes_admin_id ON integracoes(admin_id);
CREATE INDEX IF NOT EXISTS idx_integracoes_tipo_admin ON integracoes(tipo, admin_id);

-- 7. Adicionar constraint para garantir que integracoes tenha OU admin_id OU parceiro_id
ALTER TABLE integracoes ADD CONSTRAINT check_integracoes_owner 
  CHECK ((admin_id IS NOT NULL AND parceiro_id IS NULL) OR (admin_id IS NULL AND parceiro_id IS NOT NULL));

-- 8. Comentários nas colunas para documentação
COMMENT ON COLUMN clientes.tipo_cliente IS 'Tipo do cliente: cliente (padrão) ou parceiro (transformado)';
COMMENT ON COLUMN integracoes.admin_id IS 'ID do admin (para integrações globais como SGP)';
COMMENT ON COLUMN integracoes.last_sync IS 'Timestamp da última sincronização automática';

COMMIT;

-- Verificações pós-migração
SELECT 
  'clientes' as tabela,
  COUNT(*) as total_registros,
  COUNT(*) FILTER (WHERE tipo_cliente = 'cliente') as total_clientes,
  COUNT(*) FILTER (WHERE tipo_cliente = 'parceiro') as total_parceiros_transformados
FROM clientes

UNION ALL

SELECT 
  'integracoes' as tabela,
  COUNT(*) as total_registros,
  COUNT(*) FILTER (WHERE admin_id IS NOT NULL) as integracoes_admin,
  COUNT(*) FILTER (WHERE parceiro_id IS NOT NULL) as integracoes_parceiro
FROM integracoes;
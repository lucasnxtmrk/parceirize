-- Migração para criar tabela de solicitações de vouchers
-- Criado em: 2025-01-19

-- ===============================
-- 1. CRIAR TABELA VOUCHER_SOLICITACOES
-- ===============================

CREATE TABLE IF NOT EXISTS voucher_solicitacoes (
  id SERIAL PRIMARY KEY,
  cliente_id INT NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  parceiro_id INT NOT NULL REFERENCES parceiros(id) ON DELETE CASCADE,
  voucher_id INT REFERENCES vouchers(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado', 'expirado', 'usado')),
  mensagem_cliente TEXT,
  resposta_parceiro TEXT,
  codigo_validacao VARCHAR(100) UNIQUE,
  data_solicitacao TIMESTAMP DEFAULT NOW(),
  data_resposta TIMESTAMP,
  data_expiracao TIMESTAMP,
  data_uso TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ===============================
-- 2. CRIAR ÍNDICES PARA PERFORMANCE
-- ===============================

-- Índice para consultas por cliente
CREATE INDEX IF NOT EXISTS idx_voucher_solicitacoes_cliente ON voucher_solicitacoes(cliente_id);

-- Índice para consultas por parceiro
CREATE INDEX IF NOT EXISTS idx_voucher_solicitacoes_parceiro ON voucher_solicitacoes(parceiro_id);

-- Índice para consultas por status
CREATE INDEX IF NOT EXISTS idx_voucher_solicitacoes_status ON voucher_solicitacoes(status);

-- Índice para consultas por código de validação
CREATE INDEX IF NOT EXISTS idx_voucher_solicitacoes_codigo ON voucher_solicitacoes(codigo_validacao);

-- Índice composto para evitar duplicatas de solicitações pendentes
CREATE INDEX IF NOT EXISTS idx_voucher_solicitacoes_unique_pendente
ON voucher_solicitacoes(cliente_id, parceiro_id, status)
WHERE status = 'pendente';

-- Índice para consultas por data
CREATE INDEX IF NOT EXISTS idx_voucher_solicitacoes_data ON voucher_solicitacoes(data_solicitacao);

-- ===============================
-- 3. COMENTÁRIOS NAS COLUNAS
-- ===============================

COMMENT ON TABLE voucher_solicitacoes IS 'Tabela de solicitações de vouchers feitas pelos clientes aos parceiros';

COMMENT ON COLUMN voucher_solicitacoes.cliente_id IS 'ID do cliente que solicitou o voucher';
COMMENT ON COLUMN voucher_solicitacoes.parceiro_id IS 'ID do parceiro que receberá a solicitação';
COMMENT ON COLUMN voucher_solicitacoes.voucher_id IS 'ID do voucher solicitado (pode ser NULL se voucher genérico)';
COMMENT ON COLUMN voucher_solicitacoes.status IS 'Status da solicitação: pendente, aprovado, rejeitado, expirado, usado';
COMMENT ON COLUMN voucher_solicitacoes.mensagem_cliente IS 'Mensagem opcional do cliente ao solicitar';
COMMENT ON COLUMN voucher_solicitacoes.resposta_parceiro IS 'Resposta do parceiro (motivo da aprovação/rejeição)';
COMMENT ON COLUMN voucher_solicitacoes.codigo_validacao IS 'Código único para validação do voucher (gerado quando aprovado)';
COMMENT ON COLUMN voucher_solicitacoes.data_solicitacao IS 'Data e hora da solicitação';
COMMENT ON COLUMN voucher_solicitacoes.data_resposta IS 'Data e hora da resposta do parceiro';
COMMENT ON COLUMN voucher_solicitacoes.data_expiracao IS 'Data de expiração do voucher aprovado';
COMMENT ON COLUMN voucher_solicitacoes.data_uso IS 'Data e hora em que o voucher foi usado';

-- ===============================
-- 4. FUNÇÃO PARA GERAR CÓDIGO DE VALIDAÇÃO
-- ===============================

CREATE OR REPLACE FUNCTION generate_voucher_code() RETURNS VARCHAR(100) AS $$
DECLARE
    codigo VARCHAR(100);
    existe BOOLEAN;
BEGIN
    LOOP
        -- Gerar código único: PARCEIRO-YYYYMMDD-XXXXX
        codigo := 'VCH-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
                 LPAD(FLOOR(RANDOM() * 99999)::TEXT, 5, '0');

        -- Verificar se já existe
        SELECT EXISTS(SELECT 1 FROM voucher_solicitacoes WHERE codigo_validacao = codigo) INTO existe;

        -- Se não existir, retornar o código
        IF NOT existe THEN
            RETURN codigo;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ===============================
-- 5. TRIGGER PARA ATUALIZAR updated_at
-- ===============================

CREATE OR REPLACE FUNCTION update_voucher_solicitacoes_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_voucher_solicitacoes_timestamp
    BEFORE UPDATE ON voucher_solicitacoes
    FOR EACH ROW
    EXECUTE FUNCTION update_voucher_solicitacoes_timestamp();

-- ===============================
-- 6. CONSTRAINT PARA EVITAR MÚLTIPLAS SOLICITAÇÕES PENDENTES
-- ===============================

-- Esta constraint garante que um cliente não pode ter múltiplas solicitações pendentes para o mesmo parceiro
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_pending_request
ON voucher_solicitacoes(cliente_id, parceiro_id)
WHERE status = 'pendente';

-- ===============================
-- 7. LOG DA MIGRAÇÃO
-- ===============================

INSERT INTO tenant_logs (tenant_id, acao, detalhes, created_at)
VALUES (
  NULL,
  'Migração de voucher_solicitacoes executada',
  '{"migration": "create-voucher-solicitacoes", "tables": ["voucher_solicitacoes"], "functions": ["generate_voucher_code"], "triggers": ["update_voucher_solicitacoes_timestamp"]}',
  NOW()
);

-- Finalizar migração
SELECT 'Tabela voucher_solicitacoes criada com sucesso!' as status;
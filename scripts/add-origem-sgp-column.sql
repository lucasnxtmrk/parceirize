-- Adicionar colunas relacionadas ao SGP na tabela clientes
ALTER TABLE clientes ADD COLUMN origem_sgp BOOLEAN DEFAULT FALSE;
ALTER TABLE clientes ADD COLUMN cpf_cnpj VARCHAR(20);
ALTER TABLE clientes ADD COLUMN sgp_id INTEGER;
ALTER TABLE clientes ADD COLUMN ultimo_contrato_ativo TIMESTAMP;
ALTER TABLE clientes ADD COLUMN data_ultima_atividade TIMESTAMP;
ALTER TABLE clientes ADD COLUMN sgp_dados JSONB DEFAULT '{}';

-- Adicionar índices para melhor performance
CREATE INDEX idx_clientes_origem_sgp ON clientes(origem_sgp);
CREATE INDEX idx_clientes_sgp_id ON clientes(sgp_id);
CREATE INDEX idx_clientes_cpf_cnpj ON clientes(cpf_cnpj);

-- Comentários para documentar
COMMENT ON COLUMN clientes.origem_sgp IS 'Indica se o cliente foi importado do SGP';
COMMENT ON COLUMN clientes.cpf_cnpj IS 'CPF ou CNPJ do cliente (importado do SGP)';
COMMENT ON COLUMN clientes.sgp_id IS 'ID do cliente no sistema SGP';
COMMENT ON COLUMN clientes.ultimo_contrato_ativo IS 'Data do último contrato ativo no SGP';
COMMENT ON COLUMN clientes.data_ultima_atividade IS 'Data da última atividade no SGP';
COMMENT ON COLUMN clientes.sgp_dados IS 'Dados completos do SGP (JSON)';
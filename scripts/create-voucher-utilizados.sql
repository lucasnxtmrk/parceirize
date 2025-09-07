-- Criar tabela voucher_utilizados se não existir
CREATE TABLE IF NOT EXISTS voucher_utilizados (
  id SERIAL PRIMARY KEY,
  cliente_id INT NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  voucher_id INT NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
  data_utilizacao TIMESTAMP DEFAULT NOW(),
  desconto DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_voucher_utilizados_cliente ON voucher_utilizados(cliente_id);
CREATE INDEX IF NOT EXISTS idx_voucher_utilizados_voucher ON voucher_utilizados(voucher_id);
CREATE INDEX IF NOT EXISTS idx_voucher_utilizados_data ON voucher_utilizados(data_utilizacao);

-- Adicionar constraint para evitar duplicação
ALTER TABLE voucher_utilizados 
  DROP CONSTRAINT IF EXISTS voucher_utilizados_unique;
  
-- Se quiser limitar uso por período, pode descomentar:
-- ALTER TABLE voucher_utilizados 
--   ADD CONSTRAINT voucher_utilizados_unique 
--   UNIQUE(cliente_id, voucher_id, data_utilizacao);
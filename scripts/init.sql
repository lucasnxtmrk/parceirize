-- Tabela de integrações com SGP
CREATE TABLE IF NOT EXISTS integracoes (
  id SERIAL PRIMARY KEY,
  parceiro_id INT REFERENCES parceiros(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL, -- 'SGP'
  subdominio TEXT NOT NULL,
  token TEXT NOT NULL,
  modo_ativacao VARCHAR(20) DEFAULT 'manual',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Garante unicidade por parceiro/tipo para facilitar upsert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'uq_integracoes_parceiro_tipo'
  ) THEN
    CREATE UNIQUE INDEX uq_integracoes_parceiro_tipo
      ON integracoes(parceiro_id, tipo);
  END IF;
END $$;

-- Adiciona coluna de ativo/inativo para clientes, se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='clientes' AND column_name='ativo'
  ) THEN
    ALTER TABLE clientes ADD COLUMN ativo BOOLEAN DEFAULT TRUE;
  END IF;
END $$;

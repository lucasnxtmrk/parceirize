-- Tabela de integrações com SGP
CREATE TABLE IF NOT EXISTS integracoes (
  id SERIAL PRIMARY KEY,
  parceiro_id INT REFERENCES parceiros(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL, -- 'SGP'
  subdominio TEXT NOT NULL,
  token TEXT NOT NULL,
  app_name TEXT NOT NULL,
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

-- Adiciona coluna app_name para integrações, se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='integracoes' AND column_name='app_name'
  ) THEN
    ALTER TABLE integracoes ADD COLUMN app_name TEXT DEFAULT 'parceirize';
  END IF;
END $$;

-- Adiciona colunas para autenticação CPF/CNPJ + Senha Central
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='integracoes' AND column_name='cpf_central'
  ) THEN
    ALTER TABLE integracoes ADD COLUMN cpf_central VARCHAR(20);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='integracoes' AND column_name='senha_central'
  ) THEN
    ALTER TABLE integracoes ADD COLUMN senha_central TEXT;
  END IF;
END $$;

-- Tabela de produtos dos parceiros
CREATE TABLE IF NOT EXISTS produtos (
  id SERIAL PRIMARY KEY,
  parceiro_id INT REFERENCES parceiros(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  preco DECIMAL(10,2) NOT NULL,
  ativo BOOLEAN DEFAULT TRUE,
  imagem_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de carrinho de compras
CREATE TABLE IF NOT EXISTS carrinho (
  id SERIAL PRIMARY KEY,
  cliente_id INT REFERENCES clientes(id) ON DELETE CASCADE,
  produto_id INT REFERENCES produtos(id) ON DELETE CASCADE,
  quantidade INT DEFAULT 1,
  preco_unitario DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(cliente_id, produto_id)
);

-- Tabela de pedidos
CREATE TABLE IF NOT EXISTS pedidos (
  id SERIAL PRIMARY KEY,
  cliente_id INT REFERENCES clientes(id) ON DELETE CASCADE,
  qr_code TEXT UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'pendente',
  total DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  validated_at TIMESTAMP NULL,
  validated_by INT NULL
);

-- Tabela de itens do pedido
CREATE TABLE IF NOT EXISTS pedido_itens (
  id SERIAL PRIMARY KEY,
  pedido_id INT REFERENCES pedidos(id) ON DELETE CASCADE,
  produto_id INT REFERENCES produtos(id) ON DELETE CASCADE,
  parceiro_id INT REFERENCES parceiros(id) ON DELETE CASCADE,
  quantidade INT NOT NULL,
  preco_unitario DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL
);

-- Adicionar colunas de validação nos itens do pedido
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='pedido_itens' AND column_name='validado_por'
  ) THEN
    ALTER TABLE pedido_itens ADD COLUMN validado_por INT REFERENCES parceiros(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='pedido_itens' AND column_name='validado_at'
  ) THEN
    ALTER TABLE pedido_itens ADD COLUMN validado_at TIMESTAMP NULL;
  END IF;
END $$;

-- Adiciona coluna de desconto nos produtos, se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='produtos' AND column_name='desconto'
  ) THEN
    ALTER TABLE produtos ADD COLUMN desconto DECIMAL(5,2) DEFAULT 0.00;
  END IF;
END $$;

-- Adiciona coluna de desconto aplicado no carrinho, se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='carrinho' AND column_name='desconto_aplicado'
  ) THEN
    ALTER TABLE carrinho ADD COLUMN desconto_aplicado DECIMAL(5,2) DEFAULT 0.00;
  END IF;
END $$;

-- Adiciona coluna de desconto aplicado nos itens do pedido, se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='pedido_itens' AND column_name='desconto_aplicado'
  ) THEN
    ALTER TABLE pedido_itens ADD COLUMN desconto_aplicado DECIMAL(5,2) DEFAULT 0.00;
  END IF;
END $$;

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_produtos_parceiro ON produtos(parceiro_id);
CREATE INDEX IF NOT EXISTS idx_carrinho_cliente ON carrinho(cliente_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente ON pedidos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_qr ON pedidos(qr_code);
CREATE INDEX IF NOT EXISTS idx_pedido_itens_pedido ON pedido_itens(pedido_id);
CREATE INDEX IF NOT EXISTS idx_pedido_itens_validacao ON pedido_itens(validado_por, validado_at);

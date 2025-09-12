-- Adicionar campos de customização visual para provedores
ALTER TABLE provedores 
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS cor_primaria TEXT DEFAULT '#0d6efd',
ADD COLUMN IF NOT EXISTS cor_secundaria TEXT DEFAULT '#6c757d';

-- Comentários para documentação
COMMENT ON COLUMN provedores.logo_url IS 'URL do logo personalizado do provedor';
COMMENT ON COLUMN provedores.cor_primaria IS 'Cor primária personalizada (hex)';
COMMENT ON COLUMN provedores.cor_secundaria IS 'Cor secundária personalizada (hex)';
-- Adicionar campo de filtro personalizado da logo
ALTER TABLE provedores 
ADD COLUMN IF NOT EXISTS filtro_logo TEXT DEFAULT 'none';

-- Comentário para documentação
COMMENT ON COLUMN provedores.filtro_logo IS 'Filtro CSS personalizado para a logo (brightness, invert, etc)';
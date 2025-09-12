-- Adicionar campos de customização específicos para o menu
ALTER TABLE provedores 
ADD COLUMN IF NOT EXISTS cor_fundo_menu TEXT DEFAULT '#f8f9fa',
ADD COLUMN IF NOT EXISTS cor_texto_menu TEXT DEFAULT '#495057',
ADD COLUMN IF NOT EXISTS cor_hover_menu TEXT;

-- Comentários para documentação
COMMENT ON COLUMN provedores.cor_fundo_menu IS 'Cor de fundo do menu lateral (hex)';
COMMENT ON COLUMN provedores.cor_texto_menu IS 'Cor do texto dos itens do menu (hex)';
COMMENT ON COLUMN provedores.cor_hover_menu IS 'Cor de hover dos itens do menu (hex)';
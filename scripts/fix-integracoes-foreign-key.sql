-- Fix foreign key constraint in integracoes table
-- This migration fixes the FK that points to non-existent 'admins' table

-- Step 1: Remove the old foreign key constraint
ALTER TABLE integracoes DROP CONSTRAINT IF EXISTS integracoes_admin_id_fkey;

-- Step 2: Check if admin_id column exists and rename it
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'integracoes' AND column_name = 'admin_id') THEN
        ALTER TABLE integracoes RENAME COLUMN admin_id TO provedor_id;
    END IF;
END
$$;

-- Step 3: Add provedor_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'integracoes' AND column_name = 'provedor_id') THEN
        ALTER TABLE integracoes ADD COLUMN provedor_id INTEGER;
    END IF;
END
$$;

-- Step 4: Add new foreign key constraint pointing to provedores table
ALTER TABLE integracoes ADD CONSTRAINT integracoes_provedor_id_fkey
  FOREIGN KEY (provedor_id) REFERENCES provedores(id) ON DELETE CASCADE;
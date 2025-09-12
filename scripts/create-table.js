// Script para criar nova tabela via código
import { db } from '../src/db/connection.js';
import { sql } from 'drizzle-orm';

async function createNewTable() {
  try {
    console.log('🏗️ Criando nova tabela...');
    
    // EXEMPLO: Tabela de Logs de Sistema
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS system_logs (
        id SERIAL PRIMARY KEY,
        level VARCHAR(20) NOT NULL DEFAULT 'info', -- 'debug', 'info', 'warn', 'error'
        message TEXT NOT NULL,
        context JSONB DEFAULT '{}',
        user_id INTEGER,
        tenant_id UUID REFERENCES provedores(tenant_id),
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        
        -- Índices para performance
        INDEX idx_system_logs_level (level),
        INDEX idx_system_logs_tenant (tenant_id),
        INDEX idx_system_logs_created (created_at)
      );
    `);
    
    console.log('✅ Tabela system_logs criada com sucesso!');
    
    // EXEMPLO: Tabela de Configurações
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS configuracoes (
        id SERIAL PRIMARY KEY,
        chave VARCHAR(100) NOT NULL,
        valor TEXT,
        tipo VARCHAR(20) DEFAULT 'string', -- 'string', 'number', 'boolean', 'json'
        descricao TEXT,
        tenant_id UUID REFERENCES provedores(tenant_id),
        criado_em TIMESTAMP DEFAULT NOW(),
        atualizado_em TIMESTAMP DEFAULT NOW(),
        
        -- Constraint única por tenant
        UNIQUE(chave, tenant_id),
        
        -- Índices
        INDEX idx_configuracoes_tenant (tenant_id),
        INDEX idx_configuracoes_chave (chave)
      );
    `);
    
    console.log('✅ Tabela configuracoes criada com sucesso!');
    
    // Inserir dados iniciais
    await db.execute(sql`
      INSERT INTO configuracoes (chave, valor, tipo, descricao, tenant_id) VALUES
      ('tema_cor_primaria', '#007bff', 'string', 'Cor primária do tema', NULL),
      ('limite_upload_mb', '10', 'number', 'Limite de upload em MB', NULL),
      ('notificacoes_email', 'true', 'boolean', 'Enviar notificações por email', NULL)
      ON CONFLICT DO NOTHING;
    `);
    
    console.log('✅ Dados iniciais inseridos!');
    
  } catch (error) {
    console.error('❌ Erro ao criar tabela:', error);
  } finally {
    process.exit(0);
  }
}

createNewTable();
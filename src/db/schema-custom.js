// SCHEMA PERSONALIZADO - Suas novas tabelas aqui
import { pgTable, serial, varchar, text, timestamp, boolean, integer, uuid, decimal } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Import do schema gerado para usar como referência
import { provedores, parceiros, clientes } from './migrations/schema.ts';

// 📊 EXEMPLO: Nova tabela de Relatórios
export const relatorios = pgTable('relatorios', {
  id: serial('id').primaryKey(),
  nome: varchar('nome', { length: 200 }).notNull(),
  tipo: varchar('tipo', { length: 50 }).notNull(), // 'vendas', 'clientes', 'parceiros'
  filtros: text('filtros'), // JSON com filtros aplicados
  dados: text('dados'), // JSON com dados do relatório
  gerado_por: varchar('gerado_por', { length: 100 }).notNull(),
  tenant_id: uuid('tenant_id').references(() => provedores.tenantId),
  criado_em: timestamp('criado_em').defaultNow(),
  atualizado_em: timestamp('atualizado_em').defaultNow(),
  ativo: boolean('ativo').default(true),
});

// 📋 EXEMPLO: Nova tabela de Categorias de Produto
export const categoriasProduto = pgTable('categorias_produto', {
  id: serial('id').primaryKey(),
  nome: varchar('nome', { length: 100 }).notNull(),
  descricao: text('descricao'),
  cor: varchar('cor', { length: 7 }).default('#000000'), // hex color
  icone: varchar('icone', { length: 50 }),
  tenant_id: uuid('tenant_id').references(() => provedores.tenantId),
  criado_em: timestamp('criado_em').defaultNow(),
  ativo: boolean('ativo').default(true),
});

// 📈 EXEMPLO: Nova tabela de Analytics
export const analytics = pgTable('analytics', {
  id: serial('id').primaryKey(),
  evento: varchar('evento', { length: 100 }).notNull(), // 'page_view', 'click', 'purchase'
  pagina: varchar('pagina', { length: 200 }),
  cliente_id: integer('cliente_id').references(() => clientes.id),
  parceiro_id: integer('parceiro_id').references(() => parceiros.id),
  dados_extras: text('dados_extras'), // JSON adicional
  ip_address: varchar('ip_address', { length: 45 }),
  user_agent: text('user_agent'),
  tenant_id: uuid('tenant_id').references(() => provedores.tenantId),
  criado_em: timestamp('criado_em').defaultNow(),
});

// 🔔 EXEMPLO: Nova tabela de Notificações
export const notificacoes = pgTable('notificacoes', {
  id: serial('id').primaryKey(),
  titulo: varchar('titulo', { length: 200 }).notNull(),
  mensagem: text('mensagem').notNull(),
  tipo: varchar('tipo', { length: 50 }).default('info'), // 'info', 'success', 'warning', 'error'
  destinatario_tipo: varchar('destinatario_tipo', { length: 20 }).notNull(), // 'cliente', 'parceiro', 'provedor'
  destinatario_id: integer('destinatario_id').notNull(),
  tenant_id: uuid('tenant_id').references(() => provedores.tenantId),
  lida: boolean('lida').default(false),
  criada_em: timestamp('criada_em').defaultNow(),
  lida_em: timestamp('lida_em'),
});

// 🔗 RELACIONAMENTOS
export const relatoriosRelations = relations(relatorios, ({ one }) => ({
  provedor: one(provedores, {
    fields: [relatorios.tenant_id],
    references: [provedores.tenantId],
  }),
}));

export const categoriasProdutoRelations = relations(categoriasProduto, ({ one }) => ({
  provedor: one(provedores, {
    fields: [categoriasProduto.tenant_id],
    references: [provedores.tenantId],
  }),
}));

export const analyticsRelations = relations(analytics, ({ one }) => ({
  provedor: one(provedores, {
    fields: [analytics.tenant_id],
    references: [provedores.tenantId],
  }),
  cliente: one(clientes, {
    fields: [analytics.cliente_id],
    references: [clientes.id],
  }),
  parceiro: one(parceiros, {
    fields: [analytics.parceiro_id],
    references: [parceiros.id],
  }),
}));

export const notificacoesRelations = relations(notificacoes, ({ one }) => ({
  provedor: one(provedores, {
    fields: [notificacoes.tenant_id],
    references: [provedores.tenantId],
  }),
}));
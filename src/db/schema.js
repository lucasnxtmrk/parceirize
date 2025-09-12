import { pgTable, text, integer, boolean, timestamp, uuid, decimal } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// 🏢 PLANOS
export const planos = pgTable('planos', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  nome: text('nome').notNull(), // 'Básico', 'Profissional', 'Enterprise'
  preco_mensal: decimal('preco_mensal', { precision: 10, scale: 2 }),
  limite_clientes: integer('limite_clientes'), // null = ilimitado
  limite_parceiros: integer('limite_parceiros'),
  limite_vouchers: integer('limite_vouchers'),
  limite_produtos: integer('limite_produtos'),
  ativo: boolean('ativo').default(true),
  criado_em: timestamp('criado_em').defaultNow(),
});

// 🏭 PROVEDORES (Multi-tenant)
export const provedores = pgTable('provedores', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  tenant_id: uuid('tenant_id').defaultRandom().unique().notNull(),
  nome_empresa: text('nome_empresa').notNull(),
  email: text('email').unique().notNull(),
  senha: text('senha').notNull(),
  plano_id: integer('plano_id').references(() => planos.id),
  ativo: boolean('ativo').default(true),
  data_criacao: timestamp('data_criacao').defaultNow(),
  // 🎨 Customização Visual
  logo_url: text('logo_url'),
  cor_primaria: text('cor_primaria').default('#0d6efd'), // Bootstrap primary
  cor_secundaria: text('cor_secundaria').default('#6c757d'), // Bootstrap secondary
});

// 👥 CLIENTES
export const clientes = pgTable('clientes', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  nome: text('nome').notNull(),
  sobrenome: text('sobrenome').notNull(),
  email: text('email').unique().notNull(),
  senha: text('senha').notNull(),
  id_carteirinha: text('id_carteirinha').unique().notNull(),
  tipo_cliente: text('tipo_cliente').default('cliente'), // 'cliente' ou 'parceiro'
  ativo: boolean('ativo').default(true),
  data_criacao: timestamp('data_criacao').defaultNow(),
  tenant_id: uuid('tenant_id').references(() => provedores.tenant_id), // Multi-tenant
});

// 🤝 PARCEIROS
export const parceiros = pgTable('parceiros', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  nome_empresa: text('nome_empresa').notNull(),
  email: text('email').unique().notNull(),
  senha: text('senha').notNull(),
  foto: text('foto').default('/assets/images/avatar.jpg'),
  nicho: text('nicho'), // Categoria/nicho do parceiro
  descricao: text('descricao'),
  ativo: boolean('ativo').default(true),
  data_criacao: timestamp('data_criacao').defaultNow(),
  tenant_id: uuid('tenant_id').references(() => provedores.tenant_id), // Multi-tenant
});

// 🎫 VOUCHERS
export const vouchers = pgTable('vouchers', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  parceiro_id: integer('parceiro_id').references(() => parceiros.id).notNull(),
  codigo: text('codigo').unique().notNull(),
  desconto: decimal('desconto', { precision: 5, scale: 2 }).notNull(),
  limite_uso: integer('limite_uso'), // null = ilimitado
  data_criacao: timestamp('data_criacao').defaultNow(),
  data_expiracao: timestamp('data_expiracao'),
});

// 📋 VOUCHERS UTILIZADOS
export const voucher_utilizados = pgTable('voucher_utilizados', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  voucher_id: integer('voucher_id').references(() => vouchers.id).notNull(),
  cliente_id: integer('cliente_id').references(() => clientes.id).notNull(),
  data_utilizacao: timestamp('data_utilizacao').defaultNow(),
  valor_original: decimal('valor_original', { precision: 10, scale: 2 }),
  valor_desconto: decimal('valor_desconto', { precision: 10, scale: 2 }),
  valor_final: decimal('valor_final', { precision: 10, scale: 2 }),
});

// 🛍️ PRODUTOS
export const produtos = pgTable('produtos', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  parceiro_id: integer('parceiro_id').references(() => parceiros.id).notNull(),
  nome: text('nome').notNull(),
  descricao: text('descricao'),
  preco: decimal('preco', { precision: 10, scale: 2 }).notNull(),
  desconto: decimal('desconto', { precision: 5, scale: 2 }).default('0'),
  ativo: boolean('ativo').default(true),
  imagem_url: text('imagem_url'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

// 🔗 RELATIONSHIPS (Para joins automáticos)
export const planosRelations = relations(planos, ({ many }) => ({
  provedores: many(provedores),
}));

export const provedoresRelations = relations(provedores, ({ one, many }) => ({
  plano: one(planos, {
    fields: [provedores.plano_id],
    references: [planos.id],
  }),
  clientes: many(clientes),
  parceiros: many(parceiros),
}));

export const clientesRelations = relations(clientes, ({ one, many }) => ({
  provedor: one(provedores, {
    fields: [clientes.tenant_id],
    references: [provedores.tenant_id],
  }),
  vouchers_utilizados: many(voucher_utilizados),
}));

export const parceirosRelations = relations(parceiros, ({ one, many }) => ({
  provedor: one(provedores, {
    fields: [parceiros.tenant_id],
    references: [provedores.tenant_id],
  }),
  vouchers: many(vouchers),
  produtos: many(produtos),
}));

export const vouchersRelations = relations(vouchers, ({ one, many }) => ({
  parceiro: one(parceiros, {
    fields: [vouchers.parceiro_id],
    references: [parceiros.id],
  }),
  utilizacoes: many(voucher_utilizados),
}));

export const voucherUtilizadosRelations = relations(voucher_utilizados, ({ one }) => ({
  voucher: one(vouchers, {
    fields: [voucher_utilizados.voucher_id],
    references: [vouchers.id],
  }),
  cliente: one(clientes, {
    fields: [voucher_utilizados.cliente_id],
    references: [clientes.id],
  }),
}));

export const produtosRelations = relations(produtos, ({ one }) => ({
  parceiro: one(parceiros, {
    fields: [produtos.parceiro_id],
    references: [parceiros.id],
  }),
}));
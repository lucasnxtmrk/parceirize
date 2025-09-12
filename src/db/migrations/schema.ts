import { pgTable, index, foreignKey, unique, serial, varchar, integer, timestamp, boolean, uuid, numeric, text, date, jsonb, inet, uniqueIndex, check, pgView, bigint } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const clientes = pgTable("clientes", {
	id: serial().primaryKey().notNull(),
	nome: varchar({ length: 100 }).notNull(),
	sobrenome: varchar({ length: 100 }).notNull(),
	email: varchar({ length: 150 }).notNull(),
	idCarteirinha: varchar("id_carteirinha", { length: 50 }).notNull(),
	senha: varchar({ length: 255 }).notNull(),
	vouchersDisponiveis: integer("vouchers_disponiveis").default(1),
	dataUltimoVoucher: timestamp("data_ultimo_voucher", { mode: 'string' }),
	dataCriacao: timestamp("data_criacao", { mode: 'string' }).defaultNow(),
	ativo: boolean().default(true),
	tipoCliente: varchar("tipo_cliente", { length: 50 }).default('cliente').notNull(),
	tenantId: uuid("tenant_id"),
}, (table) => [
	index("idx_clientes_email_tipo").using("btree", table.email.asc().nullsLast().op("text_ops"), table.tipoCliente.asc().nullsLast().op("text_ops")),
	index("idx_clientes_tenant").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	index("idx_clientes_tipo_cliente").using("btree", table.tipoCliente.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [provedores.tenantId],
			name: "fk_clientes_tenant"
		}),
	unique("clientes_email_key").on(table.email),
	unique("clientes_id_carteirinha_key").on(table.idCarteirinha),
]);

export const voucherUtilizados = pgTable("voucher_utilizados", {
	id: serial().primaryKey().notNull(),
	voucherId: integer("voucher_id").notNull(),
	clienteId: integer("cliente_id").notNull(),
	dataUtilizacao: timestamp("data_utilizacao", { mode: 'string' }).defaultNow().notNull(),
	desconto: integer().notNull(),
}, (table) => [
	index("idx_voucher_utilizados_cliente").using("btree", table.clienteId.asc().nullsLast().op("int4_ops")),
	index("idx_voucher_utilizados_data").using("btree", table.dataUtilizacao.asc().nullsLast().op("timestamp_ops")),
	index("idx_voucher_utilizados_voucher").using("btree", table.voucherId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.voucherId],
			foreignColumns: [vouchers.id],
			name: "voucher_utilizados_voucher_id_fkey"
		}),
	foreignKey({
			columns: [table.clienteId],
			foreignColumns: [clientes.id],
			name: "voucher_utilizados_cliente_id_fkey"
		}),
]);

export const pedidoItens = pgTable("pedido_itens", {
	id: serial().primaryKey().notNull(),
	pedidoId: integer("pedido_id"),
	produtoId: integer("produto_id"),
	parceiroId: integer("parceiro_id"),
	quantidade: integer().notNull(),
	precoUnitario: numeric("preco_unitario", { precision: 10, scale:  2 }).notNull(),
	subtotal: numeric({ precision: 10, scale:  2 }).notNull(),
	validadoPor: integer("validado_por"),
	validadoAt: timestamp("validado_at", { mode: 'string' }),
	descontoAplicado: numeric("desconto_aplicado", { precision: 5, scale:  2 }).default('0.00'),
}, (table) => [
	index("idx_pedido_itens_pedido").using("btree", table.pedidoId.asc().nullsLast().op("int4_ops")),
	index("idx_pedido_itens_validacao").using("btree", table.validadoPor.asc().nullsLast().op("int4_ops"), table.validadoAt.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.pedidoId],
			foreignColumns: [pedidos.id],
			name: "pedido_itens_pedido_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.produtoId],
			foreignColumns: [produtos.id],
			name: "pedido_itens_produto_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.parceiroId],
			foreignColumns: [parceiros.id],
			name: "pedido_itens_parceiro_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.validadoPor],
			foreignColumns: [parceiros.id],
			name: "pedido_itens_validado_por_fkey"
		}),
]);

export const parceiros = pgTable("parceiros", {
	id: serial().primaryKey().notNull(),
	nomeEmpresa: varchar("nome_empresa", { length: 150 }).notNull(),
	email: varchar({ length: 150 }).notNull(),
	foto: text(),
	dataCriacao: timestamp("data_criacao", { mode: 'string' }).defaultNow(),
	senha: varchar({ length: 255 }).default('12345678').notNull(),
	nicho: varchar({ length: 100 }).default('Geral').notNull(),
	descricao: text(),
	ativo: boolean().default(true).notNull(),
	tenantId: uuid("tenant_id"),
}, (table) => [
	index("idx_parceiros_tenant").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [provedores.tenantId],
			name: "fk_parceiros_tenant"
		}),
	unique("parceiros_email_key").on(table.email),
]);

export const vouchers = pgTable("vouchers", {
	id: serial().primaryKey().notNull(),
	codigo: varchar({ length: 50 }).notNull(),
	desconto: integer().notNull(),
	parceiroId: integer("parceiro_id").notNull(),
	dataCriacao: timestamp("data_criacao", { mode: 'string' }).defaultNow(),
	limiteUso: integer("limite_uso"),
	tenantId: uuid("tenant_id"),
}, (table) => [
	foreignKey({
			columns: [table.parceiroId],
			foreignColumns: [parceiros.id],
			name: "vouchers_parceiro_id_fkey"
		}),
	unique("vouchers_codigo_key").on(table.codigo),
]);

export const pedidos = pgTable("pedidos", {
	id: serial().primaryKey().notNull(),
	clienteId: integer("cliente_id"),
	qrCode: text("qr_code").notNull(),
	status: varchar({ length: 20 }).default('pendente'),
	total: numeric({ precision: 10, scale:  2 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	validatedAt: timestamp("validated_at", { mode: 'string' }),
	validatedBy: integer("validated_by"),
	tenantId: uuid("tenant_id"),
}, (table) => [
	index("idx_pedidos_cliente").using("btree", table.clienteId.asc().nullsLast().op("int4_ops")),
	index("idx_pedidos_qr").using("btree", table.qrCode.asc().nullsLast().op("text_ops")),
	index("idx_pedidos_tenant").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.clienteId],
			foreignColumns: [clientes.id],
			name: "pedidos_cliente_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [provedores.tenantId],
			name: "fk_pedidos_tenant"
		}),
	unique("pedidos_qr_code_key").on(table.qrCode),
]);

export const superadmins = pgTable("superadmins", {
	id: serial().primaryKey().notNull(),
	nome: varchar({ length: 255 }).notNull(),
	email: varchar({ length: 255 }).notNull(),
	senha: text().notNull(),
	ativo: boolean().default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("superadmins_email_key").on(table.email),
]);

export const admins = pgTable("admins", {
	id: serial().primaryKey().notNull(),
	nome: varchar({ length: 100 }).notNull(),
	email: varchar({ length: 150 }).notNull(),
	senha: varchar({ length: 255 }).notNull(),
	dataCriacao: timestamp("data_criacao", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("admins_email_key").on(table.email),
]);

export const planos = pgTable("planos", {
	id: serial().primaryKey().notNull(),
	nome: varchar({ length: 50 }).notNull(),
	preco: numeric({ precision: 10, scale:  2 }).notNull(),
	limiteClientes: integer("limite_clientes"),
	limiteParceiros: integer("limite_parceiros"),
	limiteVouchers: integer("limite_vouchers"),
	limiteProdutos: integer("limite_produtos"),
	temSubdominio: boolean("tem_subdominio").default(false),
	temApi: boolean("tem_api").default(false),
	temExport: boolean("tem_export").default(false),
	integracoesSgp: integer("integracoes_sgp").default(1),
	suporteTipo: varchar("suporte_tipo", { length: 20 }).default('email'),
	historicoMeses: integer("historico_meses").default(6),
	ativo: boolean().default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const provedores = pgTable("provedores", {
	id: serial().primaryKey().notNull(),
	tenantId: uuid("tenant_id").defaultRandom(),
	nomeEmpresa: varchar("nome_empresa", { length: 255 }).notNull(),
	email: varchar({ length: 255 }).notNull(),
	senha: text().notNull(),
	subdominio: varchar({ length: 50 }),
	planoId: integer("plano_id").default(1),
	ativo: boolean().default(true),
	dataVencimento: date("data_vencimento"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_provedores_subdominio").using("btree", table.subdominio.asc().nullsLast().op("text_ops")),
	index("idx_provedores_tenant_id").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.planoId],
			foreignColumns: [planos.id],
			name: "provedores_plano_id_fkey"
		}),
	unique("provedores_tenant_id_key").on(table.tenantId),
	unique("provedores_email_key").on(table.email),
	unique("provedores_subdominio_key").on(table.subdominio),
]);

export const tenantLogs = pgTable("tenant_logs", {
	id: serial().primaryKey().notNull(),
	tenantId: uuid("tenant_id"),
	usuarioTipo: varchar("usuario_tipo", { length: 20 }),
	usuarioId: integer("usuario_id"),
	acao: varchar({ length: 100 }),
	detalhes: jsonb(),
	ipAddress: inet("ip_address"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_tenant_logs_created").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("idx_tenant_logs_tenant").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [provedores.tenantId],
			name: "tenant_logs_tenant_id_fkey"
		}),
]);

export const integracoes = pgTable("integracoes", {
	id: serial().primaryKey().notNull(),
	parceiroId: integer("parceiro_id"),
	tipo: varchar({ length: 50 }).notNull(),
	subdominio: text().notNull(),
	token: text().notNull(),
	modoAtivacao: varchar("modo_ativacao", { length: 20 }).default('manual'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	appName: text("app_name").default('parceirize'),
	cpfCentral: varchar("cpf_central", { length: 20 }),
	senhaCentral: text("senha_central"),
	adminId: integer("admin_id"),
	lastSync: timestamp("last_sync", { mode: 'string' }),
	tenantId: uuid("tenant_id"),
}, (table) => [
	index("idx_integracoes_admin_id").using("btree", table.adminId.asc().nullsLast().op("int4_ops")),
	index("idx_integracoes_tenant").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	index("idx_integracoes_tipo_admin").using("btree", table.tipo.asc().nullsLast().op("int4_ops"), table.adminId.asc().nullsLast().op("text_ops")),
	uniqueIndex("uq_integracoes_parceiro_tipo").using("btree", table.parceiroId.asc().nullsLast().op("int4_ops"), table.tipo.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.parceiroId],
			foreignColumns: [parceiros.id],
			name: "integracoes_parceiro_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.adminId],
			foreignColumns: [admins.id],
			name: "integracoes_admin_id_fkey"
		}),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [provedores.tenantId],
			name: "fk_integracoes_tenant"
		}),
	check("check_integracoes_owner", sql`((admin_id IS NOT NULL) AND (parceiro_id IS NULL)) OR ((admin_id IS NULL) AND (parceiro_id IS NOT NULL))`),
]);

export const produtos = pgTable("produtos", {
	id: serial().primaryKey().notNull(),
	parceiroId: integer("parceiro_id"),
	nome: varchar({ length: 255 }).notNull(),
	descricao: text(),
	preco: numeric({ precision: 10, scale:  2 }).notNull(),
	ativo: boolean().default(true),
	imagemUrl: text("imagem_url"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	desconto: numeric({ precision: 5, scale:  2 }).default('0.00'),
	tenantId: uuid("tenant_id"),
}, (table) => [
	index("idx_produtos_parceiro").using("btree", table.parceiroId.asc().nullsLast().op("int4_ops")),
	index("idx_produtos_tenant").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.parceiroId],
			foreignColumns: [parceiros.id],
			name: "produtos_parceiro_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [provedores.tenantId],
			name: "fk_produtos_tenant"
		}),
]);

export const carrinho = pgTable("carrinho", {
	id: serial().primaryKey().notNull(),
	clienteId: integer("cliente_id"),
	produtoId: integer("produto_id"),
	quantidade: integer().default(1),
	precoUnitario: numeric("preco_unitario", { precision: 10, scale:  2 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	descontoAplicado: numeric("desconto_aplicado", { precision: 5, scale:  2 }).default('0.00'),
}, (table) => [
	index("idx_carrinho_cliente").using("btree", table.clienteId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.clienteId],
			foreignColumns: [clientes.id],
			name: "carrinho_cliente_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.produtoId],
			foreignColumns: [produtos.id],
			name: "carrinho_produto_id_fkey"
		}).onDelete("cascade"),
	unique("carrinho_cliente_id_produto_id_key").on(table.clienteId, table.produtoId),
]);
export const tenantStats = pgView("tenant_stats", {	tenantId: uuid("tenant_id"),
	nomeEmpresa: varchar("nome_empresa", { length: 255 }),
	planoId: integer("plano_id"),
	planoNome: varchar("plano_nome", { length: 50 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	totalClientes: bigint("total_clientes", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	totalParceiros: bigint("total_parceiros", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	totalProdutos: bigint("total_produtos", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	totalPedidos: bigint("total_pedidos", { mode: "number" }),
	ativo: boolean(),
	dataVencimento: date("data_vencimento"),
}).as(sql`SELECT p.tenant_id, p.nome_empresa, p.plano_id, pl.nome AS plano_nome, count(DISTINCT c.id) AS total_clientes, count(DISTINCT pa.id) AS total_parceiros, count(DISTINCT pr.id) AS total_produtos, count(DISTINCT pe.id) AS total_pedidos, p.ativo, p.data_vencimento FROM provedores p LEFT JOIN planos pl ON p.plano_id = pl.id LEFT JOIN clientes c ON p.tenant_id = c.tenant_id LEFT JOIN parceiros pa ON p.tenant_id = pa.tenant_id LEFT JOIN produtos pr ON p.tenant_id = pr.tenant_id LEFT JOIN pedidos pe ON p.tenant_id = pe.tenant_id GROUP BY p.tenant_id, p.nome_empresa, p.plano_id, pl.nome, p.ativo, p.data_vencimento`);
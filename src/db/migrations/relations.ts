import { relations } from "drizzle-orm/relations";
import { provedores, clientes, vouchers, voucherUtilizados, pedidos, pedidoItens, produtos, parceiros, planos, tenantLogs, integracoes, admins, carrinho } from "./schema";

export const clientesRelations = relations(clientes, ({one, many}) => ({
	provedore: one(provedores, {
		fields: [clientes.tenantId],
		references: [provedores.tenantId]
	}),
	voucherUtilizados: many(voucherUtilizados),
	pedidos: many(pedidos),
	carrinhos: many(carrinho),
}));

export const provedoresRelations = relations(provedores, ({one, many}) => ({
	clientes: many(clientes),
	parceiros: many(parceiros),
	pedidos: many(pedidos),
	plano: one(planos, {
		fields: [provedores.planoId],
		references: [planos.id]
	}),
	tenantLogs: many(tenantLogs),
	integracoes: many(integracoes),
	produtos: many(produtos),
}));

export const voucherUtilizadosRelations = relations(voucherUtilizados, ({one}) => ({
	voucher: one(vouchers, {
		fields: [voucherUtilizados.voucherId],
		references: [vouchers.id]
	}),
	cliente: one(clientes, {
		fields: [voucherUtilizados.clienteId],
		references: [clientes.id]
	}),
}));

export const vouchersRelations = relations(vouchers, ({one, many}) => ({
	voucherUtilizados: many(voucherUtilizados),
	parceiro: one(parceiros, {
		fields: [vouchers.parceiroId],
		references: [parceiros.id]
	}),
}));

export const pedidoItensRelations = relations(pedidoItens, ({one}) => ({
	pedido: one(pedidos, {
		fields: [pedidoItens.pedidoId],
		references: [pedidos.id]
	}),
	produto: one(produtos, {
		fields: [pedidoItens.produtoId],
		references: [produtos.id]
	}),
	parceiro_parceiroId: one(parceiros, {
		fields: [pedidoItens.parceiroId],
		references: [parceiros.id],
		relationName: "pedidoItens_parceiroId_parceiros_id"
	}),
	parceiro_validadoPor: one(parceiros, {
		fields: [pedidoItens.validadoPor],
		references: [parceiros.id],
		relationName: "pedidoItens_validadoPor_parceiros_id"
	}),
}));

export const pedidosRelations = relations(pedidos, ({one, many}) => ({
	pedidoItens: many(pedidoItens),
	cliente: one(clientes, {
		fields: [pedidos.clienteId],
		references: [clientes.id]
	}),
	provedore: one(provedores, {
		fields: [pedidos.tenantId],
		references: [provedores.tenantId]
	}),
}));

export const produtosRelations = relations(produtos, ({one, many}) => ({
	pedidoItens: many(pedidoItens),
	parceiro: one(parceiros, {
		fields: [produtos.parceiroId],
		references: [parceiros.id]
	}),
	provedore: one(provedores, {
		fields: [produtos.tenantId],
		references: [provedores.tenantId]
	}),
	carrinhos: many(carrinho),
}));

export const parceirosRelations = relations(parceiros, ({one, many}) => ({
	pedidoItens_parceiroId: many(pedidoItens, {
		relationName: "pedidoItens_parceiroId_parceiros_id"
	}),
	pedidoItens_validadoPor: many(pedidoItens, {
		relationName: "pedidoItens_validadoPor_parceiros_id"
	}),
	provedore: one(provedores, {
		fields: [parceiros.tenantId],
		references: [provedores.tenantId]
	}),
	vouchers: many(vouchers),
	integracoes: many(integracoes),
	produtos: many(produtos),
}));

export const planosRelations = relations(planos, ({many}) => ({
	provedores: many(provedores),
}));

export const tenantLogsRelations = relations(tenantLogs, ({one}) => ({
	provedore: one(provedores, {
		fields: [tenantLogs.tenantId],
		references: [provedores.tenantId]
	}),
}));

export const integracoesRelations = relations(integracoes, ({one}) => ({
	parceiro: one(parceiros, {
		fields: [integracoes.parceiroId],
		references: [parceiros.id]
	}),
	admin: one(admins, {
		fields: [integracoes.adminId],
		references: [admins.id]
	}),
	provedore: one(provedores, {
		fields: [integracoes.tenantId],
		references: [provedores.tenantId]
	}),
}));

export const adminsRelations = relations(admins, ({many}) => ({
	integracoes: many(integracoes),
}));

export const carrinhoRelations = relations(carrinho, ({one}) => ({
	cliente: one(clientes, {
		fields: [carrinho.clienteId],
		references: [clientes.id]
	}),
	produto: one(produtos, {
		fields: [carrinho.produtoId],
		references: [produtos.id]
	}),
}));
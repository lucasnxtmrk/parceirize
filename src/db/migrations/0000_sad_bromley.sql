-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "clientes" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" varchar(100) NOT NULL,
	"sobrenome" varchar(100) NOT NULL,
	"email" varchar(150) NOT NULL,
	"id_carteirinha" varchar(50) NOT NULL,
	"senha" varchar(255) NOT NULL,
	"vouchers_disponiveis" integer DEFAULT 1,
	"data_ultimo_voucher" timestamp,
	"data_criacao" timestamp DEFAULT now(),
	"ativo" boolean DEFAULT true,
	"tipo_cliente" varchar(50) DEFAULT 'cliente' NOT NULL,
	"tenant_id" uuid,
	CONSTRAINT "clientes_email_key" UNIQUE("email"),
	CONSTRAINT "clientes_id_carteirinha_key" UNIQUE("id_carteirinha")
);
--> statement-breakpoint
CREATE TABLE "voucher_utilizados" (
	"id" serial PRIMARY KEY NOT NULL,
	"voucher_id" integer NOT NULL,
	"cliente_id" integer NOT NULL,
	"data_utilizacao" timestamp DEFAULT now() NOT NULL,
	"desconto" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pedido_itens" (
	"id" serial PRIMARY KEY NOT NULL,
	"pedido_id" integer,
	"produto_id" integer,
	"parceiro_id" integer,
	"quantidade" integer NOT NULL,
	"preco_unitario" numeric(10, 2) NOT NULL,
	"subtotal" numeric(10, 2) NOT NULL,
	"validado_por" integer,
	"validado_at" timestamp,
	"desconto_aplicado" numeric(5, 2) DEFAULT '0.00'
);
--> statement-breakpoint
CREATE TABLE "parceiros" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome_empresa" varchar(150) NOT NULL,
	"email" varchar(150) NOT NULL,
	"foto" text,
	"data_criacao" timestamp DEFAULT now(),
	"senha" varchar(255) DEFAULT '12345678' NOT NULL,
	"nicho" varchar(100) DEFAULT 'Geral' NOT NULL,
	"descricao" text,
	"ativo" boolean DEFAULT true NOT NULL,
	"tenant_id" uuid,
	CONSTRAINT "parceiros_email_key" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "vouchers" (
	"id" serial PRIMARY KEY NOT NULL,
	"codigo" varchar(50) NOT NULL,
	"desconto" integer NOT NULL,
	"parceiro_id" integer NOT NULL,
	"data_criacao" timestamp DEFAULT now(),
	"limite_uso" integer,
	"tenant_id" uuid,
	CONSTRAINT "vouchers_codigo_key" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE "pedidos" (
	"id" serial PRIMARY KEY NOT NULL,
	"cliente_id" integer,
	"qr_code" text NOT NULL,
	"status" varchar(20) DEFAULT 'pendente',
	"total" numeric(10, 2) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"validated_at" timestamp,
	"validated_by" integer,
	"tenant_id" uuid,
	CONSTRAINT "pedidos_qr_code_key" UNIQUE("qr_code")
);
--> statement-breakpoint
CREATE TABLE "superadmins" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"senha" text NOT NULL,
	"ativo" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "superadmins_email_key" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "admins" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" varchar(100) NOT NULL,
	"email" varchar(150) NOT NULL,
	"senha" varchar(255) NOT NULL,
	"data_criacao" timestamp DEFAULT now(),
	CONSTRAINT "admins_email_key" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "planos" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" varchar(50) NOT NULL,
	"preco" numeric(10, 2) NOT NULL,
	"limite_clientes" integer,
	"limite_parceiros" integer,
	"limite_vouchers" integer,
	"limite_produtos" integer,
	"tem_subdominio" boolean DEFAULT false,
	"tem_api" boolean DEFAULT false,
	"tem_export" boolean DEFAULT false,
	"integracoes_sgp" integer DEFAULT 1,
	"suporte_tipo" varchar(20) DEFAULT 'email',
	"historico_meses" integer DEFAULT 6,
	"ativo" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "provedores" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" uuid DEFAULT gen_random_uuid(),
	"nome_empresa" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"senha" text NOT NULL,
	"subdominio" varchar(50),
	"plano_id" integer DEFAULT 1,
	"ativo" boolean DEFAULT true,
	"data_vencimento" date,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "provedores_tenant_id_key" UNIQUE("tenant_id"),
	CONSTRAINT "provedores_email_key" UNIQUE("email"),
	CONSTRAINT "provedores_subdominio_key" UNIQUE("subdominio")
);
--> statement-breakpoint
CREATE TABLE "tenant_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" uuid,
	"usuario_tipo" varchar(20),
	"usuario_id" integer,
	"acao" varchar(100),
	"detalhes" jsonb,
	"ip_address" "inet",
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "integracoes" (
	"id" serial PRIMARY KEY NOT NULL,
	"parceiro_id" integer,
	"tipo" varchar(50) NOT NULL,
	"subdominio" text NOT NULL,
	"token" text NOT NULL,
	"modo_ativacao" varchar(20) DEFAULT 'manual',
	"created_at" timestamp DEFAULT now(),
	"app_name" text DEFAULT 'parceirize',
	"cpf_central" varchar(20),
	"senha_central" text,
	"admin_id" integer,
	"last_sync" timestamp,
	"tenant_id" uuid,
	CONSTRAINT "check_integracoes_owner" CHECK (((admin_id IS NOT NULL) AND (parceiro_id IS NULL)) OR ((admin_id IS NULL) AND (parceiro_id IS NOT NULL)))
);
--> statement-breakpoint
CREATE TABLE "produtos" (
	"id" serial PRIMARY KEY NOT NULL,
	"parceiro_id" integer,
	"nome" varchar(255) NOT NULL,
	"descricao" text,
	"preco" numeric(10, 2) NOT NULL,
	"ativo" boolean DEFAULT true,
	"imagem_url" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"desconto" numeric(5, 2) DEFAULT '0.00',
	"tenant_id" uuid
);
--> statement-breakpoint
CREATE TABLE "carrinho" (
	"id" serial PRIMARY KEY NOT NULL,
	"cliente_id" integer,
	"produto_id" integer,
	"quantidade" integer DEFAULT 1,
	"preco_unitario" numeric(10, 2) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"desconto_aplicado" numeric(5, 2) DEFAULT '0.00',
	CONSTRAINT "carrinho_cliente_id_produto_id_key" UNIQUE("cliente_id","produto_id")
);
--> statement-breakpoint
ALTER TABLE "clientes" ADD CONSTRAINT "fk_clientes_tenant" FOREIGN KEY ("tenant_id") REFERENCES "public"."provedores"("tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voucher_utilizados" ADD CONSTRAINT "voucher_utilizados_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "public"."vouchers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voucher_utilizados" ADD CONSTRAINT "voucher_utilizados_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedido_itens" ADD CONSTRAINT "pedido_itens_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedido_itens" ADD CONSTRAINT "pedido_itens_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "public"."produtos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedido_itens" ADD CONSTRAINT "pedido_itens_parceiro_id_fkey" FOREIGN KEY ("parceiro_id") REFERENCES "public"."parceiros"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedido_itens" ADD CONSTRAINT "pedido_itens_validado_por_fkey" FOREIGN KEY ("validado_por") REFERENCES "public"."parceiros"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parceiros" ADD CONSTRAINT "fk_parceiros_tenant" FOREIGN KEY ("tenant_id") REFERENCES "public"."provedores"("tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_parceiro_id_fkey" FOREIGN KEY ("parceiro_id") REFERENCES "public"."parceiros"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "fk_pedidos_tenant" FOREIGN KEY ("tenant_id") REFERENCES "public"."provedores"("tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provedores" ADD CONSTRAINT "provedores_plano_id_fkey" FOREIGN KEY ("plano_id") REFERENCES "public"."planos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_logs" ADD CONSTRAINT "tenant_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."provedores"("tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integracoes" ADD CONSTRAINT "integracoes_parceiro_id_fkey" FOREIGN KEY ("parceiro_id") REFERENCES "public"."parceiros"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integracoes" ADD CONSTRAINT "integracoes_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integracoes" ADD CONSTRAINT "fk_integracoes_tenant" FOREIGN KEY ("tenant_id") REFERENCES "public"."provedores"("tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "produtos" ADD CONSTRAINT "produtos_parceiro_id_fkey" FOREIGN KEY ("parceiro_id") REFERENCES "public"."parceiros"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "produtos" ADD CONSTRAINT "fk_produtos_tenant" FOREIGN KEY ("tenant_id") REFERENCES "public"."provedores"("tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carrinho" ADD CONSTRAINT "carrinho_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carrinho" ADD CONSTRAINT "carrinho_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "public"."produtos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_clientes_email_tipo" ON "clientes" USING btree ("email" text_ops,"tipo_cliente" text_ops);--> statement-breakpoint
CREATE INDEX "idx_clientes_tenant" ON "clientes" USING btree ("tenant_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_clientes_tipo_cliente" ON "clientes" USING btree ("tipo_cliente" text_ops);--> statement-breakpoint
CREATE INDEX "idx_voucher_utilizados_cliente" ON "voucher_utilizados" USING btree ("cliente_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_voucher_utilizados_data" ON "voucher_utilizados" USING btree ("data_utilizacao" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_voucher_utilizados_voucher" ON "voucher_utilizados" USING btree ("voucher_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_pedido_itens_pedido" ON "pedido_itens" USING btree ("pedido_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_pedido_itens_validacao" ON "pedido_itens" USING btree ("validado_por" int4_ops,"validado_at" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_parceiros_tenant" ON "parceiros" USING btree ("tenant_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_pedidos_cliente" ON "pedidos" USING btree ("cliente_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_pedidos_qr" ON "pedidos" USING btree ("qr_code" text_ops);--> statement-breakpoint
CREATE INDEX "idx_pedidos_tenant" ON "pedidos" USING btree ("tenant_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_provedores_subdominio" ON "provedores" USING btree ("subdominio" text_ops);--> statement-breakpoint
CREATE INDEX "idx_provedores_tenant_id" ON "provedores" USING btree ("tenant_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_tenant_logs_created" ON "tenant_logs" USING btree ("created_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_tenant_logs_tenant" ON "tenant_logs" USING btree ("tenant_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_integracoes_admin_id" ON "integracoes" USING btree ("admin_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_integracoes_tenant" ON "integracoes" USING btree ("tenant_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_integracoes_tipo_admin" ON "integracoes" USING btree ("tipo" int4_ops,"admin_id" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "uq_integracoes_parceiro_tipo" ON "integracoes" USING btree ("parceiro_id" int4_ops,"tipo" text_ops);--> statement-breakpoint
CREATE INDEX "idx_produtos_parceiro" ON "produtos" USING btree ("parceiro_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_produtos_tenant" ON "produtos" USING btree ("tenant_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_carrinho_cliente" ON "carrinho" USING btree ("cliente_id" int4_ops);--> statement-breakpoint
CREATE VIEW "public"."tenant_stats" AS (SELECT p.tenant_id, p.nome_empresa, p.plano_id, pl.nome AS plano_nome, count(DISTINCT c.id) AS total_clientes, count(DISTINCT pa.id) AS total_parceiros, count(DISTINCT pr.id) AS total_produtos, count(DISTINCT pe.id) AS total_pedidos, p.ativo, p.data_vencimento FROM provedores p LEFT JOIN planos pl ON p.plano_id = pl.id LEFT JOIN clientes c ON p.tenant_id = c.tenant_id LEFT JOIN parceiros pa ON p.tenant_id = pa.tenant_id LEFT JOIN produtos pr ON p.tenant_id = pr.tenant_id LEFT JOIN pedidos pe ON p.tenant_id = pe.tenant_id GROUP BY p.tenant_id, p.nome_empresa, p.plano_id, pl.nome, p.ativo, p.data_vencimento);
*/
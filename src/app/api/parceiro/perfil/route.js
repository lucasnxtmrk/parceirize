import { Pool } from "pg";
import { withTenantIsolation } from "@/lib/tenant-helper";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// ✅ BUSCAR OS DADOS DO PARCEIRO COM ISOLAMENTO MULTI-TENANT
export const GET = withTenantIsolation(async (request, { tenant }) => {
  try {
    if (!['parceiro'].includes(tenant.role)) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), { status: 403 });
    }

    console.log("📡 Buscando perfil do parceiro:", tenant.user.email);

    // Buscar os dados do parceiro COM ISOLAMENTO
    const query = `
      SELECT id, nome_empresa, email, foto, nicho, desconto_padrao
      FROM parceiros
      WHERE email = $1 AND tenant_id = $2
    `;
    const result = await pool.query(query, [tenant.user.email, tenant.tenant_id]);

    if (result.rows.length === 0) {
      return new Response(JSON.stringify({ error: "Parceiro não encontrado." }), { status: 404 });
    }

    return new Response(JSON.stringify(result.rows[0]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ Erro ao buscar perfil do parceiro:", error);
    return new Response(JSON.stringify({ error: "Erro interno ao buscar perfil." }), { status: 500 });
  }
});

// ✅ ATUALIZAR OS DADOS DO PARCEIRO COM ISOLAMENTO MULTI-TENANT
export const PUT = withTenantIsolation(async (request, { tenant }) => {
  try {
    if (!['parceiro'].includes(tenant.role)) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), { status: 403 });
    }

    const { nome_empresa, email, foto } = await request.json();

    console.log("📡 Atualizando perfil do parceiro:", tenant.user.email);

    // Atualizar apenas campos editáveis (nome_empresa, email, foto)
    const updateQuery = `
      UPDATE parceiros
      SET nome_empresa = $1, email = $2, foto = $3
      WHERE email = $4 AND tenant_id = $5
      RETURNING id, nome_empresa, email, foto, nicho, desconto_padrao
    `;

    const result = await pool.query(updateQuery, [nome_empresa, email, foto, tenant.user.email, tenant.tenant_id]);

    if (result.rows.length === 0) {
      return new Response(JSON.stringify({ error: "Erro ao atualizar perfil." }), { status: 400 });
    }

    return new Response(JSON.stringify({ success: true, parceiro: result.rows[0] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ Erro ao atualizar perfil do parceiro:", error);
    return new Response(JSON.stringify({ error: "Erro interno ao atualizar perfil." }), { status: 500 });
  }
});

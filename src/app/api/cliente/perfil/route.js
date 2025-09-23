import { Pool } from "pg";
import { withTenantIsolation } from "@/lib/tenant-helper";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// ✅ GET - BUSCAR PERFIL DO CLIENTE COM ISOLAMENTO MULTI-TENANT
export const GET = withTenantIsolation(async (request, { tenant }) => {
  try {
    if (!['cliente'].includes(tenant.role)) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), { status: 403 });
    }

    console.log("👤 Buscando perfil do cliente:", tenant.user.id, "no tenant:", tenant.tenant_id);

    const clienteId = tenant.user.id;

    const query = `
      SELECT
        id,
        nome,
        sobrenome,
        email,
        id_carteirinha,
        data_criacao,
        ativo
      FROM clientes
      WHERE id = $1 AND tenant_id = $2
    `;

    const result = await pool.query(query, [clienteId, tenant.tenant_id]);

    if (result.rows.length === 0) {
      return new Response(JSON.stringify({ error: "Cliente não encontrado" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(result.rows[0]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Erro ao buscar perfil do cliente:", error);
    return new Response(JSON.stringify({ error: "Erro interno ao buscar perfil" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

// ✅ PUT - ATUALIZAR PERFIL DO CLIENTE COM ISOLAMENTO MULTI-TENANT
export const PUT = withTenantIsolation(async (request, { tenant }) => {
  try {
    if (!['cliente'].includes(tenant.role)) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), { status: 403 });
    }

    const clienteId = tenant.user.id;
    const { nome, sobrenome, email } = await request.json();

    if (!nome || !sobrenome) {
      return new Response(JSON.stringify({ error: "Nome e sobrenome são obrigatórios" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Verificar se o email já está em uso por outro cliente NO MESMO TENANT
    if (email && email !== tenant.user.email) {
      const emailCheckQuery = `
        SELECT id FROM clientes
        WHERE email = $1 AND id != $2 AND tenant_id = $3
      `;
      const emailCheck = await pool.query(emailCheckQuery, [email, clienteId, tenant.tenant_id]);

      if (emailCheck.rows.length > 0) {
        return new Response(JSON.stringify({ error: "Este e-mail já está em uso" }), {
          status: 409,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    const updateQuery = `
      UPDATE clientes
      SET nome = $1, sobrenome = $2, email = $3
      WHERE id = $4 AND tenant_id = $5
      RETURNING id, nome, sobrenome, email, id_carteirinha, data_criacao, ativo
    `;

    const result = await pool.query(updateQuery, [
      nome,
      sobrenome,
      email || tenant.user.email,
      clienteId,
      tenant.tenant_id
    ]);

    if (result.rows.length === 0) {
      return new Response(JSON.stringify({ error: "Erro ao atualizar perfil" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      cliente: result.rows[0]
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Erro ao atualizar perfil do cliente:", error);
    return new Response(JSON.stringify({ error: "Erro interno ao atualizar perfil" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
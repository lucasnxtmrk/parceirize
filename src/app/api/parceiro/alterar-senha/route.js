import { Pool } from "pg";
import { withTenantIsolation } from "@/lib/tenant-helper";
import bcrypt from "bcryptjs";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// ✅ PUT - ALTERAR SENHA DO PARCEIRO COM ISOLAMENTO MULTI-TENANT
export const PUT = withTenantIsolation(async (request, { tenant }) => {
  try {
    if (!['parceiro'].includes(tenant.role)) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), { status: 403 });
    }

    const parceiroId = tenant.user.id;
    const { senhaAtual, novaSenha } = await request.json();

    if (!senhaAtual || !novaSenha) {
      return new Response(JSON.stringify({ error: "Senha atual e nova senha são obrigatórias" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (novaSenha.length < 6) {
      return new Response(JSON.stringify({ error: "A nova senha deve ter pelo menos 6 caracteres" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Buscar senha atual do parceiro COM ISOLAMENTO DE TENANT
    const parceiroQuery = `SELECT senha FROM parceiros WHERE id = $1 AND tenant_id = $2`;
    const parceiroResult = await pool.query(parceiroQuery, [parceiroId, tenant.tenant_id]);

    if (parceiroResult.rows.length === 0) {
      return new Response(JSON.stringify({ error: "Parceiro não encontrado" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Verificar se a senha atual está correta
    const senhaCorreta = await bcrypt.compare(senhaAtual, parceiroResult.rows[0].senha);

    if (!senhaCorreta) {
      return new Response(JSON.stringify({ error: "Senha atual incorreta" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Gerar hash da nova senha
    const novaSenhaHash = await bcrypt.hash(novaSenha, 12);

    // Atualizar senha no banco COM ISOLAMENTO DE TENANT
    const updateQuery = `
      UPDATE parceiros
      SET senha = $1
      WHERE id = $2 AND tenant_id = $3
    `;

    await pool.query(updateQuery, [novaSenhaHash, parceiroId, tenant.tenant_id]);

    return new Response(JSON.stringify({
      success: true,
      message: "Senha alterada com sucesso"
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ Erro ao alterar senha do parceiro:", error);
    return new Response(JSON.stringify({ error: "Erro interno ao alterar senha" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
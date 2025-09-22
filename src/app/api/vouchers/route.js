import { Pool } from "pg";
import { withTenantIsolation } from "@/lib/tenant-helper";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const GET = withTenantIsolation(async (request, { tenant }) => {
  try {
    console.log("📡 Buscando voucher único para tenant:", tenant.tenant_id);

    const { searchParams } = new URL(request.url);
    const parceiroId = searchParams.get('parceiro_id');

    if (!parceiroId) {
      return new Response(JSON.stringify({ error: "parceiro_id é obrigatório" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    let query = `
      SELECT
        v.id,
        v.codigo,
        v.titulo,
        v.descricao,
        v.tipo_desconto,
        v.valor_desconto,
        v.desconto,
        v.condicoes,
        v.limite_uso,
        v.utilizado,
        v.data_criacao,
        p.nome_empresa AS parceiro_nome,
        p.nicho AS parceiro_nicho,
        p.foto AS parceiro_foto
      FROM vouchers v
      INNER JOIN parceiros p ON v.parceiro_id = p.id
      WHERE v.parceiro_id = $1
    `;

    const queryParams = [parceiroId];

    // Filtro de tenant (sempre aplicado, exceto para SuperAdmin)
    if (!tenant.isGlobalAccess) {
      query += ` AND p.tenant_id = $2`;
      queryParams.push(tenant.tenant_id);
    }

    const result = await pool.query(query, queryParams);

    console.log("🔍 Voucher encontrado:", result.rows);

    // Retornar voucher único ou null se não existir
    const voucher = result.rows.length > 0 ? result.rows[0] : null;

    return new Response(JSON.stringify(voucher), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Erro ao buscar vouchers:", error);
    return new Response(JSON.stringify({ error: "Erro interno ao buscar vouchers" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

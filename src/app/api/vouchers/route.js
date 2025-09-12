import { Pool } from "pg";
import { withTenantIsolation } from "@/lib/tenant-helper";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const GET = withTenantIsolation(async (request, { tenant }) => {
  try {
    console.log("📡 Buscando vouchers para tenant:", tenant.tenant_id);

    const { searchParams } = new URL(request.url);
    const parceiroId = searchParams.get('parceiro_id');

    let query = `
      SELECT 
        v.id AS voucher_id,
        v.codigo AS voucher_codigo,
        v.desconto AS voucher_desconto,
        v.limite_uso,
        p.nome_empresa AS parceiro_nome,
        p.nicho AS parceiro_nicho,
        p.foto AS parceiro_foto
      FROM vouchers v
      INNER JOIN parceiros p ON v.parceiro_id = p.id
    `;

    const queryParams = [];
    let paramCount = 1;

    // Filtro de tenant (sempre aplicado, exceto para SuperAdmin)
    if (!tenant.isGlobalAccess) {
      query += ` WHERE p.tenant_id = $${paramCount}`;
      queryParams.push(tenant.tenant_id);
      paramCount++;

      // Filtro adicional por parceiro se especificado
      if (parceiroId) {
        query += ` AND v.parceiro_id = $${paramCount}`;
        queryParams.push(parceiroId);
        paramCount++;
      }
    } else {
      // SuperAdmin - apenas filtro de parceiro se especificado
      if (parceiroId) {
        query += ` WHERE v.parceiro_id = $${paramCount}`;
        queryParams.push(parceiroId);
        paramCount++;
      }
    }

    query += ` ORDER BY v.data_criacao DESC`;

    const result = await pool.query(query, queryParams);
    
    console.log("🔍 Vouchers encontrados:", result.rows);

    return new Response(JSON.stringify(result.rows), {
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

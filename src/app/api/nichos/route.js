import { Pool } from "pg";
import { Nichos } from "@/data/nichos";
import { withTenantIsolation } from "@/lib/tenant-helper";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// ✅ GET - LISTAR NICHOS COM ISOLAMENTO MULTI-TENANT
export const GET = withTenantIsolation(async (request, { tenant }) => {
  try {
    console.log("📡 Buscando nichos para tenant:", tenant.tenant_id);

    let query = `
      SELECT nicho, COUNT(*) as count
      FROM parceiros
      WHERE nicho IS NOT NULL AND nicho != ''
    `;

    const queryParams = [];

    // ✅ ISOLAMENTO DE TENANT: Apenas nichos de parceiros do tenant
    if (!tenant.isGlobalAccess) {
      query += ` AND tenant_id = $1`;
      queryParams.push(tenant.tenant_id);
    }

    query += `
      GROUP BY nicho
      ORDER BY count DESC
    `;

    const result = await pool.query(query, queryParams);

    console.log(`🔍 Nichos encontrados para tenant ${tenant.tenant_id}:`, result.rows);

    // Mapear nichos para nomes legíveis
    const nichosFormatados = result.rows.map(row => {
      const nichoId = Number(row.nicho);
      const nichoData = Nichos.find(n => n.id === nichoId);

      return {
        nicho: nichoData ? nichoData.nome : row.nicho, // Se não encontrar, usa o valor original
        count: parseInt(row.count),
        original: row.nicho // Mantém o valor original para filtros
      };
    });

    return new Response(JSON.stringify(nichosFormatados), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Erro ao buscar nichos:", error);
    return new Response(JSON.stringify({ error: "Erro interno ao buscar nichos" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

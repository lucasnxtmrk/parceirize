import { Pool } from "pg";
import { normalizeApiData } from "@/utils/formatters";
import { withTenantIsolation } from "@/lib/tenant-helper";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// ✅ GET - LISTAR PARCEIROS PARA CLIENTES COM ISOLAMENTO MULTI-TENANT
export const GET = withTenantIsolation(async (request, { tenant }) => {
  try {
    console.log("📡 Buscando parceiros para clientes no tenant:", tenant.tenant_id);

    const { searchParams } = new URL(request.url);
    const nicho = searchParams.get('nicho');
    const search = searchParams.get('search');

    let query = `
      SELECT DISTINCT
        p.id,
        p.nome_empresa,
        p.nicho,
        p.foto,
        p.email,
        p.cidade,
        p.estado,
        p.cep,
        p.endereco,
        COUNT(pr.id) as total_produtos,
        COALESCE(MIN(pr.preco), 0) as menor_preco,
        COALESCE(MAX(pr.preco), 0) as maior_preco,
        COALESCE(MAX(pr.desconto), 0) as maior_desconto
      FROM parceiros p
      LEFT JOIN produtos pr ON p.id = pr.parceiro_id AND pr.ativo = true
      WHERE 1=1
    `;

    const queryParams = [];
    let paramIndex = 1;

    // ✅ ISOLAMENTO DE TENANT: Apenas parceiros do tenant atual
    if (!tenant.isGlobalAccess) {
      query += ` AND p.tenant_id = $${paramIndex}`;
      queryParams.push(tenant.tenant_id);
      paramIndex++;
    }

    if (nicho) {
      query += ` AND p.nicho = $${paramIndex}`;
      queryParams.push(nicho);
      paramIndex++;
    }

    if (search) {
      query += ` AND p.nome_empresa ILIKE $${paramIndex}`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    query += `
      GROUP BY p.id, p.nome_empresa, p.nicho, p.foto, p.email, p.cidade, p.estado, p.cep, p.endereco
      ORDER BY p.nome_empresa ASC
    `;

    const result = await pool.query(query, queryParams);
    const normalizedData = normalizeApiData(result.rows);

    console.log(`📈 Encontrados ${result.rows.length} parceiros para o tenant ${tenant.tenant_id}`);

    return new Response(JSON.stringify(normalizedData), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Erro ao buscar parceiros:", error);
    return new Response(JSON.stringify({ error: "Erro interno ao buscar parceiros" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
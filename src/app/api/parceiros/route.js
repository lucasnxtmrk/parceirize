import { Pool } from "pg";
import { normalizeApiData } from "@/utils/formatters";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const nicho = searchParams.get('nicho');
    const search = searchParams.get('search');

    let query = `
      SELECT DISTINCT
        p.id,
        p.nome_empresa,
        p.nicho,
        p.foto,
        p.email,
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
      GROUP BY p.id, p.nome_empresa, p.nicho, p.foto, p.email
      ORDER BY p.nome_empresa ASC
    `;

    const result = await pool.query(query, queryParams);
    const normalizedData = normalizeApiData(result.rows);
    
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
}
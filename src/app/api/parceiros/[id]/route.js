import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(req, { params }) {
  try {
    const { id } = params;

    const query = `
      SELECT 
        p.id,
        p.nome_empresa,
        p.nicho,
        p.foto,
        p.email,
        COUNT(pr.id) as total_produtos,
        COALESCE(MIN(pr.preco), 0) as menor_preco,
        COALESCE(MAX(pr.preco), 0) as maior_preco
      FROM parceiros p
      LEFT JOIN produtos pr ON p.id = pr.parceiro_id AND pr.ativo = true
      WHERE p.id = $1
      GROUP BY p.id, p.nome_empresa, p.nicho, p.foto, p.email
    `;

    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return new Response(JSON.stringify({ error: "Parceiro não encontrado" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(result.rows[0]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Erro ao buscar parceiro:", error);
    return new Response(JSON.stringify({ error: "Erro interno ao buscar parceiro" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
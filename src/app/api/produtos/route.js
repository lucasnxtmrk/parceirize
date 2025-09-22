import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const parceiroId = searchParams.get('parceiro_id');
    const nicho = searchParams.get('nicho');
    const exclude = searchParams.get('exclude');
    const limit = searchParams.get('limit');

    let query = `
      SELECT
        p.id,
        p.nome,
        p.descricao,
        p.preco,
        CASE
          WHEN p.desconto IS NULL OR p.desconto = 0 THEN
            COALESCE(parc.desconto_padrao, 0)
          ELSE
            p.desconto
        END AS desconto,
        p.imagem_url as foto,
        p.created_at,
        parc.nome_empresa AS parceiro_nome,
        parc.nicho AS parceiro_nicho,
        parc.foto AS parceiro_foto,
        parc.desconto_padrao AS parceiro_desconto_padrao
      FROM produtos p
      INNER JOIN parceiros parc ON p.parceiro_id = parc.id
      WHERE p.ativo = true
    `;
    
    const queryParams = [];
    let paramIndex = 1;

    if (parceiroId) {
      query += ` AND p.parceiro_id = $${paramIndex}`;
      queryParams.push(parceiroId);
      paramIndex++;
    }

    if (nicho) {
      query += ` AND parc.nicho = $${paramIndex}`;
      queryParams.push(nicho);
      paramIndex++;
    }

    if (exclude) {
      query += ` AND p.id != $${paramIndex}`;
      queryParams.push(exclude);
      paramIndex++;
    }

    query += ` ORDER BY p.created_at DESC`;

    if (limit) {
      query += ` LIMIT $${paramIndex}`;
      queryParams.push(parseInt(limit));
    }

    const result = await pool.query(query, queryParams);
    
    return new Response(JSON.stringify(result.rows), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Erro ao buscar produtos:", error);
    return new Response(JSON.stringify({ error: "Erro interno ao buscar produtos" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
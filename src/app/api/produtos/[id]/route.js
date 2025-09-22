import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(req, { params }) {
  try {
    const { id } = params;

    if (!id) {
      return new Response(JSON.stringify({ error: "ID do produto é obrigatório" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log(`📦 Buscando produto com ID: ${id}`);

    const query = `
      SELECT
        p.id,
        p.nome,
        p.descricao,
        p.preco,
        CASE
          WHEN p.desconto IS NULL OR p.desconto = 0 THEN
            COALESCE(pa.desconto_padrao, 0)
          ELSE
            p.desconto
        END AS desconto,
        p.imagem_url as foto,
        p.parceiro_id,
        p.ativo,
        p.created_at,
        pa.nome_empresa as parceiro_nome,
        pa.nicho as parceiro_nicho
      FROM produtos p
      LEFT JOIN parceiros pa ON p.parceiro_id = pa.id
      WHERE p.id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return new Response(JSON.stringify({ error: "Produto não encontrado" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const produto = result.rows[0];

    console.log(`✅ Produto encontrado: ${produto.nome}`);

    return new Response(JSON.stringify(produto), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ Erro ao buscar produto:", error);
    return new Response(JSON.stringify({ error: "Erro interno do servidor" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
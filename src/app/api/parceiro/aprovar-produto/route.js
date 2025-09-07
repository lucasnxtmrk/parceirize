import { Pool } from "pg";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function POST(req) {
  try {
    const session = await getServerSession(options);
    
    if (!session || session.user.role !== 'parceiro') {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { id } = body;
    const parceiroId = session.user.id;

    // Atualizar pedido_item para marcar como validado
    const updateQuery = `
      UPDATE pedido_itens 
      SET validado_at = NOW()
      WHERE pedido_id = $1 AND parceiro_id = $2 AND validado_at IS NULL
    `;
    
    const result = await pool.query(updateQuery, [id, parceiroId]);

    if (result.rowCount === 0) {
      return new Response(JSON.stringify({ error: "Produto não encontrado ou já aprovado" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ message: "Produto aprovado com sucesso" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ Erro ao aprovar produto:", error);
    return new Response(JSON.stringify({ error: "Erro interno ao aprovar produto" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
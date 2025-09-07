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

    // Verificar se o voucher utilizado pertence ao parceiro
    const checkQuery = `
      SELECT vu.id 
      FROM voucher_utilizados vu
      INNER JOIN vouchers v ON vu.voucher_id = v.id
      WHERE vu.id = $1 AND v.parceiro_id = $2
    `;
    
    const checkResult = await pool.query(checkQuery, [id, parceiroId]);

    if (checkResult.rows.length === 0) {
      return new Response(JSON.stringify({ error: "Cupom não encontrado ou sem permissão" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Cupons já são considerados aprovados quando utilizados, 
    // mas podemos implementar lógica adicional aqui se necessário
    return new Response(JSON.stringify({ message: "Cupom aprovado com sucesso" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ Erro ao aprovar cupom:", error);
    return new Response(JSON.stringify({ error: "Erro interno ao aprovar cupom" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
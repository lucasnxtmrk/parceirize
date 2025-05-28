import { Pool } from "pg";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options"; // Configuração do NextAuth

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(req) {
  try {
    const session = await getServerSession(options);

    if (!session || session.user.role !== "parceiro") {
      return new Response(JSON.stringify({ error: "Acesso negado" }), { status: 403 });
    }

    console.log("📡 Buscando vouchers utilizados pelo parceiro:", session.user.email);

    // Buscar o ID do parceiro logado
    const parceiroQuery = `SELECT id FROM parceiros WHERE email = $1`;
    const parceiroResult = await pool.query(parceiroQuery, [session.user.email]);

    if (parceiroResult.rows.length === 0) {
      return new Response(JSON.stringify({ error: "Parceiro não encontrado" }), { status: 404 });
    }

    const parceiro = parceiroResult.rows[0];

    // Buscar os vouchers utilizados desse parceiro
    const query = `
      SELECT 
        v.codigo AS voucher_codigo, 
        c.nome || ' ' || c.sobrenome AS cliente_nome,
        vu.data_utilizacao AS data_utilizacao,
        vu.desconto AS desconto
      FROM voucher_utilizados vu
      INNER JOIN vouchers v ON vu.voucher_id = v.id
      INNER JOIN clientes c ON vu.cliente_id = c.id
      WHERE v.parceiro_id = $1
      ORDER BY vu.data_utilizacao DESC
    `;

    const result = await pool.query(query, [parceiro.id]);

    if (result.rows.length === 0) {
      console.log("⚠️ Nenhum voucher utilizado para este parceiro.");
      return new Response(JSON.stringify([]), { 
        status: 200, 
        headers: { "Content-Type": "application/json" } 
      });
    }

    // Formatar resposta
    const vouchersUtilizados = result.rows.map((row) => ({
      codigo: row.voucher_codigo,
      cliente: row.cliente_nome,
      dataUtilizacao: new Date(row.data_utilizacao).toLocaleString("pt-BR"),
      valorDesconto: `${row.desconto}%`,
    }));

    return new Response(JSON.stringify(vouchersUtilizados), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ Erro ao buscar vouchers utilizados:", error);
    return new Response(JSON.stringify({ error: "Erro interno ao buscar vouchers utilizados." }), { status: 500 });
  }
}

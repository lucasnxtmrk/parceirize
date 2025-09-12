import { Pool } from "pg";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options"; // Configuração do NextAuth

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(req) {
  try {
    const session = await getServerSession(options);

    if (!session || !["provedor", "superadmin"].includes(session.user.role)) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), { status: 403 });
    }

    console.log("📡 Buscando relatório de vouchers utilizados...");

    const query = `
      SELECT 
        v.codigo AS voucher_codigo,
        c.nome || ' ' || c.sobrenome AS cliente,
        vu.data_utilizacao,
        vu.desconto AS valor_desconto
      FROM voucher_utilizados vu
      JOIN clientes c ON vu.cliente_id = c.id
      JOIN vouchers v ON vu.voucher_id = v.id
      ORDER BY vu.data_utilizacao DESC
    `;

    const result = await pool.query(query);

    if (result.rows.length === 0) {
      console.log("⚠️ Nenhum voucher utilizado encontrado.");
      return new Response(JSON.stringify([]), { 
        status: 200, 
        headers: { "Content-Type": "application/json" } 
      });
    }

    const vouchersUtilizados = result.rows.map((row) => ({
      codigo: row.voucher_codigo,
      cliente: row.cliente,
      dataUtilizacao: new Date(row.data_utilizacao).toLocaleDateString("pt-BR"),
      valorDesconto: `${row.valor_desconto}%`
    }));

    return new Response(JSON.stringify(vouchersUtilizados), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ Erro ao buscar relatório de vouchers utilizados:", error);
    return new Response(JSON.stringify({ error: "Erro ao buscar relatório de vouchers utilizados" }), { status: 500 });
  }
}

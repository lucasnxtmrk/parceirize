import { Pool } from "pg";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options"; // Caminho do NextAuth

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(req) {
  try {
    // Obter sessão do usuário logado
    const session = await getServerSession(options);

    if (!session || session.user.role !== "parceiro") {
      return new Response(JSON.stringify({ error: "Acesso negado" }), { status: 403 });
    }

    console.log("📡 Buscando vouchers e desconto para parceiro:", session.user.email);

    // Buscar o ID do parceiro logado
    const parceiroQuery = `SELECT id, nome_empresa, foto FROM parceiros WHERE email = $1`;
    const parceiroResult = await pool.query(parceiroQuery, [session.user.email]);

    if (parceiroResult.rows.length === 0) {
      return new Response(JSON.stringify({ error: "Parceiro não encontrado" }), { status: 404 });
    }

    const parceiro = parceiroResult.rows[0];

    // Buscar os vouchers do parceiro
    const voucherQuery = `
      SELECT v.id AS voucher_id, v.codigo AS voucher_codigo, v.desconto AS voucher_desconto, v.data_criacao
      FROM vouchers v
      WHERE v.parceiro_id = $1
    `;
    const voucherResult = await pool.query(voucherQuery, [parceiro.id]);

    // Buscar o maior desconto do parceiro
    const descontoQuery = `
      SELECT MAX(desconto) AS desconto
      FROM vouchers
      WHERE parceiro_id = $1
    `;
    const descontoResult = await pool.query(descontoQuery, [parceiro.id]);

    const desconto = descontoResult.rows[0].desconto || "Nenhum desconto disponível";

    // Formatar os vouchers
    const vouchers = voucherResult.rows.map(voucher => ({
      nome: parceiro.nome_empresa,
      descricao: `${voucher.voucher_desconto}% de desconto`,
      codigo: voucher.voucher_codigo,
      validade: new Date(voucher.data_criacao).toLocaleDateString("pt-BR"),
      logo: parceiro.foto
    }));

    return new Response(JSON.stringify({ vouchers, desconto }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ Erro ao buscar vouchers e desconto:", error);
    return new Response(JSON.stringify({ error: "Erro interno ao buscar informações." }), { status: 500 });
  }
}

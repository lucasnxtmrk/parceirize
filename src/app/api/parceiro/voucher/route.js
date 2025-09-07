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
      SELECT v.id AS voucher_id, v.codigo AS voucher_codigo, v.desconto AS voucher_desconto, v.data_criacao, v.limite_uso
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
      id: voucher.voucher_id,
      nome: parceiro.nome_empresa,
      desconto: voucher.voucher_desconto,
      descricao: `${voucher.voucher_desconto}% de desconto`,
      codigo: voucher.voucher_codigo,
      validade: new Date(voucher.data_criacao).toLocaleDateString("pt-BR"),
      logo: parceiro.foto,
      limite_uso: voucher.limite_uso || 0
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

export async function PUT(req) {
  try {
    // Obter sessão do usuário logado
    const session = await getServerSession(options);

    if (!session || session.user.role !== "parceiro") {
      return new Response(JSON.stringify({ error: "Acesso negado" }), { status: 403 });
    }

    const body = await req.json();
    const { id, desconto, limite_uso } = body;

    // Buscar o ID do parceiro logado
    const parceiroQuery = `SELECT id FROM parceiros WHERE email = $1`;
    const parceiroResult = await pool.query(parceiroQuery, [session.user.email]);

    if (parceiroResult.rows.length === 0) {
      return new Response(JSON.stringify({ error: "Parceiro não encontrado" }), { status: 404 });
    }

    const parceiro_id = parceiroResult.rows[0].id;

    // Atualizar o voucher
    const updateQuery = `
      UPDATE vouchers 
      SET desconto = $1, limite_uso = $2, data_atualizacao = NOW()
      WHERE id = $3 AND parceiro_id = $4
    `;
    
    const result = await pool.query(updateQuery, [desconto, limite_uso, id, parceiro_id]);

    if (result.rowCount === 0) {
      return new Response(JSON.stringify({ error: "Voucher não encontrado ou sem permissão" }), { status: 404 });
    }

    return new Response(JSON.stringify({ message: "Voucher atualizado com sucesso" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ Erro ao atualizar voucher:", error);
    return new Response(JSON.stringify({ error: "Erro interno ao atualizar voucher." }), { status: 500 });
  }
}

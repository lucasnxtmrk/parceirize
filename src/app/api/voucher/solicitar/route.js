import { Pool } from "pg";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function POST(req) {
  try {
    const session = await getServerSession(options);

    if (!session || session.user.role !== 'cliente') {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const clienteId = session.user.id;
    const { parceiro_id, mensagem_cliente } = await req.json();

    if (!parceiro_id) {
      return new Response(JSON.stringify({ error: "ID do parceiro é obrigatório" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log(`📋 Cliente ${clienteId} solicitando voucher do parceiro ${parceiro_id}`);

    // Verificar se o parceiro existe
    const parceiroQuery = `SELECT id, nome_empresa FROM parceiros WHERE id = $1`;
    const parceiroResult = await pool.query(parceiroQuery, [parceiro_id]);

    if (parceiroResult.rows.length === 0) {
      return new Response(JSON.stringify({ error: "Parceiro não encontrado" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Verificar se já existe uma solicitação pendente para este parceiro
    const solicitacaoExistenteQuery = `
      SELECT id FROM voucher_solicitacoes
      WHERE cliente_id = $1 AND parceiro_id = $2 AND status = 'pendente'
    `;
    const solicitacaoExistente = await pool.query(solicitacaoExistenteQuery, [clienteId, parceiro_id]);

    if (solicitacaoExistente.rows.length > 0) {
      return new Response(JSON.stringify({
        error: "Você já tem uma solicitação pendente para este parceiro",
        codigo: "SOLICITACAO_PENDENTE"
      }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Buscar o voucher único do parceiro
    const voucherQuery = `
      SELECT id FROM vouchers
      WHERE parceiro_id = $1
    `;
    const voucherResult = await pool.query(voucherQuery, [parceiro_id]);

    if (voucherResult.rows.length === 0) {
      return new Response(JSON.stringify({
        error: "Este parceiro ainda não configurou seu voucher",
        codigo: "VOUCHER_NAO_CONFIGURADO"
      }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const voucherId = voucherResult.rows[0].id;

    // Calcular data de expiração (30 dias a partir de hoje)
    const dataExpiracao = new Date();
    dataExpiracao.setDate(dataExpiracao.getDate() + 30);

    // Criar a solicitação
    const insertQuery = `
      INSERT INTO voucher_solicitacoes (
        cliente_id,
        parceiro_id,
        voucher_id,
        mensagem_cliente,
        data_expiracao
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING id, data_solicitacao, data_expiracao
    `;

    const result = await pool.query(insertQuery, [
      clienteId,
      parceiro_id,
      voucherId,
      mensagem_cliente || null,
      dataExpiracao
    ]);

    const solicitacao = result.rows[0];

    console.log(`✅ Solicitação criada com ID: ${solicitacao.id}`);

    // Buscar informações completas da solicitação para retorno
    const solicitacaoCompleta = await pool.query(`
      SELECT
        s.*,
        p.nome_empresa as parceiro_nome,
        v.desconto as voucher_desconto
      FROM voucher_solicitacoes s
      JOIN parceiros p ON s.parceiro_id = p.id
      LEFT JOIN vouchers v ON s.voucher_id = v.id
      WHERE s.id = $1
    `, [solicitacao.id]);

    return new Response(JSON.stringify({
      success: true,
      message: "Solicitação enviada com sucesso!",
      solicitacao: solicitacaoCompleta.rows[0]
    }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ Erro ao criar solicitação de voucher:", error);
    return new Response(JSON.stringify({ error: "Erro interno ao processar solicitação" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
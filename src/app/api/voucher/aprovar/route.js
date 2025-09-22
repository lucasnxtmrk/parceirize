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

    const parceiroId = session.user.id;
    const { solicitacao_id, acao, resposta_parceiro } = await req.json();

    if (!solicitacao_id || !acao) {
      return new Response(JSON.stringify({ error: "Solicitação ID e ação são obrigatórios" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!['aprovar', 'rejeitar'].includes(acao)) {
      return new Response(JSON.stringify({ error: "Ação deve ser 'aprovar' ou 'rejeitar'" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log(`📋 Parceiro ${parceiroId} processando solicitação ${solicitacao_id}: ${acao}`);

    // Verificar se a solicitação existe e pertence ao parceiro
    const solicitacaoQuery = `
      SELECT
        vs.id,
        vs.status,
        vs.cliente_id,
        vs.parceiro_id,
        c.nome as cliente_nome,
        c.email as cliente_email
      FROM voucher_solicitacoes vs
      JOIN clientes c ON vs.cliente_id = c.id
      WHERE vs.id = $1 AND vs.parceiro_id = $2
    `;
    const solicitacaoResult = await pool.query(solicitacaoQuery, [solicitacao_id, parceiroId]);

    if (solicitacaoResult.rows.length === 0) {
      return new Response(JSON.stringify({ error: "Solicitação não encontrada" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const solicitacao = solicitacaoResult.rows[0];

    if (solicitacao.status !== 'pendente') {
      return new Response(JSON.stringify({ error: "Esta solicitação já foi processada" }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    }

    let updateQuery;
    let updateParams;
    let novoStatus;
    let codigoValidacao = null;

    if (acao === 'aprovar') {
      // Gerar código de validação único
      const codigoResult = await pool.query('SELECT generate_voucher_code()');
      codigoValidacao = codigoResult.rows[0].generate_voucher_code;

      updateQuery = `
        UPDATE voucher_solicitacoes
        SET
          status = 'aprovado',
          resposta_parceiro = $1,
          codigo_validacao = $2,
          data_resposta = NOW()
        WHERE id = $3
        RETURNING *
      `;
      updateParams = [resposta_parceiro || 'Voucher aprovado!', codigoValidacao, solicitacao_id];
      novoStatus = 'aprovado';
    } else {
      updateQuery = `
        UPDATE voucher_solicitacoes
        SET
          status = 'rejeitado',
          resposta_parceiro = $1,
          data_resposta = NOW()
        WHERE id = $2
        RETURNING *
      `;
      updateParams = [resposta_parceiro || 'Solicitação não aprovada.', solicitacao_id];
      novoStatus = 'rejeitado';
    }

    const result = await pool.query(updateQuery, updateParams);
    const solicitacaoAtualizada = result.rows[0];

    console.log(`✅ Solicitação ${solicitacao_id} ${novoStatus} com sucesso`);

    // Buscar informações completas da solicitação atualizada
    const solicitacaoCompleta = await pool.query(`
      SELECT
        s.*,
        c.nome as cliente_nome,
        c.email as cliente_email,
        p.nome_empresa as parceiro_nome,
        v.desconto as voucher_desconto
      FROM voucher_solicitacoes s
      JOIN clientes c ON s.cliente_id = c.id
      JOIN parceiros p ON s.parceiro_id = p.id
      LEFT JOIN vouchers v ON s.voucher_id = v.id
      WHERE s.id = $1
    `, [solicitacao_id]);

    return new Response(JSON.stringify({
      success: true,
      message: `Solicitação ${novoStatus} com sucesso!`,
      solicitacao: solicitacaoCompleta.rows[0],
      codigo_validacao: codigoValidacao
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ Erro ao processar solicitação de voucher:", error);
    return new Response(JSON.stringify({ error: "Erro interno ao processar solicitação" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
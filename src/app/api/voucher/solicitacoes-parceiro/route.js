import { Pool } from "pg";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(req) {
  try {
    const session = await getServerSession(options);

    if (!session || session.user.role !== 'parceiro') {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const parceiroId = session.user.id;

    console.log(`📋 Buscando solicitações para o parceiro ${parceiroId}`);

    const query = `
      SELECT
        s.id,
        s.status,
        s.mensagem_cliente,
        s.resposta_parceiro,
        s.codigo_validacao,
        s.data_solicitacao,
        s.data_resposta,
        s.data_expiracao,
        s.data_uso,
        c.nome as cliente_nome,
        c.email as cliente_email,
        v.id as voucher_id,
        v.codigo as voucher_codigo,
        v.desconto as voucher_desconto
      FROM voucher_solicitacoes s
      JOIN clientes c ON s.cliente_id = c.id
      LEFT JOIN vouchers v ON s.voucher_id = v.id
      WHERE s.parceiro_id = $1
      ORDER BY
        CASE s.status
          WHEN 'pendente' THEN 1
          WHEN 'aprovado' THEN 2
          WHEN 'usado' THEN 3
          WHEN 'rejeitado' THEN 4
          WHEN 'expirado' THEN 5
        END,
        s.data_solicitacao DESC
    `;

    const result = await pool.query(query, [parceiroId]);

    // Processar dados para adicionar informações úteis
    const solicitacoes = result.rows.map(row => {
      const agora = new Date();
      const dataExpiracao = new Date(row.data_expiracao);
      const expirado = dataExpiracao < agora && row.status === 'aprovado';

      return {
        ...row,
        expirado,
        dias_para_expirar: expirado ? 0 : Math.ceil((dataExpiracao - agora) / (1000 * 60 * 60 * 24)),
        pode_usar: row.status === 'aprovado' && !expirado && !row.data_uso,
        status_display: getStatusDisplay(row.status, expirado)
      };
    });

    // Estatísticas para o parceiro
    const stats = {
      total: solicitacoes.length,
      pendentes: solicitacoes.filter(s => s.status === 'pendente').length,
      aprovadas: solicitacoes.filter(s => s.status === 'aprovado' && !s.expirado && !s.data_uso).length,
      usadas: solicitacoes.filter(s => s.status === 'usado' || s.data_uso).length,
      rejeitadas: solicitacoes.filter(s => s.status === 'rejeitado').length,
      expiradas: solicitacoes.filter(s => s.expirado).length
    };

    console.log(`✅ Encontradas ${solicitacoes.length} solicitações`);

    return new Response(JSON.stringify({
      success: true,
      solicitacoes,
      stats
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ Erro ao buscar solicitações do parceiro:", error);
    return new Response(JSON.stringify({ error: "Erro interno ao buscar solicitações" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// Função auxiliar para obter display amigável do status
function getStatusDisplay(status, expirado) {
  if (expirado) return 'Expirado';

  const statusMap = {
    'pendente': 'Aguardando sua análise',
    'aprovado': 'Aprovado pelo parceiro',
    'rejeitado': 'Rejeitado',
    'usado': 'Voucher utilizado',
    'expirado': 'Expirado'
  };

  return statusMap[status] || status;
}
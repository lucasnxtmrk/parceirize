import { Pool } from "pg";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(req) {
  try {
    const session = await getServerSession(options);

    if (!session || session.user.role !== 'cliente') {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const clienteId = session.user.id;
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const parceiroId = searchParams.get('parceiro_id');

    console.log(`📋 Buscando solicitações do cliente ${clienteId}`);

    let query = `
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
        p.id as parceiro_id,
        p.nome_empresa as parceiro_nome,
        p.foto as parceiro_foto,
        p.cidade as parceiro_cidade,
        p.estado as parceiro_estado,
        v.id as voucher_id,
        v.codigo as voucher_codigo,
        v.desconto as voucher_desconto
      FROM voucher_solicitacoes s
      JOIN parceiros p ON s.parceiro_id = p.id
      LEFT JOIN vouchers v ON s.voucher_id = v.id
      WHERE s.cliente_id = $1
    `;

    const queryParams = [clienteId];
    let paramIndex = 2;

    // Filtro por status
    if (status) {
      query += ` AND s.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    // Filtro por parceiro
    if (parceiroId) {
      query += ` AND s.parceiro_id = $${paramIndex}`;
      queryParams.push(parceiroId);
      paramIndex++;
    }

    query += ` ORDER BY s.data_solicitacao DESC`;

    const result = await pool.query(query, queryParams);

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
        status_display: getStatusDisplay(row.status, expirado),
        parceiro: {
          id: row.parceiro_id,
          nome: row.parceiro_nome,
          foto: row.parceiro_foto,
          cidade: row.parceiro_cidade,
          estado: row.parceiro_estado
        },
        voucher: row.voucher_id ? {
          id: row.voucher_id,
          codigo: row.voucher_codigo,
          desconto: row.voucher_desconto
        } : null
      };
    });

    // Estatísticas para o cliente
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
    console.error("❌ Erro ao buscar solicitações:", error);
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
    'pendente': 'Aguardando aprovação',
    'aprovado': 'Aprovado - Pronto para usar',
    'rejeitado': 'Não aprovado',
    'usado': 'Já utilizado',
    'expirado': 'Expirado'
  };

  return statusMap[status] || status;
}
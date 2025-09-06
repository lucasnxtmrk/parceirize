import { Pool } from "pg";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(req, { params }) {
  try {
    const session = await getServerSession(options);
    
    if (!session || session.user.role !== 'cliente') {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const clienteId = session.user.id;
    const pedidoId = params.id;

    // Buscar dados do pedido
    const pedidoQuery = `
      SELECT 
        p.id,
        p.qr_code,
        p.status,
        p.total,
        p.created_at,
        p.validated_at,
        c.nome AS cliente_nome,
        c.sobrenome AS cliente_sobrenome
      FROM pedidos p
      INNER JOIN clientes c ON p.cliente_id = c.id
      WHERE p.id = $1 AND p.cliente_id = $2
    `;

    const pedidoResult = await pool.query(pedidoQuery, [pedidoId, clienteId]);
    
    if (pedidoResult.rows.length === 0) {
      return new Response(JSON.stringify({ error: "Pedido não encontrado" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Buscar itens do pedido
    const itensQuery = `
      SELECT 
        pi.id,
        pi.quantidade,
        pi.preco_unitario,
        pi.subtotal,
        p.nome AS produto_nome,
        p.descricao AS produto_descricao,
        p.imagem_url AS produto_imagem,
        parc.nome_empresa AS parceiro_nome
      FROM pedido_itens pi
      INNER JOIN produtos p ON pi.produto_id = p.id
      INNER JOIN parceiros parc ON pi.parceiro_id = parc.id
      WHERE pi.pedido_id = $1
    `;

    const itensResult = await pool.query(itensQuery, [pedidoId]);
    
    return new Response(JSON.stringify({
      pedido: pedidoResult.rows[0],
      itens: itensResult.rows
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Erro ao buscar pedido:", error);
    return new Response(JSON.stringify({ error: "Erro interno ao buscar pedido" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
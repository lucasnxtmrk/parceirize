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

    // Query para buscar estatísticas de economia do cliente
    const economiaQuery = `
      WITH cliente_economia AS (
        SELECT 
          p.id as pedido_id,
          p.created_at,
          SUM(pi.quantidade * pi.preco_unitario * COALESCE(pi.desconto_aplicado, pr.desconto, 0) / 100) as economia_pedido,
          COUNT(DISTINCT pi.parceiro_id) as parceiros_no_pedido
        FROM pedidos p
        INNER JOIN pedido_itens pi ON p.id = pi.pedido_id
        INNER JOIN produtos pr ON pi.produto_id = pr.id
        WHERE p.cliente_id = $1 
          AND pi.validado_at IS NOT NULL
          AND (pi.desconto_aplicado > 0 OR pr.desconto > 0)
        GROUP BY p.id, p.created_at
      ),
      parceiros_economia AS (
        SELECT 
          parc.id as parceiro_id,
          parc.nome_empresa as parceiro_nome,
          parc.foto as parceiro_foto,
          COUNT(DISTINCT p.id) as pedidos_count,
          SUM(pi.quantidade * pi.preco_unitario * COALESCE(pi.desconto_aplicado, pr.desconto, 0) / 100) as economia_total
        FROM pedidos p
        INNER JOIN pedido_itens pi ON p.id = pi.pedido_id
        INNER JOIN produtos pr ON pi.produto_id = pr.id
        INNER JOIN parceiros parc ON pi.parceiro_id = parc.id
        WHERE p.cliente_id = $1 
          AND pi.validado_at IS NOT NULL
          AND (pi.desconto_aplicado > 0 OR pr.desconto > 0)
        GROUP BY parc.id, parc.nome_empresa, parc.foto
        ORDER BY economia_total DESC
        LIMIT 10
      )
      SELECT 
        (SELECT COALESCE(SUM(economia_pedido), 0) FROM cliente_economia) as economia_total,
        (SELECT COUNT(*) FROM cliente_economia) as total_pedidos,
        (SELECT COUNT(DISTINCT parceiros_no_pedido) FROM cliente_economia) as parceiros_usados,
        (SELECT 
          CASE 
            WHEN COUNT(*) > 0 THEN COALESCE(AVG(economia_pedido), 0)
            ELSE 0 
          END 
          FROM cliente_economia
        ) as economia_media,
        (SELECT json_agg(
          json_build_object(
            'parceiro_id', parceiro_id,
            'parceiro_nome', parceiro_nome,
            'parceiro_foto', parceiro_foto,
            'pedidos_count', pedidos_count,
            'economia_total', economia_total
          )
        ) FROM parceiros_economia) as top_parceiros
    `;

    const result = await pool.query(economiaQuery, [clienteId]);
    
    if (result.rows.length === 0) {
      return new Response(JSON.stringify({
        economiaTotal: 0,
        totalPedidos: 0,
        parceirosUsados: 0,
        economiaMedia: 0,
        topParceiros: []
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const data = result.rows[0];
    
    return new Response(JSON.stringify({
      economiaTotal: parseFloat(data.economia_total) || 0,
      totalPedidos: parseInt(data.total_pedidos) || 0,
      parceirosUsados: parseInt(data.parceiros_usados) || 0,
      economiaMedia: parseFloat(data.economia_media) || 0,
      topParceiros: data.top_parceiros || []
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Erro ao buscar economia histórica:", error);
    return new Response(JSON.stringify({ error: "Erro interno ao buscar economia histórica" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
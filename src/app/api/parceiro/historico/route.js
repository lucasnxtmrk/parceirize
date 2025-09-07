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

    // Buscar histórico de produtos (pedidos)
    const produtosQuery = `
      SELECT DISTINCT
        pi.id,
        'produto' as type,
        pi.pedido_id as id,
        pr.nome as produto_nome,
        c.nome as cliente_nome,
        p.created_at as data,
        pi.subtotal as valor,
        pr.desconto,
        CASE 
          WHEN pi.validado_at IS NULL THEN 'pendente'
          ELSE 'validado'
        END as status
      FROM pedido_itens pi
      INNER JOIN pedidos p ON pi.pedido_id = p.id
      INNER JOIN produtos pr ON pi.produto_id = pr.id
      INNER JOIN clientes c ON p.cliente_id = c.id
      WHERE pi.parceiro_id = $1
      ORDER BY p.created_at DESC
      LIMIT 50
    `;

    // Buscar histórico de cupons (vouchers utilizados)
    const cuponsQuery = `
      SELECT DISTINCT
        vu.id,
        'cupom' as type,
        vu.id as id,
        NULL as produto_nome,
        v.codigo as cupom_codigo,
        c.nome as cliente_nome,
        vu.data_utilizacao as data,
        0 as valor,
        COALESCE(vu.desconto, v.desconto) as desconto,
        'validado' as status
      FROM voucher_utilizados vu
      INNER JOIN vouchers v ON vu.voucher_id = v.id
      INNER JOIN clientes c ON vu.cliente_id = c.id
      WHERE v.parceiro_id = $1
      ORDER BY vu.data_utilizacao DESC
      LIMIT 50
    `;

    const [produtosResult, cuponsResult] = await Promise.all([
      pool.query(produtosQuery, [parceiroId]),
      pool.query(cuponsQuery, [parceiroId])
    ]);

    // Combinar e ordenar por data
    const historico = [
      ...produtosResult.rows,
      ...cuponsResult.rows
    ].sort((a, b) => new Date(b.data) - new Date(a.data));

    return new Response(JSON.stringify({
      historico
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ Erro ao buscar histórico:", error);
    return new Response(JSON.stringify({ error: "Erro interno ao buscar histórico" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
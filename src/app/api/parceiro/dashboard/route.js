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

    // Buscar estatísticas principais
    const statsQuery = `
      WITH cliente_stats AS (
        SELECT 
          COUNT(DISTINCT pi.pedido_id) as total_pedidos,
          COUNT(DISTINCT p.cliente_id) as total_clientes,
          COUNT(DISTINCT CASE WHEN p.created_at >= NOW() - INTERVAL '30 days' THEN p.cliente_id END) as clientes_mes_atual,
          COUNT(DISTINCT CASE WHEN p.created_at >= NOW() - INTERVAL '60 days' AND p.created_at < NOW() - INTERVAL '30 days' THEN p.cliente_id END) as clientes_mes_anterior
        FROM pedido_itens pi
        INNER JOIN pedidos p ON pi.pedido_id = p.id
        WHERE pi.parceiro_id = $1 AND pi.validado_at IS NOT NULL
      ),
      desconto_stats AS (
        SELECT 
          COUNT(DISTINCT CASE WHEN pi.desconto_aplicado > 0 THEN pi.pedido_id END) as pedidos_com_desconto,
          COALESCE(SUM(pi.quantidade * pi.preco_unitario * pi.desconto_aplicado / 100), 0) as desconto_total_dado,
          COALESCE(SUM(CASE WHEN p.created_at >= NOW() - INTERVAL '30 days' THEN pi.quantidade * pi.preco_unitario * pi.desconto_aplicado / 100 ELSE 0 END), 0) as desconto_mes_atual,
          COALESCE(SUM(CASE WHEN p.created_at >= NOW() - INTERVAL '60 days' AND p.created_at < NOW() - INTERVAL '30 days' THEN pi.quantidade * pi.preco_unitario * pi.desconto_aplicado / 100 ELSE 0 END), 0) as desconto_mes_anterior
        FROM pedido_itens pi
        INNER JOIN pedidos p ON pi.pedido_id = p.id
        WHERE pi.parceiro_id = $1 AND pi.validado_at IS NOT NULL
      ),
      vendas_stats AS (
        SELECT 
          COALESCE(SUM(CASE WHEN p.created_at >= NOW() - INTERVAL '30 days' THEN pi.subtotal ELSE 0 END), 0) as vendas_mes,
          COALESCE(SUM(CASE WHEN p.created_at >= NOW() - INTERVAL '60 days' AND p.created_at < NOW() - INTERVAL '30 days' THEN pi.subtotal ELSE 0 END), 0) as vendas_mes_anterior,
          COUNT(DISTINCT CASE WHEN p.created_at >= NOW() - INTERVAL '30 days' THEN pi.pedido_id END) as pedidos_mes
        FROM pedido_itens pi
        INNER JOIN pedidos p ON pi.pedido_id = p.id
        WHERE pi.parceiro_id = $1 AND pi.validado_at IS NOT NULL
      ),
      produto_stats AS (
        SELECT 
          COUNT(*) as total_produtos,
          COUNT(CASE WHEN ativo = true THEN 1 END) as produtos_ativos
        FROM produtos
        WHERE parceiro_id = $1
      )
      SELECT 
        cs.total_clientes,
        cs.clientes_mes_atual as clientes_ativos,
        CASE 
          WHEN cs.clientes_mes_anterior > 0 THEN 
            ROUND(((cs.clientes_mes_atual - cs.clientes_mes_anterior) * 100.0 / cs.clientes_mes_anterior), 1)
          ELSE 0 
        END as crescimento_clientes,
        ds.desconto_total_dado,
        ds.pedidos_com_desconto,
        CASE 
          WHEN ds.desconto_mes_anterior > 0 THEN 
            ROUND(((ds.desconto_mes_atual - ds.desconto_mes_anterior) * 100.0 / ds.desconto_mes_anterior), 1)
          ELSE 0 
        END as crescimento_desconto,
        vs.vendas_mes,
        vs.pedidos_mes,
        CASE 
          WHEN vs.vendas_mes_anterior > 0 THEN 
            ROUND(((vs.vendas_mes - vs.vendas_mes_anterior) * 100.0 / vs.vendas_mes_anterior), 1)
          ELSE 0 
        END as crescimento_vendas,
        ps.produtos_ativos,
        ps.total_produtos,
        0 as crescimento_produtos
      FROM cliente_stats cs, desconto_stats ds, vendas_stats vs, produto_stats ps
    `;

    const statsResult = await pool.query(statsQuery, [parceiroId]);
    const stats = statsResult.rows[0];

    // Buscar dados para gráfico de vendas (últimos 30 dias)
    const chartQuery = `
      SELECT 
        DATE(pi.validado_at) as data,
        COALESCE(SUM(pi.subtotal), 0) as vendas
      FROM pedido_itens pi
      WHERE pi.parceiro_id = $1 
        AND pi.validado_at >= NOW() - INTERVAL '30 days'
        AND pi.validado_at IS NOT NULL
      GROUP BY DATE(pi.validado_at)
      ORDER BY data
    `;

    const chartResult = await pool.query(chartQuery, [parceiroId]);
    
    // Preencher dias sem vendas
    const chartData = {
      labels: [],
      values: []
    };

    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayMonth = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      
      chartData.labels.push(dayMonth);
      
      const dayData = chartResult.rows.find(row => row.data.toISOString().split('T')[0] === dateStr);
      chartData.values.push(dayData ? parseFloat(dayData.vendas) : 0);
    }

    // Buscar produtos mais vendidos
    const topProductsQuery = `
      SELECT 
        pr.id,
        pr.nome,
        pr.preco,
        pr.desconto,
        SUM(pi.quantidade) as quantidade_vendida,
        SUM(pi.subtotal) as receita_total
      FROM pedido_itens pi
      INNER JOIN produtos pr ON pi.produto_id = pr.id
      WHERE pi.parceiro_id = $1 
        AND pi.validado_at >= NOW() - INTERVAL '30 days'
        AND pi.validado_at IS NOT NULL
      GROUP BY pr.id, pr.nome, pr.preco, pr.desconto
      ORDER BY quantidade_vendida DESC
      LIMIT 5
    `;

    const topProductsResult = await pool.query(topProductsQuery, [parceiroId]);

    // Buscar vendas recentes
    const recentSalesQuery = `
      SELECT DISTINCT
        p.id,
        p.created_at,
        p.total,
        p.status,
        p.cliente_id,
        c.nome as cliente_nome,
        COUNT(pi.id) as itens_count,
        SUM(pi.quantidade * pi.preco_unitario) as total_original,
        SUM(pi.quantidade * pi.preco_unitario * pi.desconto_aplicado / 100) as desconto_total
      FROM pedidos p
      INNER JOIN clientes c ON p.cliente_id = c.id
      INNER JOIN pedido_itens pi ON p.id = pi.pedido_id
      WHERE pi.parceiro_id = $1 AND pi.validado_at IS NOT NULL
      GROUP BY p.id, p.created_at, p.total, p.status, p.cliente_id, c.nome
      ORDER BY p.created_at DESC
      LIMIT 10
    `;

    const recentSalesResult = await pool.query(recentSalesQuery, [parceiroId]);

    return new Response(JSON.stringify({
      stats: {
        totalClientes: parseInt(stats.total_clientes) || 0,
        clientesAtivos: parseInt(stats.clientes_ativos) || 0,
        crescimentoClientes: parseFloat(stats.crescimento_clientes) || 0,
        descontoTotalDado: parseFloat(stats.desconto_total_dado) || 0,
        pedidosComDesconto: parseInt(stats.pedidos_com_desconto) || 0,
        crescimentoDesconto: parseFloat(stats.crescimento_desconto) || 0,
        vendasMes: parseFloat(stats.vendas_mes) || 0,
        pedidosMes: parseInt(stats.pedidos_mes) || 0,
        crescimentoVendas: parseFloat(stats.crescimento_vendas) || 0,
        produtosAtivos: parseInt(stats.produtos_ativos) || 0,
        totalProdutos: parseInt(stats.total_produtos) || 0,
        crescimentoProdutos: parseFloat(stats.crescimento_produtos) || 0
      },
      chartData: {
        vendas: chartData
      },
      topProducts: topProductsResult.rows.map(product => ({
        ...product,
        preco: parseFloat(product.preco),
        desconto: parseFloat(product.desconto),
        quantidade_vendida: parseInt(product.quantidade_vendida),
        receita_total: parseFloat(product.receita_total)
      })),
      recentSales: recentSalesResult.rows.map(sale => ({
        ...sale,
        total: parseFloat(sale.total),
        total_original: parseFloat(sale.total_original),
        desconto_total: parseFloat(sale.desconto_total),
        itens_count: parseInt(sale.itens_count)
      }))
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Erro ao buscar dashboard:", error);
    return new Response(JSON.stringify({ error: "Erro interno ao buscar dashboard" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
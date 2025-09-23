import { Pool } from "pg";
import { withTenantIsolation } from "@/lib/tenant-helper";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// ✅ GET - DASHBOARD DO PARCEIRO COM ISOLAMENTO MULTI-TENANT
export const GET = withTenantIsolation(async (request, { tenant }) => {
  try {
    if (!['parceiro'].includes(tenant.role)) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), { status: 403 });
    }

    console.log("📊 Dashboard para parceiro:", tenant.user.id, "no tenant:", tenant.tenant_id);

    const parceiroId = tenant.user.id;

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
          COUNT(DISTINCT CASE WHEN pr.desconto > 0 THEN pi.pedido_id END) as pedidos_com_desconto,
          COALESCE(SUM(pi.quantidade * pi.preco_unitario * pr.desconto / 100), 0) as desconto_total_dado,
          COALESCE(SUM(CASE WHEN p.created_at >= NOW() - INTERVAL '30 days' THEN pi.quantidade * pi.preco_unitario * pr.desconto / 100 ELSE 0 END), 0) as desconto_mes_atual,
          COALESCE(SUM(CASE WHEN p.created_at >= NOW() - INTERVAL '60 days' AND p.created_at < NOW() - INTERVAL '30 days' THEN pi.quantidade * pi.preco_unitario * pr.desconto / 100 ELSE 0 END), 0) as desconto_mes_anterior
        FROM pedido_itens pi
        INNER JOIN pedidos p ON pi.pedido_id = p.id
        INNER JOIN produtos pr ON pi.produto_id = pr.id
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
      ),
      vendas_hoje AS (
        SELECT 
          COALESCE(SUM(pi.subtotal), 0) as vendas_hoje
        FROM pedido_itens pi
        INNER JOIN pedidos p ON pi.pedido_id = p.id
        WHERE pi.parceiro_id = $1 
          AND pi.validado_at IS NOT NULL
          AND DATE(pi.validado_at) = CURRENT_DATE
      ),
      voucher_stats AS (
        SELECT 
          COUNT(*) as vouchers_ativos,
          (SELECT COUNT(*) FROM voucher_utilizados vu 
           INNER JOIN vouchers v ON vu.voucher_id = v.id 
           WHERE v.parceiro_id = $1) as vouchers_usados,
          (SELECT COUNT(*) FROM voucher_utilizados vu 
           INNER JOIN vouchers v ON vu.voucher_id = v.id 
           WHERE v.parceiro_id = $1 AND vu.data_utilizacao >= NOW() - INTERVAL '30 days') as vouchers_usados_mes,
          (SELECT COUNT(*) FROM voucher_utilizados vu 
           INNER JOIN vouchers v ON vu.voucher_id = v.id 
           WHERE v.parceiro_id = $1 AND vu.data_utilizacao >= NOW() - INTERVAL '60 days' 
           AND vu.data_utilizacao < NOW() - INTERVAL '30 days') as vouchers_usados_mes_anterior,
          COALESCE(
            (SELECT SUM(v.desconto * (
              SELECT AVG(pi.preco_unitario * pi.quantidade) 
              FROM pedido_itens pi 
              INNER JOIN pedidos p ON pi.pedido_id = p.id 
              WHERE pi.parceiro_id = $1 AND pi.validado_at >= NOW() - INTERVAL '30 days'
            ) / 100) 
            FROM voucher_utilizados vu 
            INNER JOIN vouchers v ON vu.voucher_id = v.id 
            WHERE v.parceiro_id = $1 AND vu.data_utilizacao >= NOW() - INTERVAL '30 days'), 0
          ) as economia_vouchers_mes,
          COALESCE(
            (SELECT SUM(v.desconto * (
              SELECT AVG(pi.preco_unitario * pi.quantidade) 
              FROM pedido_itens pi 
              INNER JOIN pedidos p ON pi.pedido_id = p.id 
              WHERE pi.parceiro_id = $1 AND pi.validado_at >= NOW() - INTERVAL '60 days' 
              AND pi.validado_at < NOW() - INTERVAL '30 days'
            ) / 100) 
            FROM voucher_utilizados vu 
            INNER JOIN vouchers v ON vu.voucher_id = v.id 
            WHERE v.parceiro_id = $1 AND vu.data_utilizacao >= NOW() - INTERVAL '60 days' 
            AND vu.data_utilizacao < NOW() - INTERVAL '30 days'), 0
          ) as economia_vouchers_mes_anterior
        FROM vouchers
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
        0 as crescimento_produtos,
        vh.vendas_hoje,
        vcs.vouchers_ativos,
        vcs.vouchers_usados,
        vcs.vouchers_usados_mes,
        vcs.economia_vouchers_mes,
        CASE 
          WHEN vcs.vouchers_usados_mes_anterior > 0 THEN 
            ROUND(((vcs.vouchers_usados_mes - vcs.vouchers_usados_mes_anterior) * 100.0 / vcs.vouchers_usados_mes_anterior), 1)
          ELSE 0 
        END as crescimento_vouchers,
        CASE 
          WHEN vcs.economia_vouchers_mes_anterior > 0 THEN 
            ROUND(((vcs.economia_vouchers_mes - vcs.economia_vouchers_mes_anterior) * 100.0 / vcs.economia_vouchers_mes_anterior), 1)
          ELSE 0 
        END as crescimento_economia_vouchers
      FROM cliente_stats cs, desconto_stats ds, vendas_stats vs, produto_stats ps, vendas_hoje vh, voucher_stats vcs
    `;

    const statsResult = await pool.query(statsQuery, [parceiroId, tenant.tenant_id]);
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

    const chartResult = await pool.query(chartQuery, [parceiroId, tenant.tenant_id]);
    
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

    const topProductsResult = await pool.query(topProductsQuery, [parceiroId, tenant.tenant_id]);

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
        SUM(pi.quantidade * pi.preco_unitario * COALESCE(pi.desconto_aplicado, pr.desconto, 0) / 100) as desconto_total
      FROM pedidos p
      INNER JOIN clientes c ON p.cliente_id = c.id
      INNER JOIN pedido_itens pi ON p.id = pi.pedido_id
      INNER JOIN produtos pr ON pi.produto_id = pr.id
      WHERE pi.parceiro_id = $1 AND pi.validado_at IS NOT NULL
      GROUP BY p.id, p.created_at, p.total, p.status, p.cliente_id, c.nome
      ORDER BY p.created_at DESC
      LIMIT 10
    `;

    const recentSalesResult = await pool.query(recentSalesQuery, [parceiroId, tenant.tenant_id]);

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
        crescimentoProdutos: parseFloat(stats.crescimento_produtos) || 0,
        vendasHoje: parseFloat(stats.vendas_hoje) || 0,
        vouchersAtivos: parseInt(stats.vouchers_ativos) || 0,
        vouchersUsados: parseInt(stats.vouchers_usados) || 0,
        vouchersUsadosMes: parseInt(stats.vouchers_usados_mes) || 0,
        economiaVouchersMes: parseFloat(stats.economia_vouchers_mes) || 0,
        crescimentoVouchers: parseFloat(stats.crescimento_vouchers) || 0,
        crescimentoEconomiaVouchers: parseFloat(stats.crescimento_economia_vouchers) || 0
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
});
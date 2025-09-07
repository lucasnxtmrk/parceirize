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
    console.log("📊 Buscando dashboard completo do parceiro:", parceiroId);

    // 1. Estatísticas principais do parceiro
    const statsQuery = `
      WITH vendas_stats AS (
        SELECT 
          COUNT(DISTINCT pi.pedido_id) as total_vendas,
          COALESCE(SUM(pi.subtotal), 0) as receita_total,
          COALESCE(SUM(CASE WHEN pi.validado_at >= NOW() - INTERVAL '30 days' THEN pi.subtotal ELSE 0 END), 0) as receita_mes,
          COALESCE(SUM(CASE WHEN DATE(pi.validado_at) = CURRENT_DATE THEN pi.subtotal ELSE 0 END), 0) as receita_hoje,
          COUNT(DISTINCT CASE WHEN pi.validado_at >= NOW() - INTERVAL '30 days' THEN pi.pedido_id END) as vendas_mes,
          COUNT(DISTINCT pi.cliente_id) as clientes_unicos
        FROM pedido_itens pi
        WHERE pi.parceiro_id = $1 AND pi.validado_at IS NOT NULL
      ),
      produtos_stats AS (
        SELECT 
          COUNT(*) as total_produtos,
          COUNT(CASE WHEN ativo = true THEN 1 END) as produtos_ativos,
          COALESCE(AVG(preco), 0) as preco_medio
        FROM produtos
        WHERE parceiro_id = $1
      ),
      vouchers_stats AS (
        SELECT 
          COUNT(*) as total_vouchers,
          COUNT(CASE WHEN ativo = true THEN 1 END) as vouchers_ativos,
          (SELECT COUNT(*) FROM voucher_utilizados vu 
           INNER JOIN vouchers v ON vu.voucher_id = v.id 
           WHERE v.parceiro_id = $1) as vouchers_utilizados,
          (SELECT COUNT(*) FROM voucher_utilizados vu 
           INNER JOIN vouchers v ON vu.voucher_id = v.id 
           WHERE v.parceiro_id = $1 AND vu.data_utilizacao >= NOW() - INTERVAL '30 days') as vouchers_utilizados_mes
        FROM vouchers
        WHERE parceiro_id = $1
      )
      SELECT 
        v.total_vendas,
        v.receita_total,
        v.receita_mes,
        v.receita_hoje,
        v.vendas_mes,
        v.clientes_unicos,
        p.total_produtos,
        p.produtos_ativos,
        p.preco_medio,
        vo.total_vouchers,
        vo.vouchers_ativos,
        vo.vouchers_utilizados,
        vo.vouchers_utilizados_mes
      FROM vendas_stats v, produtos_stats p, vouchers_stats vo
    `;

    const statsResult = await pool.query(statsQuery, [parceiroId]);
    const stats = statsResult.rows[0];

    // 2. Vendas por dia (últimos 30 dias)
    const vendasDiariasQuery = `
      WITH dias AS (
        SELECT 
          DATE(CURRENT_DATE - INTERVAL '1 day' * generate_series(0, 29)) as dia
      )
      SELECT 
        TO_CHAR(d.dia, 'DD/MM') as dia_nome,
        COALESCE(SUM(pi.subtotal), 0) as vendas
      FROM dias d
      LEFT JOIN pedido_itens pi ON DATE(pi.validado_at) = d.dia AND pi.parceiro_id = $1 AND pi.validado_at IS NOT NULL
      GROUP BY d.dia, dia_nome
      ORDER BY d.dia
    `;

    const vendasDiariasResult = await pool.query(vendasDiariasQuery, [parceiroId]);

    // 3. Produtos mais vendidos
    const topProdutosQuery = `
      SELECT 
        p.nome,
        SUM(pi.quantidade) as quantidade_vendida,
        SUM(pi.subtotal) as receita_produto,
        p.preco,
        p.desconto
      FROM pedido_itens pi
      INNER JOIN produtos p ON pi.produto_id = p.id
      WHERE pi.parceiro_id = $1 AND pi.validado_at IS NOT NULL
      GROUP BY p.id, p.nome, p.preco, p.desconto
      ORDER BY quantidade_vendida DESC
      LIMIT 5
    `;

    const topProdutosResult = await pool.query(topProdutosQuery, [parceiroId]);

    // 4. Vendas por hora do dia (padrão de horário)
    const vendasHorarioQuery = `
      SELECT 
        EXTRACT(hour FROM pi.validado_at) as hora,
        COUNT(DISTINCT pi.pedido_id) as vendas,
        COALESCE(SUM(pi.subtotal), 0) as receita
      FROM pedido_itens pi
      WHERE pi.parceiro_id = $1 
        AND pi.validado_at IS NOT NULL 
        AND pi.validado_at >= NOW() - INTERVAL '30 days'
      GROUP BY EXTRACT(hour FROM pi.validado_at)
      ORDER BY hora
    `;

    const vendasHorarioResult = await pool.query(vendasHorarioQuery, [parceiroId]);

    // 5. Clientes mais frequentes
    const topClientesQuery = `
      SELECT 
        c.nome,
        COUNT(DISTINCT pi.pedido_id) as pedidos,
        SUM(pi.subtotal) as total_gasto
      FROM pedido_itens pi
      INNER JOIN pedidos p ON pi.pedido_id = p.id
      INNER JOIN clientes c ON p.cliente_id = c.id
      WHERE pi.parceiro_id = $1 AND pi.validado_at IS NOT NULL
      GROUP BY c.id, c.nome
      ORDER BY pedidos DESC
      LIMIT 5
    `;

    const topClientesResult = await pool.query(topClientesQuery, [parceiroId]);

    // 6. Vouchers por status de utilização
    const vouchersStatusQuery = `
      SELECT 
        v.codigo,
        v.desconto,
        CASE 
          WHEN vu.id IS NOT NULL THEN 'Utilizado'
          WHEN v.ativo = true THEN 'Ativo'
          ELSE 'Inativo'
        END as status,
        vu.data_utilizacao
      FROM vouchers v
      LEFT JOIN voucher_utilizados vu ON v.id = vu.voucher_id
      WHERE v.parceiro_id = $1
      ORDER BY 
        CASE WHEN vu.id IS NOT NULL THEN vu.data_utilizacao ELSE v.created_at END DESC
      LIMIT 10
    `;

    const vouchersStatusResult = await pool.query(vouchersStatusQuery, [parceiroId]);

    // 7. Meta mensal (baseada na média dos últimos 3 meses)
    const metaMensalQuery = `
      SELECT 
        COALESCE(AVG(receita_mensal), 0) * 1.2 as meta_sugerida
      FROM (
        SELECT 
          DATE_TRUNC('month', pi.validado_at) as mes,
          SUM(pi.subtotal) as receita_mensal
        FROM pedido_itens pi
        WHERE pi.parceiro_id = $1 
          AND pi.validado_at IS NOT NULL 
          AND pi.validado_at >= NOW() - INTERVAL '3 months'
        GROUP BY DATE_TRUNC('month', pi.validado_at)
      ) receitas_mensais
    `;

    const metaMensalResult = await pool.query(metaMensalQuery, [parceiroId]);

    // Calcular KPIs
    const ticketMedio = stats.total_vendas > 0 ? stats.receita_total / stats.total_vendas : 0;
    const taxaConversaoVouchers = stats.total_vouchers > 0 ? (stats.vouchers_utilizados / stats.total_vouchers) * 100 : 0;
    const receitaPorCliente = stats.clientes_unicos > 0 ? stats.receita_total / stats.clientes_unicos : 0;

    // Montar resposta
    const dashboardData = {
      stats: {
        totalVendas: parseInt(stats.total_vendas),
        receitaTotal: parseFloat(stats.receita_total),
        receitaMes: parseFloat(stats.receita_mes),
        receitaHoje: parseFloat(stats.receita_hoje),
        vendasMes: parseInt(stats.vendas_mes),
        clientesUnicos: parseInt(stats.clientes_unicos),
        totalProdutos: parseInt(stats.total_produtos),
        produtosAtivos: parseInt(stats.produtos_ativos),
        precoMedio: parseFloat(stats.preco_medio),
        totalVouchers: parseInt(stats.total_vouchers),
        vouchersAtivos: parseInt(stats.vouchers_ativos),
        vouchersUtilizados: parseInt(stats.vouchers_utilizados),
        vouchersUtilizadosMes: parseInt(stats.vouchers_utilizados_mes),
        metaMensal: parseFloat(metaMensalResult.rows[0]?.meta_sugerida || stats.receita_mes * 1.2)
      },

      kpis: {
        ticketMedio: parseFloat(ticketMedio.toFixed(2)),
        taxaConversaoVouchers: parseFloat(taxaConversaoVouchers.toFixed(1)),
        receitaPorCliente: parseFloat(receitaPorCliente.toFixed(2))
      },

      vendasDiarias: {
        dias: vendasDiariasResult.rows.map(row => row.dia_nome),
        valores: vendasDiariasResult.rows.map(row => parseFloat(row.vendas))
      },

      topProdutos: topProdutosResult.rows.map(row => ({
        nome: row.nome,
        quantidade: parseInt(row.quantidade_vendida),
        receita: parseFloat(row.receita_produto),
        preco: parseFloat(row.preco),
        desconto: parseFloat(row.desconto)
      })),

      vendasHorario: {
        horas: Array.from({length: 24}, (_, i) => `${i}h`),
        vendas: Array.from({length: 24}, (_, i) => {
          const horaData = vendasHorarioResult.rows.find(row => parseInt(row.hora) === i);
          return horaData ? parseInt(horaData.vendas) : 0;
        }),
        receitas: Array.from({length: 24}, (_, i) => {
          const horaData = vendasHorarioResult.rows.find(row => parseInt(row.hora) === i);
          return horaData ? parseFloat(horaData.receita) : 0;
        })
      },

      topClientes: topClientesResult.rows.map(row => ({
        nome: row.nome,
        pedidos: parseInt(row.pedidos),
        totalGasto: parseFloat(row.total_gasto)
      })),

      vouchersStatus: vouchersStatusResult.rows.map((row, index) => ({
        id: index + 1,
        codigo: row.codigo,
        desconto: parseFloat(row.desconto),
        status: row.status,
        dataUtilizacao: row.data_utilizacao
      }))
    };

    console.log("✅ Dashboard do parceiro carregado com sucesso");

    return new Response(JSON.stringify(dashboardData), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ Erro ao buscar dashboard do parceiro:", error);
    
    // Fallback data
    const fallbackData = {
      stats: {
        totalVendas: 0,
        receitaTotal: 0,
        receitaMes: 0,
        receitaHoje: 0,
        vendasMes: 0,
        clientesUnicos: 0,
        totalProdutos: 0,
        produtosAtivos: 0,
        precoMedio: 0,
        totalVouchers: 0,
        vouchersAtivos: 0,
        vouchersUtilizados: 0,
        vouchersUtilizadosMes: 0,
        metaMensal: 1000
      },
      kpis: {
        ticketMedio: 0,
        taxaConversaoVouchers: 0,
        receitaPorCliente: 0
      },
      vendasDiarias: {
        dias: ['01/01', '02/01', '03/01'],
        valores: [0, 0, 0]
      },
      topProdutos: [],
      vendasHorario: {
        horas: ['0h', '1h', '2h'],
        vendas: [0, 0, 0],
        receitas: [0, 0, 0]
      },
      topClientes: [],
      vouchersStatus: []
    };

    return new Response(JSON.stringify(fallbackData), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
}
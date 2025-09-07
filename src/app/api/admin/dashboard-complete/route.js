import { Pool } from "pg";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET() {
  try {
    const session = await getServerSession(options);
    
    if (!session || session.user.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    console.log("📊 Buscando dados completos do dashboard admin...");

    // 1. Estatísticas principais
    const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM clientes WHERE ativo = true) as total_clientes,
        (SELECT COUNT(*) FROM parceiros WHERE ativo = true) as total_parceiros,
        (SELECT COUNT(*) FROM vouchers WHERE ativo = true) as total_vouchers,
        (SELECT COUNT(*) FROM voucher_utilizados) as vouchers_utilizados,
        (SELECT COUNT(*) FROM produtos WHERE ativo = true) as produtos_ativos,
        (SELECT COALESCE(SUM(subtotal), 0) FROM pedido_itens WHERE validado_at IS NOT NULL) as receita_total
    `;

    const statsResult = await pool.query(statsQuery);
    const stats = statsResult.rows[0];

    // 2. Gráfico de crescimento - últimos 6 meses
    const crescimentoQuery = `
      WITH meses AS (
        SELECT 
          TO_CHAR(DATE_TRUNC('month', CURRENT_DATE - INTERVAL '5 months') + INTERVAL '1 month' * generate_series(0, 5), 'MM/YYYY') as mes,
          DATE_TRUNC('month', CURRENT_DATE - INTERVAL '5 months') + INTERVAL '1 month' * generate_series(0, 5) as data_mes
      ),
      dados_clientes AS (
        SELECT 
          TO_CHAR(DATE_TRUNC('month', COALESCE(created_at, NOW())), 'MM/YYYY') as mes,
          COUNT(*) as novos_clientes
        FROM clientes 
        WHERE COALESCE(created_at, NOW()) >= CURRENT_DATE - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', COALESCE(created_at, NOW()))
      ),
      dados_parceiros AS (
        SELECT 
          TO_CHAR(DATE_TRUNC('month', COALESCE(created_at, NOW())), 'MM/YYYY') as mes,
          COUNT(*) as novos_parceiros
        FROM parceiros 
        WHERE COALESCE(created_at, NOW()) >= CURRENT_DATE - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', COALESCE(created_at, NOW()))
      )
      SELECT 
        m.mes,
        COALESCE(c.novos_clientes, 0) as clientes,
        COALESCE(p.novos_parceiros, 0) as parceiros
      FROM meses m
      LEFT JOIN dados_clientes c ON m.mes = c.mes
      LEFT JOIN dados_parceiros p ON m.mes = p.mes
      ORDER BY m.data_mes
    `;

    const crescimentoResult = await pool.query(crescimentoQuery);

    // 3. Vouchers por categoria de parceiro
    const vouchersCategoriasQuery = `
      SELECT 
        COALESCE(p.nicho, 'Sem categoria') as categoria,
        COUNT(v.id) as total_vouchers,
        COUNT(CASE WHEN v.ativo = true THEN 1 END) as ativos
      FROM vouchers v
      LEFT JOIN parceiros p ON v.parceiro_id = p.id
      GROUP BY p.nicho
      ORDER BY total_vouchers DESC
      LIMIT 6
    `;

    const vouchersCategoriasResult = await pool.query(vouchersCategoriasQuery);

    // 4. Vendas por mês (últimos 6 meses)
    const vendasMensaisQuery = `
      WITH meses AS (
        SELECT 
          TO_CHAR(DATE_TRUNC('month', CURRENT_DATE - INTERVAL '5 months') + INTERVAL '1 month' * generate_series(0, 5), 'Mon/YY') as mes_nome,
          DATE_TRUNC('month', CURRENT_DATE - INTERVAL '5 months') + INTERVAL '1 month' * generate_series(0, 5) as data_mes
      )
      SELECT 
        m.mes_nome as mes,
        COALESCE(SUM(pi.subtotal), 0) as vendas
      FROM meses m
      LEFT JOIN pedido_itens pi ON DATE_TRUNC('month', pi.validado_at) = m.data_mes AND pi.validado_at IS NOT NULL
      GROUP BY m.mes_nome, m.data_mes
      ORDER BY m.data_mes
    `;

    const vendasMensaisResult = await pool.query(vendasMensaisQuery);

    // 5. Top produtos mais vendidos
    const topProdutosQuery = `
      SELECT 
        pr.nome,
        SUM(pi.quantidade) as quantidade_vendida,
        SUM(pi.subtotal) as receita
      FROM pedido_itens pi
      INNER JOIN produtos pr ON pi.produto_id = pr.id
      WHERE pi.validado_at IS NOT NULL
      GROUP BY pr.id, pr.nome
      ORDER BY quantidade_vendida DESC
      LIMIT 5
    `;

    const topProdutosResult = await pool.query(topProdutosQuery);

    // 6. Atividade recente
    const atividadeRecenteQuery = `
      SELECT * FROM (
        SELECT 
          'Voucher utilizado' as tipo,
          CONCAT('Voucher ', v.codigo, ' foi utilizado') as descricao,
          vu.data_utilizacao as data
        FROM voucher_utilizados vu
        INNER JOIN vouchers v ON vu.voucher_id = v.id
        WHERE vu.data_utilizacao >= NOW() - INTERVAL '7 days'
        
        UNION ALL
        
        SELECT 
          'Venda realizada' as tipo,
          CONCAT('Venda de R$ ', ROUND(pi.subtotal::numeric, 2)) as descricao,
          pi.validado_at as data
        FROM pedido_itens pi
        WHERE pi.validado_at >= NOW() - INTERVAL '7 days' AND pi.validado_at IS NOT NULL
        
        UNION ALL
        
        SELECT 
          'Cliente cadastrado' as tipo,
          CONCAT('Cliente ', c.nome, ' se cadastrou') as descricao,
          COALESCE(c.created_at, NOW()) as data
        FROM clientes c
        WHERE COALESCE(c.created_at, NOW()) >= NOW() - INTERVAL '7 days'
      ) atividades
      ORDER BY data DESC
      LIMIT 10
    `;

    const atividadeRecenteResult = await pool.query(atividadeRecenteQuery);

    // 7. KPIs calculados
    const kpisQuery = `
      SELECT 
        -- Taxa de conversão de vouchers (vouchers utilizados / total vouchers)
        CASE 
          WHEN COUNT(v.id) > 0 THEN ROUND((COUNT(vu.id) * 100.0 / COUNT(v.id)), 1)
          ELSE 0 
        END as taxa_utilizacao_vouchers,
        
        -- Ticket médio das vendas
        CASE 
          WHEN COUNT(pi.id) > 0 THEN ROUND(AVG(pi.subtotal), 2)
          ELSE 0 
        END as ticket_medio,
        
        -- Receita por parceiro ativo
        CASE 
          WHEN (SELECT COUNT(*) FROM parceiros WHERE ativo = true) > 0 THEN 
            ROUND((COALESCE(SUM(pi.subtotal), 0) / (SELECT COUNT(*) FROM parceiros WHERE ativo = true)), 2)
          ELSE 0 
        END as receita_por_parceiro
        
      FROM vouchers v
      LEFT JOIN voucher_utilizados vu ON v.id = vu.voucher_id
      LEFT JOIN pedido_itens pi ON pi.validado_at IS NOT NULL
    `;

    const kpisResult = await pool.query(kpisQuery);
    const kpis = kpisResult.rows[0];

    // Montar resposta final
    const dashboardData = {
      stats: {
        totalClientes: parseInt(stats.total_clientes),
        totalParceiros: parseInt(stats.total_parceiros),
        totalVouchers: parseInt(stats.total_vouchers),
        vouchersUtilizados: parseInt(stats.vouchers_utilizados),
        produtosAtivos: parseInt(stats.produtos_ativos),
        receitaTotal: parseFloat(stats.receita_total)
      },
      
      crescimento: {
        meses: crescimentoResult.rows.map(row => row.mes),
        clientes: crescimentoResult.rows.map(row => parseInt(row.clientes)),
        parceiros: crescimentoResult.rows.map(row => parseInt(row.parceiros))
      },
      
      vouchersCategorias: {
        categorias: vouchersCategoriasResult.rows.map(row => row.categoria),
        totals: vouchersCategoriasResult.rows.map(row => parseInt(row.total_vouchers)),
        ativos: vouchersCategoriasResult.rows.map(row => parseInt(row.ativos))
      },
      
      vendasMensais: {
        meses: vendasMensaisResult.rows.map(row => row.mes),
        valores: vendasMensaisResult.rows.map(row => parseFloat(row.vendas))
      },
      
      topProdutos: topProdutosResult.rows.map(row => ({
        nome: row.nome,
        quantidade: parseInt(row.quantidade_vendida),
        receita: parseFloat(row.receita)
      })),
      
      atividadeRecente: atividadeRecenteResult.rows.map((row, index) => ({
        id: index + 1,
        tipo: row.tipo,
        descricao: row.descricao,
        data: row.data
      })),
      
      kpis: {
        taxaUtilizacaoVouchers: parseFloat(kpis.taxa_utilizacao_vouchers),
        ticketMedio: parseFloat(kpis.ticket_medio),
        receitaPorParceiro: parseFloat(kpis.receita_por_parceiro)
      }
    };

    console.log("✅ Dados do dashboard carregados com sucesso");

    return new Response(JSON.stringify(dashboardData), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error('❌ Erro ao buscar dados do dashboard:', error);
    
    // Retornar dados de fallback em caso de erro
    const fallbackData = {
      stats: {
        totalClientes: 0,
        totalParceiros: 0,
        totalVouchers: 0,
        vouchersUtilizados: 0,
        produtosAtivos: 0,
        receitaTotal: 0
      },
      crescimento: {
        meses: ['Jan/24', 'Fev/24', 'Mar/24', 'Abr/24', 'Mai/24', 'Jun/24'],
        clientes: [0, 0, 0, 0, 0, 0],
        parceiros: [0, 0, 0, 0, 0, 0]
      },
      vouchersCategorias: {
        categorias: ['Sistema em configuração'],
        totals: [0],
        ativos: [0]
      },
      vendasMensais: {
        meses: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
        valores: [0, 0, 0, 0, 0, 0]
      },
      topProdutos: [],
      atividadeRecente: [{
        id: 1,
        tipo: 'Sistema',
        descricao: 'Dashboard inicializado',
        data: new Date().toISOString()
      }],
      kpis: {
        taxaUtilizacaoVouchers: 0,
        ticketMedio: 0,
        receitaPorParceiro: 0
      }
    };

    return new Response(JSON.stringify(fallbackData), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }
}
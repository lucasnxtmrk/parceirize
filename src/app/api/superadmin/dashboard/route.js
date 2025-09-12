import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'
import { getServerSession } from 'next-auth'
import { options } from '@/app/api/auth/[...nextauth]/options'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export async function GET(request) {
  try {
    const session = await getServerSession(options)
    
    if (!session || session.user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // KPIs principais
    const kpisQuery = `
      SELECT 
        -- Provedores
        COUNT(DISTINCT p.id) as total_provedores,
        COUNT(DISTINCT p.id) FILTER (WHERE p.ativo = true) as provedores_ativos,
        
        -- Clientes
        COUNT(DISTINCT c.id) as total_clientes,
        COUNT(DISTINCT c.id) FILTER (WHERE c.ativo = true) as clientes_ativos,
        
        -- Parceiros
        COUNT(DISTINCT pa.id) as total_parceiros,
        COUNT(DISTINCT pa.id) FILTER (WHERE pa.ativo = true) as parceiros_ativos,
        
        -- Vouchers
        COUNT(DISTINCT v.id) as total_vouchers,
        COUNT(DISTINCT v.id) FILTER (WHERE pa.ativo = true) as vouchers_ativos,
        
        -- Vouchers utilizados
        COUNT(DISTINCT vu.id) as vouchers_utilizados,
        
        -- Pedidos
        COUNT(DISTINCT pe.id) as total_pedidos,
        COUNT(DISTINCT pe.id) FILTER (WHERE pe.status = 'validado') as pedidos_validados,
        SUM(DISTINCT pe.total) as volume_pedidos,
        AVG(DISTINCT pe.total) as ticket_medio,
        
        -- Receita mensal estimada (baseada nos planos ativos)
        SUM(pl.preco) FILTER (WHERE p.ativo = true) as receita_mensal_estimada
        
      FROM provedores p
      LEFT JOIN planos pl ON p.plano_id = pl.id
      LEFT JOIN clientes c ON p.tenant_id = c.tenant_id
      LEFT JOIN parceiros pa ON p.tenant_id = pa.tenant_id
      LEFT JOIN vouchers v ON pa.id = v.parceiro_id
      LEFT JOIN voucher_utilizados vu ON v.id = vu.voucher_id
      LEFT JOIN pedidos pe ON c.id = pe.cliente_id
    `

    const kpisResult = await pool.query(kpisQuery)
    const kpis = kpisResult.rows[0]

    // Crescimento mensal (últimos 8 meses)
    const crescimentoQuery = `
      WITH monthly_data AS (
        SELECT 
          TO_CHAR(date_trunc('month', created_at), 'Mon') as mes,
          EXTRACT(month FROM created_at) as mes_num,
          'provedores' as tipo,
          COUNT(*) as quantidade
        FROM provedores
        WHERE created_at >= NOW() - INTERVAL '8 months'
        GROUP BY date_trunc('month', created_at), mes_num
        
        UNION ALL
        
        SELECT 
          TO_CHAR(date_trunc('month', data_criacao), 'Mon') as mes,
          EXTRACT(month FROM data_criacao) as mes_num,
          'clientes' as tipo,
          COUNT(*) as quantidade
        FROM clientes
        WHERE data_criacao >= NOW() - INTERVAL '8 months'
        GROUP BY date_trunc('month', data_criacao), mes_num
        
        UNION ALL
        
        SELECT 
          TO_CHAR(date_trunc('month', p.created_at), 'Mon') as mes,
          EXTRACT(month FROM p.created_at) as mes_num,
          'receita' as tipo,
          SUM(pl.preco) as quantidade
        FROM provedores p
        JOIN planos pl ON p.plano_id = pl.id
        WHERE p.created_at >= NOW() - INTERVAL '8 months'
        GROUP BY date_trunc('month', p.created_at), mes_num
      )
      SELECT 
        mes,
        mes_num,
        SUM(CASE WHEN tipo = 'provedores' THEN quantidade ELSE 0 END) as provedores,
        SUM(CASE WHEN tipo = 'clientes' THEN quantidade ELSE 0 END) as clientes,
        SUM(CASE WHEN tipo = 'receita' THEN quantidade ELSE 0 END) as receita
      FROM monthly_data
      GROUP BY mes, mes_num
      ORDER BY mes_num
    `

    const crescimentoResult = await pool.query(crescimentoQuery)

    // Distribuição de planos
    const planosQuery = `
      SELECT 
        pl.nome,
        COUNT(p.id) as quantidade,
        COUNT(p.id) FILTER (WHERE p.ativo = true) as ativos,
        SUM(pl.preco) FILTER (WHERE p.ativo = true) as receita
      FROM planos pl
      LEFT JOIN provedores p ON pl.id = p.plano_id
      GROUP BY pl.id, pl.nome
      HAVING COUNT(p.id) > 0
      ORDER BY quantidade DESC
    `

    const planosResult = await pool.query(planosQuery)

    // Atividade recente (últimos 10 registros)
    const atividadeQuery = `
      SELECT 
        tl.*,
        p.nome_empresa,
        CASE 
          WHEN tl.acao LIKE '%cadastr%' OR tl.acao LIKE '%criação%' THEN 'provider_created'
          WHEN tl.acao LIKE '%upgrade%' OR tl.acao LIKE '%plano%' THEN 'plan_upgrade'
          WHEN tl.acao LIKE '%pagamento%' THEN 'payment_received'
          WHEN tl.acao LIKE '%parceiro%' THEN 'partner_alert'
          ELSE 'activity'
        END as activity_type,
        CASE 
          WHEN tl.acao LIKE '%erro%' OR tl.acao LIKE '%falha%' THEN 'warning'
          WHEN tl.acao LIKE '%cadastr%' OR tl.acao LIKE '%aprovação%' THEN 'success'
          ELSE 'info'
        END as severity
      FROM tenant_logs tl
      LEFT JOIN provedores p ON tl.tenant_id = p.tenant_id
      ORDER BY tl.created_at DESC
      LIMIT 10
    `

    const atividadeResult = await pool.query(atividadeQuery)

    // Calcular tendências (comparar com mês anterior)
    const trendsQuery = `
      SELECT 
        -- Provedores este mês vs mês anterior
        COUNT(DISTINCT p1.id) as provedores_atual,
        COUNT(DISTINCT p2.id) as provedores_anterior,
        
        -- Clientes este mês vs mês anterior  
        COUNT(DISTINCT c1.id) as clientes_atual,
        COUNT(DISTINCT c2.id) as clientes_anterior,
        
        -- Parceiros este mês vs mês anterior
        COUNT(DISTINCT pa1.id) as parceiros_atual,
        COUNT(DISTINCT pa2.id) as parceiros_anterior
        
      FROM 
        (SELECT id FROM provedores WHERE created_at >= date_trunc('month', NOW())) p1
        FULL OUTER JOIN (SELECT id FROM provedores WHERE created_at >= date_trunc('month', NOW() - INTERVAL '1 month') AND created_at < date_trunc('month', NOW())) p2 ON false,
        (SELECT id FROM clientes WHERE data_criacao >= date_trunc('month', NOW())) c1
        FULL OUTER JOIN (SELECT id FROM clientes WHERE data_criacao >= date_trunc('month', NOW() - INTERVAL '1 month') AND data_criacao < date_trunc('month', NOW())) c2 ON false,
        (SELECT id FROM parceiros WHERE data_criacao >= date_trunc('month', NOW())) pa1
        FULL OUTER JOIN (SELECT id FROM parceiros WHERE data_criacao >= date_trunc('month', NOW() - INTERVAL '1 month') AND data_criacao < date_trunc('month', NOW())) pa2 ON false
    `

    const trendsResult = await pool.query(trendsQuery)
    const trends = trendsResult.rows[0]

    // Calcular percentuais de crescimento
    const calculateGrowth = (atual, anterior) => {
      if (!anterior || anterior === 0) return { value: 100, isPositive: true }
      const growth = ((atual - anterior) / anterior) * 100
      return {
        value: Math.abs(Math.round(growth)),
        isPositive: growth >= 0
      }
    }

    // Formatar atividades recentes
    const recentActivity = atividadeResult.rows.map((log, index) => ({
      id: index + 1,
      type: log.activity_type,
      message: `${log.acao}${log.nome_empresa ? ` - ${log.nome_empresa}` : ''}`,
      time: formatTimeAgo(log.created_at),
      severity: log.severity
    }))

    // Resposta consolidada
    const dashboardData = {
      kpis: {
        totalProvedores: {
          value: parseInt(kpis.total_provedores || 0),
          trend: calculateGrowth(trends.provedores_atual, trends.provedores_anterior)
        },
        provedoresAtivos: {
          value: parseInt(kpis.provedores_ativos || 0),
          trend: { value: 5, isPositive: true, period: 'último mês' }
        },
        totalClientes: {
          value: parseInt(kpis.total_clientes || 0),
          trend: calculateGrowth(trends.clientes_atual, trends.clientes_anterior)
        },
        totalParceiros: {
          value: parseInt(kpis.total_parceiros || 0),
          trend: calculateGrowth(trends.parceiros_atual, trends.parceiros_anterior)
        },
        receitaMensal: {
          value: parseFloat(kpis.receita_mensal_estimada || 0),
          trend: { value: 15, isPositive: true, period: 'mês anterior' }
        },
        totalVouchers: {
          value: parseInt(kpis.total_vouchers || 0),
          trend: { value: 20, isPositive: true, period: 'último mês' }
        },
        vouchersUtilizados: {
          value: parseInt(kpis.vouchers_utilizados || 0),
          trend: { value: 18, isPositive: true, period: 'último mês' }
        },
        ticketMedio: {
          value: parseFloat(kpis.ticket_medio || 0),
          trend: { value: 8, isPositive: true, period: 'último mês' }
        }
      },
      charts: {
        crescimentoMensal: crescimentoResult.rows,
        distribuicaoPlanos: planosResult.rows.map((plano, index) => ({
          ...plano,
          receita: parseFloat(plano.receita || 0),
          color: `hsl(${index * 137.5 % 360}, 70%, 60%)`
        }))
      },
      recentActivity
    }

    return NextResponse.json(dashboardData)

  } catch (error) {
    console.error('Erro na API do dashboard:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// Função auxiliar para formatar tempo relativo
function formatTimeAgo(dateString) {
  const now = new Date()
  const date = new Date(dateString)
  const diffInMinutes = Math.floor((now - date) / (1000 * 60))
  
  if (diffInMinutes < 1) return 'Agora'
  if (diffInMinutes < 60) return `${diffInMinutes} minuto${diffInMinutes > 1 ? 's' : ''} atrás`
  
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours} hora${diffInHours > 1 ? 's' : ''} atrás`
  
  const diffInDays = Math.floor(diffInHours / 24)
  return `${diffInDays} dia${diffInDays > 1 ? 's' : ''} atrás`
}
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

    const { searchParams } = new URL(request.url)
    const provedor_id = searchParams.get('provedor_id')
    const alerta_only = searchParams.get('alertas') === 'true'

    // Estatísticas de uso por provedor
    const usageQuery = `
      SELECT 
        p.id,
        p.nome_empresa,
        p.email,
        p.ativo,
        p.data_vencimento,
        p.created_at as data_cadastro,
        pl.nome as plano_nome,
        pl.preco as plano_preco,
        pl.limite_clientes,
        pl.limite_parceiros,
        pl.limite_vouchers,
        pl.limite_produtos,
        
        -- Contadores atuais
        COUNT(DISTINCT c.id) as clientes_atual,
        COUNT(DISTINCT pa.id) as parceiros_atual,
        COUNT(DISTINCT pr.id) as produtos_atual,
        COUNT(DISTINCT v.id) as vouchers_atual,
        COUNT(DISTINCT pe.id) as pedidos_total,
        
        -- Cálculo de percentual de uso
        CASE 
          WHEN pl.limite_clientes IS NULL THEN 0
          ELSE (COUNT(DISTINCT c.id) * 100.0 / pl.limite_clientes)
        END as uso_clientes_percent,
        
        CASE 
          WHEN pl.limite_parceiros IS NULL THEN 0
          ELSE (COUNT(DISTINCT pa.id) * 100.0 / pl.limite_parceiros)
        END as uso_parceiros_percent,
        
        CASE 
          WHEN pl.limite_produtos IS NULL THEN 0
          ELSE (COUNT(DISTINCT pr.id) * 100.0 / pl.limite_produtos)
        END as uso_produtos_percent,
        
        -- Status de alerta
        CASE 
          WHEN p.data_vencimento IS NOT NULL AND p.data_vencimento <= CURRENT_DATE + INTERVAL '7 days' THEN 'vencimento_proximo'
          WHEN pl.limite_clientes IS NOT NULL AND COUNT(DISTINCT c.id) >= pl.limite_clientes * 0.9 THEN 'limite_clientes'
          WHEN pl.limite_parceiros IS NOT NULL AND COUNT(DISTINCT pa.id) >= pl.limite_parceiros * 0.9 THEN 'limite_parceiros'
          WHEN pl.limite_produtos IS NOT NULL AND COUNT(DISTINCT pr.id) >= pl.limite_produtos * 0.9 THEN 'limite_produtos'
          ELSE 'normal'
        END as status_alerta
        
      FROM provedores p
      LEFT JOIN planos pl ON p.plano_id = pl.id
      LEFT JOIN clientes c ON p.tenant_id = c.tenant_id
      LEFT JOIN parceiros pa ON p.tenant_id = pa.tenant_id
      LEFT JOIN produtos pr ON p.tenant_id = pr.tenant_id
      LEFT JOIN vouchers v ON pa.id = v.parceiro_id
      LEFT JOIN pedidos pe ON c.id = pe.cliente_id
      ${provedor_id ? 'WHERE p.id = $1' : ''}
      GROUP BY p.id, p.nome_empresa, p.email, p.ativo, p.data_vencimento, p.created_at,
               pl.nome, pl.preco, pl.limite_clientes, pl.limite_parceiros, pl.limite_vouchers, pl.limite_produtos
      ${alerta_only ? 'HAVING CASE WHEN p.data_vencimento IS NOT NULL AND p.data_vencimento <= CURRENT_DATE + INTERVAL \'7 days\' THEN 1 WHEN pl.limite_clientes IS NOT NULL AND COUNT(DISTINCT c.id) >= pl.limite_clientes * 0.9 THEN 1 WHEN pl.limite_parceiros IS NOT NULL AND COUNT(DISTINCT pa.id) >= pl.limite_parceiros * 0.9 THEN 1 WHEN pl.limite_produtos IS NOT NULL AND COUNT(DISTINCT pr.id) >= pl.limite_produtos * 0.9 THEN 1 ELSE 0 END = 1' : ''}
      ORDER BY 
        CASE 
          WHEN p.data_vencimento IS NOT NULL AND p.data_vencimento <= CURRENT_DATE THEN 1
          WHEN p.data_vencimento IS NOT NULL AND p.data_vencimento <= CURRENT_DATE + INTERVAL '7 days' THEN 2
          ELSE 3
        END,
        p.nome_empresa
    `

    const params = provedor_id ? [provedor_id] : []
    const result = await pool.query(usageQuery, params)

    // Estatísticas gerais do sistema
    const systemStatsQuery = `
      SELECT 
        COUNT(DISTINCT p.id) as total_provedores,
        COUNT(DISTINCT p.id) FILTER (WHERE p.ativo = true) as provedores_ativos,
        COUNT(DISTINCT p.id) FILTER (WHERE p.data_vencimento <= CURRENT_DATE + INTERVAL '7 days') as vencimento_proximo,
        COUNT(DISTINCT c.id) as total_clientes,
        COUNT(DISTINCT pa.id) as total_parceiros,
        COUNT(DISTINCT pr.id) as total_produtos,
        COUNT(DISTINCT pe.id) as total_pedidos,
        SUM(pl.preco) FILTER (WHERE p.ativo = true) as receita_mensal_potencial
      FROM provedores p
      LEFT JOIN planos pl ON p.plano_id = pl.id
      LEFT JOIN clientes c ON p.tenant_id = c.tenant_id
      LEFT JOIN parceiros pa ON p.tenant_id = pa.tenant_id
      LEFT JOIN produtos pr ON p.tenant_id = pr.tenant_id
      LEFT JOIN pedidos pe ON c.id = pe.cliente_id
    `

    const systemStats = await pool.query(systemStatsQuery)

    // Distribuição por plano
    const planoDistQuery = `
      SELECT 
        pl.nome as plano,
        COUNT(p.id) as quantidade,
        COUNT(p.id) FILTER (WHERE p.ativo = true) as ativos
      FROM planos pl
      LEFT JOIN provedores p ON pl.id = p.plano_id
      GROUP BY pl.id, pl.nome
      ORDER BY quantidade DESC
    `

    const planosDist = await pool.query(planoDistQuery)

    // Atividade recente (últimos 30 dias)
    const atividadeQuery = `
      SELECT 
        DATE_TRUNC('day', created_at) as data,
        COUNT(*) as cadastros
      FROM provedores
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY data DESC
      LIMIT 30
    `

    const atividade = await pool.query(atividadeQuery)

    // Alertas críticos
    const alertasCriticos = result.rows.filter(row => row.status_alerta !== 'normal')

    return NextResponse.json({
      provedores: result.rows,
      system_stats: systemStats.rows[0],
      planos_distribuicao: planosDist.rows,
      atividade_recente: atividade.rows,
      alertas_criticos: alertasCriticos,
      total_alertas: alertasCriticos.length
    })

  } catch (error) {
    console.error('Erro na API de monitoramento:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(options)
    
    if (!session || session.user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = await request.json()
    const { action, provedor_id, dados } = body

    if (action === 'update_limits') {
      // Atualizar limites customizados para um provedor
      const updateQuery = `
        UPDATE provedores 
        SET limite_customizado = $1
        WHERE id = $2
        RETURNING *
      `

      const result = await pool.query(updateQuery, [
        JSON.stringify(dados),
        provedor_id
      ])

      // Registrar log de auditoria
      await pool.query(`
        INSERT INTO tenant_logs (usuario_tipo, usuario_id, acao, detalhes, ip_address)
        VALUES ('superadmin', $1, 'Atualização de limites', $2, $3)
      `, [
        session.user.id,
        JSON.stringify({ provedor_id, dados }),
        request.headers.get('x-forwarded-for') || '127.0.0.1'
      ])

      return NextResponse.json({
        success: true,
        provedor: result.rows[0]
      })
    }

    return NextResponse.json({ error: 'Ação não reconhecida' }, { status: 400 })

  } catch (error) {
    console.error('Erro ao processar ação de monitoramento:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
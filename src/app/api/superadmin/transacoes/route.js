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
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const tipo = searchParams.get('tipo') // 'pedidos', 'vouchers', 'all'
    const tenant_id = searchParams.get('tenant_id')
    const data_inicio = searchParams.get('data_inicio')
    const data_fim = searchParams.get('data_fim')
    const status = searchParams.get('status')
    const min_valor = parseFloat(searchParams.get('min_valor') || '0')
    
    const offset = (page - 1) * limit

    // Query para pedidos
    const pedidosQuery = `
      SELECT 
        'pedido' as tipo_transacao,
        pe.id as transacao_id,
        pe.qr_code,
        pe.total as valor,
        pe.status,
        pe.created_at,
        pe.validated_at,
        c.nome as cliente_nome,
        c.cpf as cliente_cpf,
        p.nome_empresa as provedor_nome,
        p.email as provedor_email,
        COUNT(pi.id) as total_itens
      FROM pedidos pe
      JOIN clientes c ON pe.cliente_id = c.id
      JOIN provedores p ON c.tenant_id = p.tenant_id
      LEFT JOIN pedido_itens pi ON pe.id = pi.pedido_id
      WHERE 1=1
        ${tenant_id ? 'AND p.tenant_id = $1' : ''}
        ${data_inicio ? `AND pe.created_at >= ${tenant_id ? '$2' : '$1'}` : ''}
        ${data_fim ? `AND pe.created_at <= ${tenant_id ? (data_inicio ? '$3' : '$2') : (data_inicio ? '$2' : '$1')}` : ''}
        ${status ? `AND pe.status = ${tenant_id ? (data_inicio ? (data_fim ? '$4' : '$3') : '$2') : (data_inicio ? (data_fim ? '$3' : '$2') : '$1')}` : ''}
        AND pe.total >= ${min_valor}
      GROUP BY pe.id, pe.qr_code, pe.total, pe.status, pe.created_at, pe.validated_at, c.nome, c.cpf, p.nome_empresa, p.email
    `

    // Query para vouchers utilizados
    const vouchersQuery = `
      SELECT 
        'voucher' as tipo_transacao,
        vu.id as transacao_id,
        v.codigo as qr_code,
        vu.desconto as valor,
        'utilizado' as status,
        vu.data_utilizacao as created_at,
        vu.data_utilizacao as validated_at,
        c.nome as cliente_nome,
        c.cpf as cliente_cpf,
        p.nome_empresa as provedor_nome,
        p.email as provedor_email,
        1 as total_itens
      FROM voucher_utilizados vu
      JOIN vouchers v ON vu.voucher_id = v.id
      JOIN parceiros pa ON v.parceiro_id = pa.id
      JOIN clientes c ON vu.cliente_id = c.id
      JOIN provedores p ON c.tenant_id = p.tenant_id
      WHERE 1=1
        ${tenant_id ? 'AND p.tenant_id = $1' : ''}
        ${data_inicio ? `AND vu.data_utilizacao >= ${tenant_id ? '$2' : '$1'}` : ''}
        ${data_fim ? `AND vu.data_utilizacao <= ${tenant_id ? (data_inicio ? '$3' : '$2') : (data_inicio ? '$2' : '$1')}` : ''}
        AND vu.desconto >= ${min_valor}
    `

    let finalQuery
    let params = []
    let paramIndex = 1

    if (tenant_id) {
      params.push(tenant_id)
      paramIndex++
    }
    if (data_inicio) {
      params.push(data_inicio)
      paramIndex++
    }
    if (data_fim) {
      params.push(data_fim)
      paramIndex++
    }
    if (status && tipo === 'pedidos') {
      params.push(status)
      paramIndex++
    }

    if (tipo === 'pedidos') {
      finalQuery = pedidosQuery
    } else if (tipo === 'vouchers') {
      finalQuery = vouchersQuery
    } else {
      // Combinar ambos
      finalQuery = `
        (${pedidosQuery})
        UNION ALL
        (${vouchersQuery})
      `
    }

    finalQuery += ` 
      ORDER BY created_at DESC 
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `

    params.push(limit, offset)

    const result = await pool.query(finalQuery, params)

    // Query para estatísticas
    const statsQuery = `
      SELECT 
        -- Pedidos
        COUNT(pe.id) as total_pedidos,
        COUNT(pe.id) FILTER (WHERE pe.status = 'validado') as pedidos_validados,
        COUNT(pe.id) FILTER (WHERE pe.status = 'pendente') as pedidos_pendentes,
        SUM(pe.total) as valor_total_pedidos,
        SUM(pe.total) FILTER (WHERE pe.status = 'validado') as valor_validado_pedidos,
        
        -- Vouchers
        COUNT(vu.id) as total_vouchers_utilizados,
        SUM(vu.desconto) as valor_total_vouchers,
        
        -- Por período
        COUNT(pe.id) FILTER (WHERE pe.created_at >= CURRENT_DATE - INTERVAL '7 days') as pedidos_7d,
        COUNT(vu.id) FILTER (WHERE vu.data_utilizacao >= CURRENT_DATE - INTERVAL '7 days') as vouchers_7d,
        
        -- Valores médios
        AVG(pe.total) as ticket_medio_pedidos,
        AVG(vu.desconto) as desconto_medio_vouchers
        
      FROM pedidos pe
      LEFT JOIN clientes c ON pe.cliente_id = c.id
      LEFT JOIN provedores p ON c.tenant_id = p.tenant_id
      FULL OUTER JOIN voucher_utilizados vu ON 1=1
      LEFT JOIN vouchers v ON vu.voucher_id = v.id
      LEFT JOIN parceiros pa ON v.parceiro_id = pa.id
      LEFT JOIN clientes c2 ON vu.cliente_id = c2.id
      LEFT JOIN provedores p2 ON c2.tenant_id = p2.tenant_id
      WHERE 1=1
        ${tenant_id ? 'AND (p.tenant_id = $1 OR p2.tenant_id = $1)' : ''}
    `

    const statsParams = tenant_id ? [tenant_id] : []
    const statsResult = await pool.query(statsQuery, statsParams)

    // Top provedores por volume
    const topProvedoresQuery = `
      SELECT 
        p.nome_empresa,
        COUNT(pe.id) as total_pedidos,
        SUM(pe.total) as valor_total,
        COUNT(vu.id) as vouchers_utilizados
      FROM provedores p
      LEFT JOIN clientes c ON p.tenant_id = c.tenant_id
      LEFT JOIN pedidos pe ON c.id = pe.cliente_id
      LEFT JOIN voucher_utilizados vu ON c.id = vu.cliente_id
      GROUP BY p.id, p.nome_empresa
      HAVING COUNT(pe.id) > 0 OR COUNT(vu.id) > 0
      ORDER BY valor_total DESC NULLS LAST
      LIMIT 10
    `

    const topProvedores = await pool.query(topProvedoresQuery)

    // Análise de padrões suspeitos
    const padroesSuspeitosQuery = `
      SELECT 
        'multiplos_pedidos_mesmo_ip' as tipo_suspeita,
        COUNT(*) as ocorrencias,
        array_agg(DISTINCT c.nome) as clientes_envolvidos
      FROM tenant_logs tl
      JOIN clientes c ON tl.usuario_id = c.id
      WHERE tl.usuario_tipo = 'cliente' 
        AND tl.acao = 'Criação de pedido'
        AND tl.created_at >= CURRENT_DATE - INTERVAL '1 day'
      GROUP BY tl.ip_address
      HAVING COUNT(*) > 10
      
      UNION ALL
      
      SELECT 
        'pedidos_valores_altos' as tipo_suspeita,
        COUNT(*) as ocorrencias,
        array_agg(DISTINCT c.nome) as clientes_envolvidos
      FROM pedidos pe
      JOIN clientes c ON pe.cliente_id = c.id
      WHERE pe.total > 1000
        AND pe.created_at >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY pe.cliente_id
      HAVING COUNT(*) > 1
    `

    const padroesSuspeitos = await pool.query(padroesSuspeitosQuery)

    return NextResponse.json({
      transacoes: result.rows,
      pagination: {
        page,
        limit,
        total: result.rows.length // Simplificado para esta implementação
      },
      estatisticas: {
        ...statsResult.rows[0],
        valor_total_pedidos: parseFloat(statsResult.rows[0]?.valor_total_pedidos || 0),
        valor_validado_pedidos: parseFloat(statsResult.rows[0]?.valor_validado_pedidos || 0),
        valor_total_vouchers: parseFloat(statsResult.rows[0]?.valor_total_vouchers || 0),
        ticket_medio_pedidos: parseFloat(statsResult.rows[0]?.ticket_medio_pedidos || 0),
        desconto_medio_vouchers: parseFloat(statsResult.rows[0]?.desconto_medio_vouchers || 0)
      },
      top_provedores: topProvedores.rows,
      padroes_suspeitos: padroesSuspeitos.rows
    })

  } catch (error) {
    console.error('Erro na API de transações:', error)
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
    const { action, transacao_id, tipo, motivo } = body

    if (action === 'block_transaction') {
      // Bloquear transação suspeita
      if (tipo === 'pedido') {
        await pool.query(`
          UPDATE pedidos 
          SET status = 'bloqueado', 
              observacoes = $1
          WHERE id = $2
        `, [motivo, transacao_id])
      }

      // Registrar log
      await pool.query(`
        INSERT INTO tenant_logs (usuario_tipo, usuario_id, acao, detalhes, ip_address)
        VALUES ('superadmin', $1, 'Bloqueio de transação', $2, $3)
      `, [
        session.user.id,
        JSON.stringify({ transacao_id, tipo, motivo }),
        request.headers.get('x-forwarded-for') || '127.0.0.1'
      ])

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Ação não reconhecida' }, { status: 400 })

  } catch (error) {
    console.error('Erro ao processar ação de transação:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
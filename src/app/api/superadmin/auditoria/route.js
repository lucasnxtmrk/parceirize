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
    const tenant_id = searchParams.get('tenant_id')
    const usuario_tipo = searchParams.get('usuario_tipo')
    const acao = searchParams.get('acao')
    const data_inicio = searchParams.get('data_inicio')
    const data_fim = searchParams.get('data_fim')
    
    const offset = (page - 1) * limit

    // Construir query dinamicamente
    let whereClause = 'WHERE 1=1'
    const params = []
    let paramCount = 1

    if (tenant_id) {
      whereClause += ` AND tenant_id = $${paramCount}`
      params.push(tenant_id)
      paramCount++
    }

    if (usuario_tipo) {
      whereClause += ` AND usuario_tipo = $${paramCount}`
      params.push(usuario_tipo)
      paramCount++
    }

    if (acao) {
      whereClause += ` AND acao ILIKE $${paramCount}`
      params.push(`%${acao}%`)
      paramCount++
    }

    if (data_inicio) {
      whereClause += ` AND created_at >= $${paramCount}`
      params.push(data_inicio)
      paramCount++
    }

    if (data_fim) {
      whereClause += ` AND created_at <= $${paramCount}`
      params.push(data_fim)
      paramCount++
    }

    // Query principal com dados do provedor
    const logsQuery = `
      SELECT 
        l.*,
        p.nome_empresa,
        p.email as provedor_email,
        pl.nome as plano_nome
      FROM tenant_logs l
      LEFT JOIN provedores p ON l.tenant_id = p.tenant_id
      LEFT JOIN planos pl ON p.plano_id = pl.id
      ${whereClause}
      ORDER BY l.created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `
    
    params.push(limit, offset)

    const logs = await pool.query(logsQuery, params)

    // Query para contar total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM tenant_logs l
      ${whereClause}
    `
    
    const countResult = await pool.query(countQuery, params.slice(0, -2))
    const total = parseInt(countResult.rows[0].total)

    // Estatísticas gerais
    const statsQuery = `
      SELECT 
        COUNT(*) as total_logs,
        COUNT(DISTINCT tenant_id) as tenants_ativos,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as logs_24h,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as logs_7d
      FROM tenant_logs
    `
    
    const statsResult = await pool.query(statsQuery)
    const stats = statsResult.rows[0]

    // Logs por tipo de usuário (últimos 30 dias)
    const tiposQuery = `
      SELECT 
        usuario_tipo,
        COUNT(*) as total
      FROM tenant_logs 
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY usuario_tipo
      ORDER BY total DESC
    `
    
    const tiposResult = await pool.query(tiposQuery)

    return NextResponse.json({
      logs: logs.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      stats: {
        ...stats,
        total_logs: parseInt(stats.total_logs),
        tenants_ativos: parseInt(stats.tenants_ativos),
        logs_24h: parseInt(stats.logs_24h),
        logs_7d: parseInt(stats.logs_7d)
      },
      tipos: tiposResult.rows
    })

  } catch (error) {
    console.error('Erro na API de auditoria:', error)
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
    const { tenant_id, usuario_tipo, usuario_id, acao, detalhes } = body

    if (!acao) {
      return NextResponse.json({ error: 'Ação é obrigatória' }, { status: 400 })
    }

    // Obter IP do request
    const ip_address = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      '127.0.0.1'

    const insertQuery = `
      INSERT INTO tenant_logs (
        tenant_id, usuario_tipo, usuario_id, acao, detalhes, ip_address
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, created_at
    `

    const result = await pool.query(insertQuery, [
      tenant_id,
      usuario_tipo || 'superadmin',
      usuario_id || session.user.id,
      acao,
      JSON.stringify(detalhes || {}),
      ip_address
    ])

    return NextResponse.json({
      success: true,
      log: result.rows[0]
    })

  } catch (error) {
    console.error('Erro ao registrar log de auditoria:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
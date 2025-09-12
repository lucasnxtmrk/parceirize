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
    const user_type = searchParams.get('user_type')
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    // Query para listar usuários de todas as tabelas
    let usersQuery = `
      WITH all_users AS (
        -- Provedores (admins)
        SELECT 
          p.id,
          'admin' as user_type,
          p.nome_empresa as nome,
          p.email,
          p.ativo as status,
          p.created_at,
          p.tenant_id,
          p.plano_id,
          pl.nome as plano_nome,
          pl.preco as plano_preco,
          COUNT(DISTINCT c.id) as total_clientes,
          COUNT(DISTINCT pa.id) as total_parceiros,
          'provider' as role
        FROM provedores p
        LEFT JOIN planos pl ON p.plano_id = pl.id
        LEFT JOIN clientes c ON p.tenant_id = c.tenant_id AND c.ativo = true
        LEFT JOIN parceiros pa ON p.tenant_id = pa.tenant_id AND pa.ativo = true
        GROUP BY p.id, p.nome_empresa, p.email, p.ativo, p.created_at, p.tenant_id, p.plano_id, pl.nome, pl.preco
        
        UNION ALL
        
        -- Clientes
        SELECT 
          c.id,
          'cliente' as user_type,
          c.nome,
          c.email,
          c.ativo as status,
          c.created_at,
          c.tenant_id,
          NULL as plano_id,
          NULL as plano_nome,
          NULL as plano_preco,
          NULL as total_clientes,
          NULL as total_parceiros,
          'customer' as role
        FROM clientes c
        
        UNION ALL
        
        -- Parceiros
        SELECT 
          pa.id,
          'parceiro' as user_type,
          pa.nome,
          pa.email,
          pa.ativo as status,
          pa.created_at,
          pa.tenant_id,
          NULL as plano_id,
          NULL as plano_nome,
          NULL as plano_preco,
          NULL as total_clientes,
          NULL as total_parceiros,
          'partner' as role
        FROM parceiros pa
      )
      SELECT 
        u.*,
        p.nome_empresa as provider_name,
        -- Calcular última atividade baseada nos logs
        COALESCE(
          (SELECT MAX(tl.created_at) 
           FROM tenant_logs tl 
           WHERE tl.usuario_tipo = u.user_type 
           AND tl.usuario_id = u.id 
           AND tl.created_at >= NOW() - INTERVAL '30 days'
          ), 
          u.created_at
        ) as last_activity,
        -- Status de sessão
        CASE 
          WHEN (SELECT MAX(tl.created_at) 
                FROM tenant_logs tl 
                WHERE tl.usuario_tipo = u.user_type 
                AND tl.usuario_id = u.id) > NOW() - INTERVAL '1 hour' THEN 'online'
          WHEN (SELECT MAX(tl.created_at) 
                FROM tenant_logs tl 
                WHERE tl.usuario_tipo = u.user_type 
                AND tl.usuario_id = u.id) > NOW() - INTERVAL '24 hours' THEN 'recent'
          ELSE 'offline'
        END as session_status
      FROM all_users u
      LEFT JOIN provedores p ON u.tenant_id = p.tenant_id AND u.user_type != 'admin'
    `

    // Adicionar filtros
    const whereConditions = []
    const params = []
    let paramCount = 1

    if (user_type && user_type !== 'all') {
      whereConditions.push(`u.user_type = $${paramCount}`)
      params.push(user_type)
      paramCount++
    }

    if (status && status !== 'all') {
      if (status === 'active') {
        whereConditions.push(`u.status = true`)
      } else if (status === 'inactive') {
        whereConditions.push(`u.status = false`)
      }
    }

    if (search) {
      whereConditions.push(`(u.nome ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`)
      params.push(`%${search}%`)
      paramCount++
    }

    if (whereConditions.length > 0) {
      usersQuery += ` WHERE ${whereConditions.join(' AND ')}`
    }

    usersQuery += ` ORDER BY u.created_at DESC LIMIT 100`

    const usersResult = await pool.query(usersQuery, params)

    // Estatísticas gerais
    const statsQuery = `
      SELECT 
        -- Total de usuários por tipo
        (SELECT COUNT(*) FROM provedores) as total_admins,
        (SELECT COUNT(*) FROM provedores WHERE ativo = true) as active_admins,
        (SELECT COUNT(*) FROM clientes) as total_clientes,
        (SELECT COUNT(*) FROM clientes WHERE ativo = true) as active_clientes,
        (SELECT COUNT(*) FROM parceiros) as total_parceiros,
        (SELECT COUNT(*) FROM parceiros WHERE ativo = true) as active_parceiros,
        
        -- Novos usuários este mês
        (SELECT COUNT(*) FROM provedores WHERE created_at >= date_trunc('month', NOW())) as new_admins_month,
        (SELECT COUNT(*) FROM clientes WHERE created_at >= date_trunc('month', NOW())) as new_clientes_month,
        (SELECT COUNT(*) FROM parceiros WHERE created_at >= date_trunc('month', NOW())) as new_parceiros_month,
        
        -- Usuários ativos (com atividade nos últimos 7 dias)
        (SELECT COUNT(DISTINCT CONCAT(tl.usuario_tipo, '_', tl.usuario_id))
         FROM tenant_logs tl 
         WHERE tl.created_at >= NOW() - INTERVAL '7 days'
        ) as active_users_week
    `

    const statsResult = await pool.query(statsQuery)
    const stats = statsResult.rows[0]

    return NextResponse.json({
      users: usersResult.rows,
      statistics: {
        total_users: parseInt(stats.total_admins || 0) + parseInt(stats.total_clientes || 0) + parseInt(stats.total_parceiros || 0),
        active_users: parseInt(stats.active_admins || 0) + parseInt(stats.active_clientes || 0) + parseInt(stats.active_parceiros || 0),
        admins: {
          total: parseInt(stats.total_admins || 0),
          active: parseInt(stats.active_admins || 0),
          new_this_month: parseInt(stats.new_admins_month || 0)
        },
        clientes: {
          total: parseInt(stats.total_clientes || 0),
          active: parseInt(stats.active_clientes || 0),
          new_this_month: parseInt(stats.new_clientes_month || 0)
        },
        parceiros: {
          total: parseInt(stats.total_parceiros || 0),
          active: parseInt(stats.active_parceiros || 0),
          new_this_month: parseInt(stats.new_parceiros_month || 0)
        },
        active_users_week: parseInt(stats.active_users_week || 0)
      }
    })

  } catch (error) {
    console.error('Erro na API de usuários:', error)
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
    const { action, user_id, user_type, status } = body

    if (action === 'toggle_status') {
      // Determinar tabela baseada no tipo de usuário
      let table
      switch (user_type) {
        case 'admin':
          table = 'provedores'
          break
        case 'cliente':
          table = 'clientes'
          break
        case 'parceiro':
          table = 'parceiros'
          break
        default:
          return NextResponse.json({ error: 'Tipo de usuário inválido' }, { status: 400 })
      }

      // Atualizar status
      await pool.query(`UPDATE ${table} SET ativo = $1 WHERE id = $2`, [status, user_id])

      // Registrar ação no log
      await pool.query(`
        INSERT INTO tenant_logs (usuario_tipo, usuario_id, acao, detalhes, ip_address)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        'superadmin',
        session.user.id,
        `${status ? 'Ativação' : 'Desativação'} de usuário`,
        JSON.stringify({ 
          target_user_type: user_type,
          target_user_id: user_id,
          new_status: status
        }),
        request.headers.get('x-forwarded-for') || '127.0.0.1'
      ])

      return NextResponse.json({
        success: true,
        message: `Usuário ${status ? 'ativado' : 'desativado'} com sucesso`
      })
    }

    return NextResponse.json({ error: 'Ação não reconhecida' }, { status: 400 })

  } catch (error) {
    console.error('Erro ao processar ação de usuário:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
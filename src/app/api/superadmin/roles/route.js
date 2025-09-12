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

    // Sistema de roles do Parceirize
    const systemRoles = [
      {
        id: 'superadmin',
        name: 'Super Administrador',
        description: 'Acesso completo ao sistema, gerenciamento de todos os provedores',
        permissions: [
          'system:manage',
          'providers:manage',
          'users:manage',
          'sessions:manage',
          'analytics:view',
          'integrations:manage',
          'audit:view'
        ],
        userCount: 1, // Normalmente apenas um superadmin
        canEdit: false,
        systemRole: true,
        level: 100
      },
      {
        id: 'admin',
        name: 'Administrador',
        description: 'Gerencia clientes, parceiros e vouchers dentro do seu tenant',
        permissions: [
          'dashboard:view',
          'customers:manage',
          'partners:manage', 
          'vouchers:manage',
          'reports:view',
          'integrations:view',
          'profile:manage'
        ],
        userCount: 0, // Será calculado
        canEdit: false,
        systemRole: true,
        level: 75
      },
      {
        id: 'parceiro',
        name: 'Parceiro',
        description: 'Gerencia seus próprios produtos, cupons e relatórios de vendas',
        permissions: [
          'dashboard:view',
          'products:manage',
          'coupons:manage',
          'sales:view',
          'profile:manage',
          'vouchers:validate'
        ],
        userCount: 0, // Será calculado
        canEdit: false,
        systemRole: true,
        level: 50
      },
      {
        id: 'cliente',
        name: 'Cliente',
        description: 'Acesso à carteirinha digital e navegação de ofertas',
        permissions: [
          'carteirinha:view',
          'vouchers:browse',
          'orders:view',
          'profile:manage'
        ],
        userCount: 0, // Será calculado
        canEdit: false,
        systemRole: true,
        level: 25
      }
    ]

    // Buscar contagem real de usuários por tipo
    const userCountsQuery = `
      SELECT 
        'admin' as role, COUNT(*) as count FROM provedores
      UNION ALL
      SELECT 
        'parceiro' as role, COUNT(*) as count FROM parceiros  
      UNION ALL
      SELECT 
        'cliente' as role, COUNT(*) as count FROM clientes
    `

    const userCountsResult = await pool.query(userCountsQuery)
    const userCounts = userCountsResult.rows.reduce((acc, row) => {
      acc[row.role] = parseInt(row.count)
      return acc
    }, {})

    // Atualizar contagens nos roles
    const rolesWithCounts = systemRoles.map(role => ({
      ...role,
      userCount: userCounts[role.id] || role.userCount
    }))

    // Estatísticas de distribuição de roles
    const totalUsers = Object.values(userCounts).reduce((sum, count) => sum + count, 1) // +1 para superadmin

    const roleDistribution = rolesWithCounts.map(role => ({
      role: role.name,
      count: role.userCount,
      percentage: Math.round((role.userCount / totalUsers) * 100),
      color: getRoleColor(role.id)
    }))

    // Atividade por role (últimos 30 dias)
    const roleActivityQuery = `
      SELECT 
        tl.usuario_tipo as role,
        COUNT(*) as activity_count,
        COUNT(DISTINCT tl.usuario_id) as active_users,
        MAX(tl.created_at) as last_activity
      FROM tenant_logs tl
      WHERE tl.created_at >= NOW() - INTERVAL '30 days'
      GROUP BY tl.usuario_tipo
      
      UNION ALL
      
      SELECT 
        'admin' as role,
        COUNT(*) as activity_count,
        COUNT(DISTINCT tl.usuario_id) as active_users,
        MAX(tl.created_at) as last_activity
      FROM tenant_logs tl
      WHERE tl.usuario_tipo = 'superadmin' 
        OR (tl.usuario_tipo = 'admin')
        AND tl.created_at >= NOW() - INTERVAL '30 days'
    `

    const activityResult = await pool.query(roleActivityQuery)
    const roleActivity = activityResult.rows

    // Permissions mais utilizadas (baseado em ações dos logs)
    const permissionUsageQuery = `
      SELECT 
        CASE 
          WHEN acao ILIKE '%dashboard%' OR acao ILIKE '%inicio%' THEN 'dashboard:view'
          WHEN acao ILIKE '%cliente%' OR acao ILIKE '%usuario%' THEN 'customers:manage'
          WHEN acao ILIKE '%parceiro%' THEN 'partners:manage'
          WHEN acao ILIKE '%voucher%' OR acao ILIKE '%cupom%' THEN 'vouchers:manage'
          WHEN acao ILIKE '%produto%' THEN 'products:manage'
          WHEN acao ILIKE '%relat%' THEN 'reports:view'
          WHEN acao ILIKE '%login%' OR acao ILIKE '%acesso%' THEN 'auth:login'
          ELSE 'other'
        END as permission,
        COUNT(*) as usage_count
      FROM tenant_logs
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY permission
      ORDER BY usage_count DESC
      LIMIT 10
    `

    const permissionUsageResult = await pool.query(permissionUsageQuery)

    return NextResponse.json({
      roles: rolesWithCounts,
      statistics: {
        totalRoles: rolesWithCounts.length,
        totalUsers: totalUsers,
        systemRoles: rolesWithCounts.filter(r => r.systemRole).length,
        customRoles: 0, // Não há roles customizados no Parceirize
        roleDistribution: roleDistribution,
        roleActivity: roleActivity.map(activity => ({
          role: activity.role,
          activityCount: parseInt(activity.activity_count),
          activeUsers: parseInt(activity.active_users),
          lastActivity: activity.last_activity
        })),
        permissionUsage: permissionUsageResult.rows.filter(p => p.permission !== 'other')
      }
    })

  } catch (error) {
    console.error('Erro na API de roles:', error)
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
    const { action, roleId, userId, userType } = body

    if (action === 'assign_role') {
      // No Parceirize, os roles são determinados pela tabela onde o usuário está
      // Esta ação poderia ser usado para mover usuários entre tipos
      
      // Registrar tentativa de mudança de role
      await pool.query(`
        INSERT INTO tenant_logs (usuario_tipo, usuario_id, acao, detalhes, ip_address)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        'superadmin',
        session.user.id,
        'Tentativa de alteração de role',
        JSON.stringify({ 
          target_user_id: userId,
          current_role: userType,
          requested_role: roleId,
          note: 'Roles no Parceirize são determinados pela tabela do usuário'
        }),
        request.headers.get('x-forwarded-for') || '127.0.0.1'
      ])

      return NextResponse.json({
        success: false,
        message: 'Roles no Parceirize são determinados pela tabela do usuário. Use a gestão de usuários para mover entre tipos.'
      })
    }

    return NextResponse.json({ error: 'Ação não reconhecida' }, { status: 400 })

  } catch (error) {
    console.error('Erro ao processar ação de role:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// Helper para definir cores dos roles
function getRoleColor(roleId) {
  const colors = {
    superadmin: 'hsl(0, 85%, 60%)',    // Vermelho
    admin: 'hsl(220, 85%, 60%)',       // Azul
    parceiro: 'hsl(120, 85%, 50%)',    // Verde
    cliente: 'hsl(280, 85%, 60%)'      // Roxo
  }
  return colors[roleId] || 'hsl(240, 5%, 50%)'
}
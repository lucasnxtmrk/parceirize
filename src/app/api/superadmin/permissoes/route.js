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

    // Definir todas as permissões do sistema Parceirize
    const allPermissions = [
      // Sistema/SuperAdmin
      { 
        id: 'system:manage', 
        name: 'Gerenciar Sistema', 
        description: 'Acesso total ao sistema, gerenciamento de provedores',
        category: 'system',
        level: 'critical'
      },
      { 
        id: 'providers:manage', 
        name: 'Gerenciar Provedores', 
        description: 'Criar, editar, desativar provedores',
        category: 'system',
        level: 'high'
      },
      { 
        id: 'users:manage', 
        name: 'Gerenciar Usuários', 
        description: 'Visualizar e gerenciar todos os usuários do sistema',
        category: 'system',
        level: 'high'
      },
      { 
        id: 'sessions:manage', 
        name: 'Gerenciar Sessões', 
        description: 'Visualizar e encerrar sessões de usuários',
        category: 'system',
        level: 'high'
      },
      { 
        id: 'analytics:view', 
        name: 'Ver Analytics', 
        description: 'Acessar relatórios e estatísticas globais',
        category: 'system',
        level: 'medium'
      },
      { 
        id: 'integrations:manage', 
        name: 'Gerenciar Integrações', 
        description: 'Configurar integrações de terceiros',
        category: 'system',
        level: 'high'
      },
      { 
        id: 'audit:view', 
        name: 'Ver Auditoria', 
        description: 'Acessar logs de auditoria do sistema',
        category: 'system',
        level: 'medium'
      },

      // Admin/Provedor
      { 
        id: 'dashboard:view', 
        name: 'Ver Dashboard', 
        description: 'Acessar painel principal',
        category: 'dashboard',
        level: 'low'
      },
      { 
        id: 'customers:manage', 
        name: 'Gerenciar Clientes', 
        description: 'Criar, editar, visualizar clientes',
        category: 'users',
        level: 'medium'
      },
      { 
        id: 'partners:manage', 
        name: 'Gerenciar Parceiros', 
        description: 'Criar, editar, aprovar parceiros',
        category: 'users',
        level: 'medium'
      },
      { 
        id: 'vouchers:manage', 
        name: 'Gerenciar Vouchers', 
        description: 'Criar, editar, validar vouchers',
        category: 'commerce',
        level: 'high'
      },
      { 
        id: 'reports:view', 
        name: 'Ver Relatórios', 
        description: 'Acessar relatórios e estatísticas',
        category: 'analytics',
        level: 'medium'
      },
      { 
        id: 'integrations:view', 
        name: 'Ver Integrações', 
        description: 'Visualizar integrações configuradas',
        category: 'system',
        level: 'low'
      },

      // Parceiro
      { 
        id: 'products:manage', 
        name: 'Gerenciar Produtos', 
        description: 'Criar, editar produtos próprios',
        category: 'commerce',
        level: 'medium'
      },
      { 
        id: 'coupons:manage', 
        name: 'Gerenciar Cupons', 
        description: 'Criar, editar cupons de desconto',
        category: 'commerce',
        level: 'medium'
      },
      { 
        id: 'sales:view', 
        name: 'Ver Vendas', 
        description: 'Visualizar relatórios de vendas',
        category: 'analytics',
        level: 'medium'
      },
      { 
        id: 'vouchers:validate', 
        name: 'Validar Vouchers', 
        description: 'Validar vouchers de clientes',
        category: 'commerce',
        level: 'medium'
      },

      // Cliente
      { 
        id: 'carteirinha:view', 
        name: 'Ver Carteirinha', 
        description: 'Acessar carteirinha digital',
        category: 'customer',
        level: 'low'
      },
      { 
        id: 'vouchers:browse', 
        name: 'Navegar Vouchers', 
        description: 'Ver ofertas disponíveis',
        category: 'customer',
        level: 'low'
      },
      { 
        id: 'orders:view', 
        name: 'Ver Pedidos', 
        description: 'Visualizar histórico de pedidos',
        category: 'customer',
        level: 'low'
      },

      // Geral
      { 
        id: 'profile:manage', 
        name: 'Gerenciar Perfil', 
        description: 'Editar informações do próprio perfil',
        category: 'profile',
        level: 'low'
      },
      { 
        id: 'auth:login', 
        name: 'Fazer Login', 
        description: 'Autenticar no sistema',
        category: 'auth',
        level: 'low'
      }
    ]

    // Mapear permissões para roles
    const rolePermissions = {
      superadmin: [
        'system:manage', 'providers:manage', 'users:manage', 'sessions:manage', 
        'analytics:view', 'integrations:manage', 'audit:view', 'auth:login'
      ],
      admin: [
        'dashboard:view', 'customers:manage', 'partners:manage', 'vouchers:manage',
        'reports:view', 'integrations:view', 'profile:manage', 'auth:login'
      ],
      parceiro: [
        'dashboard:view', 'products:manage', 'coupons:manage', 'sales:view',
        'vouchers:validate', 'profile:manage', 'auth:login'
      ],
      cliente: [
        'carteirinha:view', 'vouchers:browse', 'orders:view', 'profile:manage', 'auth:login'
      ]
    }

    // Calcular uso das permissões baseado nos logs
    const permissionUsageQuery = `
      SELECT 
        CASE 
          WHEN acao ILIKE '%sistema%' OR acao ILIKE '%provedor%' THEN 'system:manage'
          WHEN acao ILIKE '%dashboard%' OR acao ILIKE '%painel%' THEN 'dashboard:view'
          WHEN acao ILIKE '%cliente%' AND acao NOT ILIKE '%carteirinha%' THEN 'customers:manage'
          WHEN acao ILIKE '%parceiro%' AND usuario_tipo = 'admin' THEN 'partners:manage'
          WHEN acao ILIKE '%voucher%' AND usuario_tipo = 'admin' THEN 'vouchers:manage'
          WHEN acao ILIKE '%produto%' THEN 'products:manage'
          WHEN acao ILIKE '%cupom%' THEN 'coupons:manage'
          WHEN acao ILIKE '%venda%' OR acao ILIKE '%relat%' THEN 'sales:view'
          WHEN acao ILIKE '%validar%' THEN 'vouchers:validate'
          WHEN acao ILIKE '%carteirinha%' THEN 'carteirinha:view'
          WHEN acao ILIKE '%pedido%' THEN 'orders:view'
          WHEN acao ILIKE '%perfil%' THEN 'profile:manage'
          WHEN acao ILIKE '%login%' OR acao ILIKE '%acesso%' THEN 'auth:login'
          ELSE 'other'
        END as permission,
        usuario_tipo,
        COUNT(*) as usage_count,
        COUNT(DISTINCT usuario_id) as unique_users
      FROM tenant_logs
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY permission, usuario_tipo
      HAVING permission != 'other'
      ORDER BY usage_count DESC
    `

    const usageResult = await pool.query(permissionUsageQuery)

    // Processar dados de uso
    const permissionUsage = usageResult.rows.reduce((acc, row) => {
      if (!acc[row.permission]) {
        acc[row.permission] = {
          totalUsage: 0,
          byRole: {},
          uniqueUsers: 0
        }
      }
      acc[row.permission].totalUsage += parseInt(row.usage_count)
      acc[row.permission].byRole[row.usuario_tipo] = parseInt(row.usage_count)
      acc[row.permission].uniqueUsers += parseInt(row.unique_users)
      return acc
    }, {})

    // Estatísticas por categoria
    const categoryStats = allPermissions.reduce((acc, perm) => {
      if (!acc[perm.category]) {
        acc[perm.category] = {
          total: 0,
          critical: 0,
          high: 0,
          medium: 0,
          low: 0
        }
      }
      acc[perm.category].total++
      acc[perm.category][perm.level]++
      return acc
    }, {})

    // Adicionar dados de uso às permissões
    const permissionsWithUsage = allPermissions.map(perm => ({
      ...perm,
      usage: permissionUsage[perm.id] || { totalUsage: 0, byRole: {}, uniqueUsers: 0 },
      assignedToRoles: Object.entries(rolePermissions).filter(([role, perms]) => 
        perms.includes(perm.id)
      ).map(([role]) => role)
    }))

    return NextResponse.json({
      permissions: permissionsWithUsage,
      rolePermissions,
      statistics: {
        totalPermissions: allPermissions.length,
        categoriesCount: Object.keys(categoryStats).length,
        categoryBreakdown: categoryStats,
        levelDistribution: {
          critical: allPermissions.filter(p => p.level === 'critical').length,
          high: allPermissions.filter(p => p.level === 'high').length,
          medium: allPermissions.filter(p => p.level === 'medium').length,
          low: allPermissions.filter(p => p.level === 'low').length
        },
        mostUsedPermissions: Object.entries(permissionUsage)
          .sort(([,a], [,b]) => b.totalUsage - a.totalUsage)
          .slice(0, 10)
          .map(([perm, data]) => ({
            permission: perm,
            usage: data.totalUsage,
            users: data.uniqueUsers
          }))
      }
    })

  } catch (error) {
    console.error('Erro na API de permissões:', error)
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
    const { action, roleId, permissionId, userId } = body

    // No Parceirize, as permissões são fixas por role
    // Esta API serve principalmente para auditoria e visualização
    
    if (action === 'audit_permission') {
      // Registrar auditoria de permissão
      await pool.query(`
        INSERT INTO tenant_logs (usuario_tipo, usuario_id, acao, detalhes, ip_address)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        'superadmin',
        session.user.id,
        'Auditoria de permissão',
        JSON.stringify({ 
          permission: permissionId,
          role: roleId,
          target_user: userId,
          note: 'Verificação de permissão via SuperAdmin'
        }),
        request.headers.get('x-forwarded-for') || '127.0.0.1'
      ])

      return NextResponse.json({
        success: true,
        message: 'Auditoria de permissão registrada'
      })
    }

    return NextResponse.json({ error: 'Ação não reconhecida' }, { status: 400 })

  } catch (error) {
    console.error('Erro ao processar ação de permissão:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
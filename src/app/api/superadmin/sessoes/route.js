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
    const status = searchParams.get('status')
    const user_type = searchParams.get('user_type') 
    const device_type = searchParams.get('device_type')
    const search = searchParams.get('search')

    // Query principal para sessões ativas baseada nos logs de login
    let whereClause = 'WHERE 1=1'
    const params = []
    let paramCount = 1

    if (status) {
      whereClause += ` AND session_status = $${paramCount}`
      params.push(status)
      paramCount++
    }

    if (user_type) {
      whereClause += ` AND tl.usuario_tipo = $${paramCount}`
      params.push(user_type)
      paramCount++
    }

    if (search) {
      whereClause += ` AND (user_name ILIKE $${paramCount} OR user_email ILIKE $${paramCount})`
      params.push(`%${search}%`)
      paramCount++
    }

    // Query principal de sessões baseada nos logs de atividade
    const sessoesQuery = `
      WITH user_sessions AS (
        SELECT DISTINCT
          CONCAT(tl.usuario_tipo, '_', tl.usuario_id) as session_id,
          tl.usuario_id,
          tl.usuario_tipo,
          tl.ip_address,
          tl.created_at as login_time,
          MAX(tl.created_at) OVER (PARTITION BY tl.usuario_tipo, tl.usuario_id) as last_activity,
          CASE 
            WHEN MAX(tl.created_at) OVER (PARTITION BY tl.usuario_tipo, tl.usuario_id) > NOW() - INTERVAL '1 hour' THEN 'active'
            WHEN MAX(tl.created_at) OVER (PARTITION BY tl.usuario_tipo, tl.usuario_id) > NOW() - INTERVAL '24 hours' THEN 'expired'
            ELSE 'terminated'
          END as session_status,
          EXTRACT(EPOCH FROM (MAX(tl.created_at) OVER (PARTITION BY tl.usuario_tipo, tl.usuario_id) - MIN(tl.created_at) OVER (PARTITION BY tl.usuario_tipo, tl.usuario_id))) / 60 as duration_minutes,
          -- Determinar tipo de dispositivo baseado no user_agent (se disponível)
          CASE 
            WHEN tl.detalhes::text ILIKE '%mobile%' OR tl.detalhes::text ILIKE '%iphone%' OR tl.detalhes::text ILIKE '%android%' THEN 'Mobile'
            WHEN tl.detalhes::text ILIKE '%tablet%' OR tl.detalhes::text ILIKE '%ipad%' THEN 'Tablet'
            ELSE 'Desktop'
          END as device_type,
          -- Simular localização baseada no IP (em produção seria uma API de geolocalização)
          CASE
            WHEN tl.ip_address::text LIKE '192.168.%' OR tl.ip_address::text LIKE '10.%' OR tl.ip_address::text = '127.0.0.1' THEN 'Local, BR'
            WHEN tl.ip_address::text LIKE '189.%' OR tl.ip_address::text LIKE '201.%' THEN 'São Paulo, SP'
            WHEN tl.ip_address::text LIKE '177.%' OR tl.ip_address::text LIKE '179.%' THEN 'Rio de Janeiro, RJ'
            ELSE 'Brasil'
          END as location,
          ROW_NUMBER() OVER (PARTITION BY tl.usuario_tipo, tl.usuario_id ORDER BY tl.created_at DESC) as rn
        FROM tenant_logs tl
        WHERE tl.acao ILIKE '%login%' OR tl.acao ILIKE '%acesso%'
          AND tl.created_at >= NOW() - INTERVAL '7 days'
      ),
      user_details AS (
        SELECT 
          us.*,
          CASE
            WHEN us.usuario_tipo = 'cliente' THEN (SELECT nome FROM clientes WHERE id = us.usuario_id LIMIT 1)
            WHEN us.usuario_tipo = 'parceiro' THEN (SELECT nome_empresa FROM parceiros WHERE id = us.usuario_id LIMIT 1)
            WHEN us.usuario_tipo = 'provedor' THEN (SELECT nome_empresa FROM provedores WHERE id = us.usuario_id LIMIT 1)
            WHEN us.usuario_tipo = 'superadmin' THEN (SELECT nome FROM admins WHERE id = us.usuario_id LIMIT 1)
            ELSE 'Usuário Desconhecido'
          END as user_name,
          CASE
            WHEN us.usuario_tipo = 'cliente' THEN (SELECT email FROM clientes WHERE id = us.usuario_id LIMIT 1)
            WHEN us.usuario_tipo = 'parceiro' THEN (SELECT email FROM parceiros WHERE id = us.usuario_id LIMIT 1)
            WHEN us.usuario_tipo = 'provedor' THEN (SELECT email FROM provedores WHERE id = us.usuario_id LIMIT 1)
            WHEN us.usuario_tipo = 'superadmin' THEN (SELECT email FROM admins WHERE id = us.usuario_id LIMIT 1)
            ELSE NULL
          END as user_email,
          CASE
            WHEN us.usuario_tipo = 'cliente' THEN (SELECT p.nome_empresa FROM clientes c JOIN provedores p ON c.tenant_id = p.tenant_id WHERE c.id = us.usuario_id LIMIT 1)
            WHEN us.usuario_tipo = 'parceiro' THEN (SELECT p.nome_empresa FROM parceiros pa JOIN provedores p ON pa.tenant_id = p.tenant_id WHERE pa.id = us.usuario_id LIMIT 1)
            WHEN us.usuario_tipo = 'provedor' THEN (SELECT nome_empresa FROM provedores WHERE id = us.usuario_id LIMIT 1)
            ELSE NULL
          END as provider_name,
          CASE
            WHEN us.usuario_tipo = 'cliente' THEN (SELECT c.tenant_id FROM clientes c WHERE c.id = us.usuario_id LIMIT 1)
            WHEN us.usuario_tipo = 'parceiro' THEN (SELECT pa.tenant_id FROM parceiros pa WHERE pa.id = us.usuario_id LIMIT 1)
            WHEN us.usuario_tipo = 'provedor' THEN (SELECT p.tenant_id FROM provedores p WHERE p.id = us.usuario_id LIMIT 1)
            ELSE NULL
          END as tenant_id
        FROM user_sessions us
        WHERE us.rn = 1
      )
      SELECT 
        session_id,
        usuario_id as user_id,
        user_name,
        user_email,
        usuario_tipo as user_type,
        ip_address,
        'Mozilla/5.0 (compatible)' as user_agent, -- Simplificado
        device_type,
        location,
        login_time,
        last_activity,
        session_status as status,
        COALESCE(duration_minutes, 0) as duration,
        tenant_id,
        provider_name
      FROM user_details
      ${whereClause}
      ORDER BY last_activity DESC
      LIMIT 50
    `

    const sessoesResult = await pool.query(sessoesQuery, params)

    // Estatísticas de sessões com queries separadas para evitar problemas de agregação
    const statsQuery = `
      WITH user_sessions AS (
        SELECT DISTINCT
          tl.usuario_tipo,
          tl.usuario_id,
          MAX(tl.created_at) as last_activity,
          MIN(tl.created_at) as first_activity,
          COUNT(DISTINCT tl.ip_address) as unique_ips
        FROM tenant_logs tl
        WHERE (tl.acao ILIKE '%login%' OR tl.acao ILIKE '%acesso%')
          AND tl.created_at >= NOW() - INTERVAL '7 days'
        GROUP BY tl.usuario_tipo, tl.usuario_id
      )
      SELECT
        COUNT(*) as total_sessions,
        COUNT(*) as unique_users,
        COUNT(*) FILTER (WHERE last_activity > NOW() - INTERVAL '1 hour') as active_sessions,
        COUNT(*) FILTER (WHERE last_activity BETWEEN NOW() - INTERVAL '24 hours' AND NOW() - INTERVAL '1 hour') as expired_sessions,
        COALESCE(AVG(EXTRACT(EPOCH FROM (last_activity - first_activity)) / 60), 0) as avg_session_duration,
        COUNT(*) FILTER (WHERE unique_ips > 1) as suspicious_sessions
      FROM user_sessions
    `

    const statsResult = await pool.query(statsQuery)

    return NextResponse.json({
      sessions: sessoesResult.rows,
      statistics: {
        total_sessions: parseInt(statsResult.rows[0]?.total_sessions || 0),
        active_sessions: parseInt(statsResult.rows[0]?.active_sessions || 0),
        expired_sessions: parseInt(statsResult.rows[0]?.expired_sessions || 0),
        unique_users: parseInt(statsResult.rows[0]?.unique_users || 0),
        avg_session_duration: Math.round(statsResult.rows[0]?.avg_session_duration || 0),
        suspicious_sessions: parseInt(statsResult.rows[0]?.suspicious_sessions || 0)
      }
    })

  } catch (error) {
    console.error('Erro na API de sessões:', error)
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
    const { action, session_id, user_type, user_id } = body

    if (action === 'terminate_session') {
      // Registrar encerramento forçado de sessão
      await pool.query(`
        INSERT INTO tenant_logs (usuario_tipo, usuario_id, acao, detalhes, ip_address)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        'superadmin',
        session.user.id,
        'Encerramento forçado de sessão',
        JSON.stringify({ 
          terminated_user_type: user_type,
          terminated_user_id: user_id,
          session_id,
          reason: 'Encerrado pelo superadmin'
        }),
        request.headers.get('x-forwarded-for') || '127.0.0.1'
      ])

      return NextResponse.json({
        success: true,
        message: 'Sessão encerrada com sucesso'
      })
    }

    return NextResponse.json({ error: 'Ação não reconhecida' }, { status: 400 })

  } catch (error) {
    console.error('Erro ao processar ação de sessão:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
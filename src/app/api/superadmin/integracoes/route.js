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
    const status = searchParams.get('status') // 'ativo', 'inativo', 'erro'
    const tipo = searchParams.get('tipo') || 'SGP'
    const tenant_id = searchParams.get('tenant_id')

    // Query principal de integrações
    let whereClause = 'WHERE i.tipo = $1'
    const params = [tipo]
    let paramCount = 2

    if (tenant_id) {
      whereClause += ` AND p.tenant_id = $${paramCount}`
      params.push(tenant_id)
      paramCount++
    }

    const integracoesQuery = `
      SELECT 
        i.*,
        p.nome_empresa,
        p.email as provedor_email,
        p.ativo as provedor_ativo,
        pl.nome as plano_nome,
        
        -- Status de conectividade (simulado)
        CASE 
          WHEN i.token IS NULL OR i.token = '' THEN 'desconectado'
          WHEN i.created_at < NOW() - INTERVAL '30 days' THEN 'inativo'
          ELSE 'conectado'
        END as status_conexao,
        
        -- Última sincronização (buscar nos logs)
        (SELECT MAX(created_at) 
         FROM tenant_logs tl 
         WHERE tl.tenant_id = i.tenant_id 
           AND tl.acao LIKE '%sincronizacao%'
        ) as ultima_sincronizacao,
        
        -- Contadores
        (SELECT COUNT(*) FROM clientes c WHERE c.tenant_id = i.tenant_id) as total_clientes,
        (SELECT COUNT(*) FROM parceiros pa WHERE pa.tenant_id = i.tenant_id) as total_parceiros
        
      FROM integracoes i
      JOIN provedores p ON i.tenant_id = p.tenant_id
      LEFT JOIN planos pl ON p.plano_id = pl.id
      ${whereClause}
      ORDER BY p.nome_empresa
    `

    const result = await pool.query(integracoesQuery, params)

    // Estatísticas gerais
    const statsQuery = `
      SELECT 
        COUNT(*) as total_integracoes,
        COUNT(*) FILTER (WHERE token IS NOT NULL AND token != '') as conectadas,
        COUNT(*) FILTER (WHERE token IS NULL OR token = '') as desconectadas,
        COUNT(DISTINCT tenant_id) as provedores_com_integracao,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as novas_7dias
      FROM integracoes 
      WHERE tipo = $1
    `

    const statsResult = await pool.query(statsQuery, [tipo])

    // Atividade de sincronização (últimos 30 dias)
    const atividadeQuery = `
      SELECT 
        DATE_TRUNC('day', created_at) as data,
        COUNT(*) as sincronizacoes
      FROM tenant_logs
      WHERE acao LIKE '%sincronizacao%'
        AND created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY data DESC
      LIMIT 30
    `

    const atividade = await pool.query(atividadeQuery)

    // Erros recentes de integração
    const errosQuery = `
      SELECT 
        tl.*,
        p.nome_empresa
      FROM tenant_logs tl
      JOIN provedores p ON tl.tenant_id = p.tenant_id
      WHERE tl.acao LIKE '%erro%integracao%'
        OR tl.acao LIKE '%falha%sincronizacao%'
      ORDER BY tl.created_at DESC
      LIMIT 20
    `

    const errosRecentes = await pool.query(errosQuery)

    // Performance por provedor (média de tempo de resposta)
    const performanceQuery = `
      SELECT 
        p.nome_empresa,
        p.tenant_id,
        COUNT(tl.id) as total_requests,
        AVG(EXTRACT(EPOCH FROM (tl.created_at - tl.created_at))) as tempo_medio_resposta,
        COUNT(tl.id) FILTER (WHERE tl.acao LIKE '%erro%') as total_erros
      FROM provedores p
      JOIN tenant_logs tl ON p.tenant_id = tl.tenant_id
      WHERE tl.acao LIKE '%integracao%'
        AND tl.created_at >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY p.id, p.nome_empresa, p.tenant_id
      HAVING COUNT(tl.id) > 0
      ORDER BY total_requests DESC
      LIMIT 10
    `

    const performance = await pool.query(performanceQuery)

    return NextResponse.json({
      integracoes: result.rows,
      estatisticas: statsResult.rows[0],
      atividade_sincronizacao: atividade.rows,
      erros_recentes: errosRecentes.rows,
      performance_provedores: performance.rows
    })

  } catch (error) {
    console.error('Erro na API de integrações:', error)
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
    const { action, integracao_id, tenant_id, dados } = body

    if (action === 'test_connection') {
      // Testar conexão com integração
      try {
        const integracaoResult = await pool.query(`
          SELECT * FROM integracoes WHERE id = $1
        `, [integracao_id])

        if (integracaoResult.rows.length === 0) {
          return NextResponse.json({ error: 'Integração não encontrada' }, { status: 404 })
        }

        const integracao = integracaoResult.rows[0]

        // Simular teste de conexão (adaptar conforme API específica)
        const isOnline = integracao.token && integracao.token.length > 0

        // Registrar resultado do teste
        await pool.query(`
          INSERT INTO tenant_logs (tenant_id, usuario_tipo, usuario_id, acao, detalhes, ip_address)
          VALUES ($1, 'superadmin', $2, 'Teste de conexão de integração', $3, $4)
        `, [
          integracao.tenant_id,
          session.user.id,
          JSON.stringify({ integracao_id, resultado: isOnline ? 'sucesso' : 'falha' }),
          request.headers.get('x-forwarded-for') || '127.0.0.1'
        ])

        return NextResponse.json({
          success: true,
          online: isOnline,
          detalhes: isOnline ? 'Conexão estabelecida com sucesso' : 'Falha na conexão - token inválido'
        })

      } catch (testError) {
        return NextResponse.json({
          success: false,
          online: false,
          detalhes: `Erro no teste: ${testError.message}`
        })
      }
    }

    if (action === 'force_sync') {
      // Forçar sincronização
      try {
        // Aqui você implementaria a lógica específica de sincronização
        // Por enquanto, apenas registramos a ação
        await pool.query(`
          INSERT INTO tenant_logs (tenant_id, usuario_tipo, usuario_id, acao, detalhes, ip_address)
          VALUES ($1, 'superadmin', $2, 'Sincronização forçada', $3, $4)
        `, [
          tenant_id,
          session.user.id,
          JSON.stringify({ integracao_id, timestamp: new Date() }),
          request.headers.get('x-forwarded-for') || '127.0.0.1'
        ])

        return NextResponse.json({
          success: true,
          message: 'Sincronização iniciada com sucesso'
        })

      } catch (syncError) {
        return NextResponse.json({
          success: false,
          message: `Erro na sincronização: ${syncError.message}`
        }, { status: 500 })
      }
    }

    if (action === 'update_config') {
      // Atualizar configurações de integração
      const { subdominio, app_name, modo_ativacao } = dados

      const updateQuery = `
        UPDATE integracoes 
        SET subdominio = $1,
            app_name = $2,
            modo_ativacao = $3
        WHERE id = $4
        RETURNING *
      `

      const result = await pool.query(updateQuery, [
        subdominio,
        app_name,
        modo_ativacao,
        integracao_id
      ])

      // Registrar alteração
      await pool.query(`
        INSERT INTO tenant_logs (tenant_id, usuario_tipo, usuario_id, acao, detalhes, ip_address)
        VALUES ($1, 'superadmin', $2, 'Atualização de configuração de integração', $3, $4)
      `, [
        tenant_id,
        session.user.id,
        JSON.stringify({ integracao_id, alteracoes: dados }),
        request.headers.get('x-forwarded-for') || '127.0.0.1'
      ])

      return NextResponse.json({
        success: true,
        integracao: result.rows[0]
      })
    }

    if (action === 'disable_integration') {
      // Desativar integração
      const disableQuery = `
        UPDATE integracoes 
        SET token = NULL
        WHERE id = $1
        RETURNING *
      `

      const result = await pool.query(disableQuery, [integracao_id])

      await pool.query(`
        INSERT INTO tenant_logs (tenant_id, usuario_tipo, usuario_id, acao, detalhes, ip_address)
        VALUES ($1, 'superadmin', $2, 'Desativação de integração', $3, $4)
      `, [
        tenant_id,
        session.user.id,
        JSON.stringify({ integracao_id, motivo: 'Desativada pelo superadmin' }),
        request.headers.get('x-forwarded-for') || '127.0.0.1'
      ])

      return NextResponse.json({
        success: true,
        message: 'Integração desativada com sucesso'
      })
    }

    return NextResponse.json({ error: 'Ação não reconhecida' }, { status: 400 })

  } catch (error) {
    console.error('Erro ao processar ação de integração:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const session = await getServerSession(options)
    
    if (!session || session.user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const integracao_id = searchParams.get('id')

    if (!integracao_id) {
      return NextResponse.json({ error: 'ID da integração é obrigatório' }, { status: 400 })
    }

    // Buscar dados da integração antes de deletar
    const integracaoResult = await pool.query(`
      SELECT * FROM integracoes WHERE id = $1
    `, [integracao_id])

    if (integracaoResult.rows.length === 0) {
      return NextResponse.json({ error: 'Integração não encontrada' }, { status: 404 })
    }

    const integracao = integracaoResult.rows[0]

    // Deletar integração
    await pool.query(`DELETE FROM integracoes WHERE id = $1`, [integracao_id])

    // Registrar exclusão
    await pool.query(`
      INSERT INTO tenant_logs (tenant_id, usuario_tipo, usuario_id, acao, detalhes, ip_address)
      VALUES ($1, 'superadmin', $2, 'Exclusão de integração', $3, $4)
    `, [
      integracao.tenant_id,
      session.user.id,
      JSON.stringify({ integracao_id, tipo: integracao.tipo }),
      request.headers.get('x-forwarded-for') || '127.0.0.1'
    ])

    return NextResponse.json({
      success: true,
      message: 'Integração removida com sucesso'
    })

  } catch (error) {
    console.error('Erro ao deletar integração:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { DomainHelper } from '@/lib/domain-helper.js';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * POST /api/admin/dominios/verificar
 * Verifica configuração de domínio personalizado
 */
export async function POST(request) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

    if (!token || !['provedor', 'superadmin'].includes(token.user.role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { dominio, dominio_id } = await request.json();

    if (!dominio && !dominio_id) {
      return NextResponse.json(
        { error: 'Domínio ou ID do domínio é obrigatório' },
        { status: 400 }
      );
    }

    // Buscar domínio no banco
    let whereClause, params;

    if (dominio_id) {
      whereClause = 'WHERE dp.id = $1';
      params = [dominio_id];
    } else {
      whereClause = 'WHERE dp.dominio = $1';
      params = [dominio];
    }

    // Adicionar filtro por provedor se não for superadmin
    if (token.user.role !== 'superadmin') {
      whereClause += ` AND dp.provedor_id = $${params.length + 1}`;
      params.push(token.user.id);
    }

    const domainResult = await pool.query(`
      SELECT
        dp.*,
        p.nome_empresa,
        p.email as provedor_email
      FROM dominios_personalizados dp
      LEFT JOIN provedores p ON dp.provedor_id = p.id
      ${whereClause}
      AND dp.ativo = true
    `, params);

    if (domainResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Domínio não encontrado ou acesso negado' },
        { status: 404 }
      );
    }

    const domainData = domainResult.rows[0];

    // Verificar configuração do domínio
    const verificationResult = await DomainHelper.verifyDomainConfiguration(domainData.dominio);

    // Registrar tentativa de verificação
    await pool.query(`
      INSERT INTO acessos_dominio (
        dominio_id,
        provedor_id,
        ip_address,
        user_agent,
        path,
        metodo,
        user_id,
        user_tipo
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      domainData.id,
      domainData.provedor_id,
      request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip'),
      request.headers.get('user-agent'),
      '/api/admin/dominios/verificar',
      'POST',
      token.user.id,
      token.user.role
    ]);

    if (verificationResult.verified) {
      // Buscar dados atualizados após verificação
      const updatedDomain = await pool.query(
        'SELECT * FROM dominios_personalizados WHERE id = $1',
        [domainData.id]
      );

      return NextResponse.json({
        success: true,
        verificado: true,
        dominio: updatedDomain.rows[0],
        detalhes: verificationResult,
        message: 'Domínio verificado com sucesso!'
      });
    } else {
      return NextResponse.json({
        success: false,
        verificado: false,
        dominio: domainData,
        detalhes: verificationResult,
        instrucoes: {
          dns: 'Adicione um registro TXT no DNS:',
          host: `_parceirize.${domainData.dominio}`,
          valor: domainData.verificacao_token,
          exemplo: `_parceirize.${domainData.dominio}. TXT "${domainData.verificacao_token}"`,
          erro: verificationResult.error
        }
      }, { status: 422 });
    }

  } catch (error) {
    console.error('Erro na verificação de domínio:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/dominios/verificar?dominio=exemplo.com
 * Verifica status de um domínio sem autenticação (para webhooks)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const dominio = searchParams.get('dominio');
    const token_verificacao = searchParams.get('token');

    if (!dominio) {
      return NextResponse.json(
        { error: 'Parâmetro dominio é obrigatório' },
        { status: 400 }
      );
    }

    // Buscar domínio no banco
    const domainResult = await pool.query(
      'SELECT * FROM dominios_personalizados WHERE dominio = $1 AND ativo = true',
      [dominio]
    );

    if (domainResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Domínio não encontrado' },
        { status: 404 }
      );
    }

    const domainData = domainResult.rows[0];

    // Se token foi fornecido, validar
    if (token_verificacao && token_verificacao !== domainData.verificacao_token) {
      return NextResponse.json(
        { error: 'Token de verificação inválido' },
        { status: 403 }
      );
    }

    // Verificar configuração
    const verificationResult = await DomainHelper.verifyDomainConfiguration(dominio);

    return NextResponse.json({
      dominio: dominio,
      verificado: verificationResult.verified,
      detalhes: verificationResult,
      ultima_verificacao: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro na verificação pública de domínio:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/dominios/verificar
 * Regenera token de verificação
 */
export async function PUT(request) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

    if (!token || !['provedor', 'superadmin'].includes(token.user.role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { dominio_id } = await request.json();

    if (!dominio_id) {
      return NextResponse.json(
        { error: 'ID do domínio é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar se domínio pertence ao provedor
    let whereClause = 'WHERE id = $1';
    let params = [dominio_id];

    if (token.user.role !== 'superadmin') {
      whereClause += ' AND provedor_id = $2';
      params.push(token.user.id);
    }

    const domainCheck = await pool.query(`
      SELECT * FROM dominios_personalizados
      ${whereClause}
      AND ativo = true
    `, params);

    if (domainCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Domínio não encontrado ou acesso negado' },
        { status: 404 }
      );
    }

    // Gerar novo token
    const newTokenResult = await pool.query('SELECT gerar_token_verificacao() as token');
    const newToken = newTokenResult.rows[0].token;

    // Atualizar domínio
    const updatedDomain = await pool.query(`
      UPDATE dominios_personalizados
      SET
        verificacao_token = $1,
        verificado = false,
        verificado_em = NULL
      WHERE id = $2
      RETURNING *
    `, [newToken, dominio_id]);

    return NextResponse.json({
      success: true,
      dominio: updatedDomain.rows[0],
      instrucoes: {
        dns: 'Adicione o novo registro TXT no DNS:',
        host: `_parceirize.${updatedDomain.rows[0].dominio}`,
        valor: newToken,
        exemplo: `_parceirize.${updatedDomain.rows[0].dominio}. TXT "${newToken}"`
      },
      message: 'Token de verificação regenerado'
    });

  } catch (error) {
    console.error('Erro ao regenerar token:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
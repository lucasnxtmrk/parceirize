import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { DomainHelper } from '@/lib/domain-helper.js';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * GET /api/admin/dominios
 * Lista domínios do provedor autenticado
 */
export async function GET(request) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

    if (!token || !['provedor', 'superadmin'].includes(token.user.role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Para superadmin, pode especificar provider_id via query param
    const { searchParams } = new URL(request.url);
    const provedorId = token.user.role === 'superadmin'
      ? searchParams.get('provider_id') || token.user.id
      : token.user.id;

    const dominios = await DomainHelper.listProviderDomains(provedorId);

    return NextResponse.json({
      success: true,
      dominios,
      total: dominios.length
    });

  } catch (error) {
    console.error('Erro ao listar domínios:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/dominios
 * Registra novo domínio personalizado
 */
export async function POST(request) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

    if (!token || !['provedor', 'superadmin'].includes(token.user.role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { dominio, tipo = 'personalizado' } = await request.json();

    if (!dominio) {
      return NextResponse.json(
        { error: 'Domínio é obrigatório' },
        { status: 400 }
      );
    }

    // Validar domínio
    const validation = DomainHelper.validateDomain(dominio);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Para superadmin, pode especificar provider_id
    const provedorId = token.user.role === 'superadmin' && request.body?.provider_id
      ? request.body.provider_id
      : token.user.id;

    // Verificar se provedor existe e está ativo
    const providerCheck = await pool.query(
      'SELECT id, nome_empresa, ativo FROM provedores WHERE id = $1',
      [provedorId]
    );

    if (providerCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Provedor não encontrado' },
        { status: 404 }
      );
    }

    if (!providerCheck.rows[0].ativo) {
      return NextResponse.json(
        { error: 'Provedor inativo' },
        { status: 403 }
      );
    }

    // Verificar limites do plano (se não for superadmin)
    if (token.user.role !== 'superadmin') {
      const limitsCheck = await pool.query(`
        SELECT
          p.tem_subdominio,
          COUNT(dp.id) as dominios_atuais
        FROM provedores pr
        LEFT JOIN planos p ON pr.plano_id = p.id
        LEFT JOIN dominios_personalizados dp ON pr.id = dp.provedor_id AND dp.ativo = true
        WHERE pr.id = $1
        GROUP BY p.tem_subdominio
      `, [provedorId]);

      const limits = limitsCheck.rows[0];

      if (tipo === 'personalizado' && !limits?.tem_subdominio) {
        return NextResponse.json(
          { error: 'Seu plano não suporta domínios personalizados' },
          { status: 403 }
        );
      }

      // Limite de 5 domínios por provedor (pode ser configurável)
      if (limits?.dominios_atuais >= 5) {
        return NextResponse.json(
          { error: 'Limite de domínios excedido (máximo 5)' },
          { status: 403 }
        );
      }
    }

    // Registrar domínio
    const novoDominio = await DomainHelper.registerDomain(provedorId, dominio, tipo);

    return NextResponse.json({
      success: true,
      dominio: novoDominio,
      instrucoes: {
        dns: `Adicione um registro TXT no DNS:`,
        host: `_parceirize.${dominio}`,
        valor: novoDominio.verificacao_token,
        exemplo: `_parceirize.${dominio}. TXT "${novoDominio.verificacao_token}"`
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Erro ao registrar domínio:', error);

    if (error.message.includes('já está registrado')) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/dominios
 * Remove domínio (marca como inativo)
 */
export async function DELETE(request) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

    if (!token || !['provedor', 'superadmin'].includes(token.user.role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const dominioId = searchParams.get('id');

    if (!dominioId) {
      return NextResponse.json(
        { error: 'ID do domínio é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar se domínio pertence ao provedor (exceto superadmin)
    let whereClause = 'WHERE dp.id = $1';
    let params = [dominioId];

    if (token.user.role !== 'superadmin') {
      whereClause += ' AND dp.provedor_id = $2';
      params.push(token.user.id);
    }

    const domainCheck = await pool.query(`
      SELECT dp.*, p.nome_empresa
      FROM dominios_personalizados dp
      LEFT JOIN provedores p ON dp.provedor_id = p.id
      ${whereClause}
    `, params);

    if (domainCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Domínio não encontrado ou acesso negado' },
        { status: 404 }
      );
    }

    const domain = domainCheck.rows[0];

    // Não permitir exclusão de subdomínios padrão
    if (domain.tipo === 'subdominio' && domain.dominio.endsWith('.parceirize.com')) {
      return NextResponse.json(
        { error: 'Não é possível remover subdomínio padrão' },
        { status: 403 }
      );
    }

    // Marcar como inativo ao invés de deletar (soft delete)
    await pool.query(
      'UPDATE dominios_personalizados SET ativo = false WHERE id = $1',
      [dominioId]
    );

    return NextResponse.json({
      success: true,
      message: 'Domínio removido com sucesso'
    });

  } catch (error) {
    console.error('Erro ao remover domínio:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
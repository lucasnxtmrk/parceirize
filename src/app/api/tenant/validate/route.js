import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const subdomain = searchParams.get('subdomain');

  if (!subdomain) {
    return NextResponse.json({ valid: false, error: 'Subdomínio não fornecido' }, { status: 400 });
  }

  try {
    const query = `
      SELECT
        id as provedor_id,
        tenant_id,
        nome_empresa,
        ativo
      FROM provedores
      WHERE LOWER(subdominio) = $1 AND ativo = true
    `;

    const result = await pool.query(query, [subdomain.toLowerCase()]);

    if (result.rows.length === 0) {
      return NextResponse.json({
        valid: false,
        error: 'Subdomínio não encontrado ou inativo'
      }, { status: 404 });
    }

    const tenant = result.rows[0];

    return NextResponse.json({
      valid: true,
      tenant_id: tenant.tenant_id,
      provedor_id: tenant.provedor_id,
      nome_empresa: tenant.nome_empresa,
      subdomain: subdomain
    });

  } catch (error) {
    console.error('Erro ao validar tenant:', error);
    return NextResponse.json({
      valid: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}
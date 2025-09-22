import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { options } from '../../auth/[...nextauth]/options';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET() {
  try {
    const session = await getServerSession(options);

    if (!session || session.user.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas superadmins podem acessar.' },
        { status: 403 }
      );
    }

    // Query para buscar dados de controle de acesso
    const acessosQuery = `
      SELECT
        'superadmin' as tipo,
        COUNT(*) as total
      FROM admins WHERE tipo = 'superadmin' AND ativo = true

      UNION ALL

      SELECT
        'provedor' as tipo,
        COUNT(*) as total
      FROM provedores WHERE ativo = true

      UNION ALL

      SELECT
        'parceiro' as tipo,
        COUNT(*) as total
      FROM parceiros WHERE ativo = true

      UNION ALL

      SELECT
        'cliente' as tipo,
        COUNT(*) as total
      FROM clientes WHERE ativo = true
    `;

    // Query para últimos logins (baseado nos logs)
    const ultimosLoginsQuery = `
      SELECT
        tl.usuario_tipo,
        tl.acao,
        tl.created_at,
        CASE
          WHEN tl.usuario_tipo = 'superadmin' THEN a.nome
          WHEN tl.usuario_tipo = 'provedor' THEN p.nome_empresa
          WHEN tl.usuario_tipo = 'parceiro' THEN pa.nome_empresa
          WHEN tl.usuario_tipo = 'cliente' THEN CONCAT(c.nome, ' ', c.sobrenome)
          ELSE 'Usuário Desconhecido'
        END as nome_usuario
      FROM tenant_logs tl
      LEFT JOIN admins a ON tl.usuario_tipo = 'superadmin' AND tl.usuario_id = a.id
      LEFT JOIN provedores p ON tl.usuario_tipo = 'provedor' AND tl.usuario_id = p.id
      LEFT JOIN parceiros pa ON tl.usuario_tipo = 'parceiro' AND tl.usuario_id = pa.id
      LEFT JOIN clientes c ON tl.usuario_tipo = 'cliente' AND tl.usuario_id = c.id
      WHERE tl.acao LIKE '%login%' OR tl.acao LIKE '%acesso%'
      ORDER BY tl.created_at DESC
      LIMIT 20
    `;

    const [acessosResult, loginsResult] = await Promise.all([
      pool.query(acessosQuery),
      pool.query(ultimosLoginsQuery)
    ]);

    return NextResponse.json({
      estatisticas: acessosResult.rows,
      ultimosLogins: loginsResult.rows
    });

  } catch (error) {
    console.error('Erro ao buscar dados de controle de acesso:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
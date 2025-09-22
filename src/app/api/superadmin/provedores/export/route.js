import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { options } from '../../../auth/[...nextauth]/options';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// GET - Exportar provedores em CSV
export async function GET(request) {
  try {
    // Verificar autenticação de superadmin
    const session = await getServerSession(options);

    if (!session || session.user.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas superadmins podem acessar.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const plano = searchParams.get('plano') || '';
    const status = searchParams.get('status') || '';
    const vencimento = searchParams.get('vencimento') || '';

    // Construir WHERE clauses (mesmo filtro da listagem)
    const whereConditions = ['1=1'];
    const queryParams = [];
    let paramIndex = 1;

    // Filtro de busca (nome da empresa, email)
    if (search) {
      whereConditions.push(`(
        p.nome_empresa ILIKE $${paramIndex} OR
        p.email ILIKE $${paramIndex}
      )`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    // Filtro por plano
    if (plano) {
      whereConditions.push(`p.plano_id = $${paramIndex}`);
      queryParams.push(plano);
      paramIndex++;
    }

    // Filtro por status
    if (status === 'ativo') {
      whereConditions.push(`p.ativo = true`);
    } else if (status === 'inativo') {
      whereConditions.push(`p.ativo = false`);
    }

    // Filtro por vencimento
    if (vencimento === 'vencido') {
      whereConditions.push(`p.data_vencimento < CURRENT_DATE`);
    } else if (vencimento === 'proximo') {
      whereConditions.push(`p.data_vencimento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'`);
    } else if (vencimento === 'vigente') {
      whereConditions.push(`(p.data_vencimento IS NULL OR p.data_vencimento > CURRENT_DATE + INTERVAL '30 days')`);
    }

    const whereClause = whereConditions.join(' AND ');

    // Query para exportação
    const exportQuery = `
      SELECT
        p.id,
        p.nome_empresa,
        p.email,
        p.subdominio,
        CASE WHEN p.ativo THEN 'Ativo' ELSE 'Inativo' END as status,
        TO_CHAR(p.data_vencimento, 'DD/MM/YYYY') as data_vencimento,
        TO_CHAR(p.created_at, 'DD/MM/YYYY HH24:MI') as data_criacao,
        pl.nome as plano_nome,
        pl.preco as plano_preco,
        COALESCE(c_stats.total_clientes, 0) as total_clientes,
        COALESCE(par_stats.total_parceiros, 0) as total_parceiros,
        COALESCE(v_stats.total_vouchers, 0) as total_vouchers,
        COALESCE(v_stats.vouchers_utilizados, 0) as vouchers_utilizados
      FROM provedores p
      LEFT JOIN planos pl ON p.plano_id = pl.id
      LEFT JOIN (
        SELECT
          tenant_id,
          COUNT(*) as total_clientes
        FROM clientes
        WHERE ativo = true
        GROUP BY tenant_id
      ) c_stats ON p.tenant_id = c_stats.tenant_id
      LEFT JOIN (
        SELECT
          tenant_id,
          COUNT(*) as total_parceiros
        FROM parceiros
        WHERE ativo = true
        GROUP BY tenant_id
      ) par_stats ON p.tenant_id = par_stats.tenant_id
      LEFT JOIN (
        SELECT
          par.tenant_id,
          COUNT(v.id) as total_vouchers,
          COUNT(v.id) FILTER (WHERE v.utilizado = true) as vouchers_utilizados
        FROM vouchers v
        JOIN parceiros par ON v.parceiro_id = par.id
        GROUP BY par.tenant_id
      ) v_stats ON p.tenant_id = v_stats.tenant_id
      WHERE ${whereClause}
      ORDER BY p.created_at DESC
    `;

    const result = await pool.query(exportQuery, queryParams);
    const provedores = result.rows;

    // Criar CSV
    const headers = [
      'ID',
      'Nome da Empresa',
      'Email',
      'Subdomínio',
      'Status',
      'Data Vencimento',
      'Data Criação',
      'Plano',
      'Valor Plano (R$)',
      'Total Clientes',
      'Total Parceiros',
      'Total Vouchers',
      'Vouchers Utilizados'
    ];

    let csvContent = headers.join(',') + '\n';

    provedores.forEach(provedor => {
      const row = [
        provedor.id,
        `"${provedor.nome_empresa || ''}"`,
        `"${provedor.email || ''}"`,
        `"${provedor.subdominio || ''}"`,
        `"${provedor.status}"`,
        `"${provedor.data_vencimento || ''}"`,
        `"${provedor.data_criacao}"`,
        `"${provedor.plano_nome || ''}"`,
        `"R$ ${parseFloat(provedor.plano_preco || 0).toFixed(2).replace('.', ',')}"`,
        provedor.total_clientes || 0,
        provedor.total_parceiros || 0,
        provedor.total_vouchers || 0,
        provedor.vouchers_utilizados || 0
      ];
      csvContent += row.join(',') + '\n';
    });

    // Log da exportação
    await pool.query(
      `INSERT INTO tenant_logs (tenant_id, usuario_tipo, usuario_id, acao, detalhes)
       VALUES (NULL, 'superadmin', $1, 'export_provedores', $2)`,
      [
        session.user.id,
        JSON.stringify({
          total_registros: provedores.length,
          filtros: { search, plano, status, vencimento },
          timestamp: new Date().toISOString()
        })
      ]
    );

    // Retornar CSV
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="provedores-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });

  } catch (error) {
    console.error('Erro ao exportar provedores:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
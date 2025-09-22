import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { options } from '../../../auth/[...nextauth]/options';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

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
    const status_pagamento = searchParams.get('status_pagamento') || '';
    const plano = searchParams.get('plano') || '';

    // Construir WHERE clauses
    const whereConditions = ['1=1'];
    const queryParams = [];
    let paramIndex = 1;

    // Filtro de busca
    if (search) {
      whereConditions.push(`(
        p.nome_empresa ILIKE $${paramIndex} OR
        p.email ILIKE $${paramIndex}
      )`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    // Filtro por status de pagamento
    if (status_pagamento === 'vencido') {
      whereConditions.push(`p.data_vencimento < CURRENT_DATE`);
    } else if (status_pagamento === 'pago') {
      whereConditions.push(`(p.data_vencimento IS NULL OR p.data_vencimento >= CURRENT_DATE)`);
    } else if (status_pagamento === 'pendente') {
      whereConditions.push(`p.data_vencimento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'`);
    }

    // Filtro por plano
    if (plano) {
      whereConditions.push(`p.plano_id = $${paramIndex}`);
      queryParams.push(plano);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    // Query para exportação financeira
    const exportQuery = `
      SELECT
        p.id,
        p.nome_empresa,
        p.email,
        p.subdominio,
        CASE WHEN p.ativo THEN 'Ativo' ELSE 'Inativo' END as status_provedor,
        pl.nome as plano_nome,
        pl.preco as valor_mensal,
        TO_CHAR(p.data_vencimento, 'DD/MM/YYYY') as data_vencimento,
        TO_CHAR(p.created_at, 'DD/MM/YYYY') as data_cadastro,

        -- Status de pagamento
        CASE
          WHEN p.data_vencimento IS NULL THEN 'Sem Vencimento'
          WHEN p.data_vencimento < CURRENT_DATE THEN 'Vencido'
          WHEN p.data_vencimento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days' THEN 'Vence em Breve'
          ELSE 'Em Dia'
        END as status_pagamento,

        -- Dias para vencimento
        CASE
          WHEN p.data_vencimento IS NULL THEN NULL
          ELSE p.data_vencimento - CURRENT_DATE
        END as dias_para_vencimento,

        -- Receita anual estimada
        pl.preco * 12 as receita_anual_estimada,

        -- Último pagamento (simulado - pode vir de uma tabela de pagamentos)
        TO_CHAR(p.updated_at, 'DD/MM/YYYY') as ultimo_pagamento_simulado,

        -- Estatísticas do tenant
        COALESCE(c_stats.total_clientes, 0) as total_clientes,
        COALESCE(par_stats.total_parceiros, 0) as total_parceiros,
        COALESCE(prod_stats.total_produtos, 0) as total_produtos

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
          pr.tenant_id,
          COUNT(*) as total_produtos
        FROM produtos pr
        WHERE pr.ativo = true
        GROUP BY pr.tenant_id
      ) prod_stats ON p.tenant_id = prod_stats.tenant_id
      WHERE ${whereClause}
      ORDER BY
        CASE
          WHEN p.data_vencimento IS NULL THEN 3
          WHEN p.data_vencimento < CURRENT_DATE THEN 0
          WHEN p.data_vencimento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days' THEN 1
          ELSE 2
        END,
        p.data_vencimento ASC NULLS LAST
    `;

    const result = await pool.query(exportQuery, queryParams);
    const provedores = result.rows;

    // Criar CSV
    const headers = [
      'ID',
      'Nome da Empresa',
      'Email',
      'Subdomínio',
      'Status do Provedor',
      'Plano',
      'Valor Mensal (R$)',
      'Data Vencimento',
      'Data Cadastro',
      'Status Pagamento',
      'Dias para Vencimento',
      'Receita Anual Estimada (R$)',
      'Último Pagamento',
      'Total Clientes',
      'Total Parceiros',
      'Total Produtos'
    ];

    let csvContent = headers.join(',') + '\n';

    provedores.forEach(provedor => {
      const row = [
        provedor.id,
        `"${provedor.nome_empresa || ''}"`,
        `"${provedor.email || ''}"`,
        `"${provedor.subdominio || ''}"`,
        `"${provedor.status_provedor}"`,
        `"${provedor.plano_nome || ''}"`,
        `"R$ ${parseFloat(provedor.valor_mensal || 0).toFixed(2).replace('.', ',')}"`,
        `"${provedor.data_vencimento || ''}"`,
        `"${provedor.data_cadastro}"`,
        `"${provedor.status_pagamento}"`,
        provedor.dias_para_vencimento || '',
        `"R$ ${parseFloat(provedor.receita_anual_estimada || 0).toFixed(2).replace('.', ',')}"`,
        `"${provedor.ultimo_pagamento_simulado || ''}"`,
        provedor.total_clientes || 0,
        provedor.total_parceiros || 0,
        provedor.total_produtos || 0
      ];
      csvContent += row.join(',') + '\n';
    });

    // Adicionar resumo no final
    const totalReceitaMensal = provedores.reduce((sum, p) => sum + parseFloat(p.valor_mensal || 0), 0);
    const totalReceitaAnual = totalReceitaMensal * 12;
    const provedoresAtivos = provedores.filter(p => p.status_provedor === 'Ativo').length;
    const provedoresVencidos = provedores.filter(p => p.status_pagamento === 'Vencido').length;

    csvContent += '\n\n';
    csvContent += 'RESUMO EXECUTIVO\n';
    csvContent += `Total de Provedores,"${provedores.length}"\n`;
    csvContent += `Provedores Ativos,"${provedoresAtivos}"\n`;
    csvContent += `Provedores Vencidos,"${provedoresVencidos}"\n`;
    csvContent += `Receita Mensal Total,"R$ ${totalReceitaMensal.toFixed(2).replace('.', ',')}"\n`;
    csvContent += `Receita Anual Estimada,"R$ ${totalReceitaAnual.toFixed(2).replace('.', ',')}"\n`;
    csvContent += `Data do Relatório,"${new Date().toLocaleDateString('pt-BR')}"\n`;

    // Log da exportação
    await pool.query(
      `INSERT INTO tenant_logs (tenant_id, usuario_tipo, usuario_id, acao, detalhes)
       VALUES (NULL, 'superadmin', $1, 'export_financeiro', $2)`,
      [
        session.user.id,
        JSON.stringify({
          total_registros: provedores.length,
          receita_mensal_total: totalReceitaMensal,
          receita_anual_estimada: totalReceitaAnual,
          filtros: { search, status_pagamento, plano },
          timestamp: new Date().toISOString()
        })
      ]
    );

    // Retornar CSV
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="relatorio-financeiro-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });

  } catch (error) {
    console.error('Erro ao exportar relatório financeiro:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
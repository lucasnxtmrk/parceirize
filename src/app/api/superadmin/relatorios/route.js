import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { options } from '../../auth/[...nextauth]/options';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(request) {
  try {
    const session = await getServerSession(options);
    
    if (!session || session.user.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas superadmins podem acessar.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo');
    const dataInicio = searchParams.get('dataInicio');
    const dataFim = searchParams.get('dataFim');
    const provedor = searchParams.get('provedor');

    let query = '';
    let params = [];

    switch (tipo) {
      case 'provedores':
        query = `
          SELECT 
            p.id,
            p.nome_empresa,
            p.email,
            p.subdominio,
            p.ativo,
            p.data_vencimento,
            p.created_at as data_cadastro,
            pl.nome as plano,
            pl.preco as valor_plano,
            COUNT(DISTINCT c.id) as total_clientes,
            COUNT(DISTINCT pa.id) as total_parceiros
          FROM provedores p
          LEFT JOIN planos pl ON p.plano_id = pl.id
          LEFT JOIN clientes c ON p.tenant_id = c.tenant_id
          LEFT JOIN parceiros pa ON p.tenant_id = pa.tenant_id
          WHERE p.created_at BETWEEN $1 AND $2
          ${provedor ? 'AND (p.id = $3 OR p.nome_empresa ILIKE $4)' : ''}
          GROUP BY p.id, p.nome_empresa, p.email, p.subdominio, p.ativo, p.data_vencimento, p.created_at, pl.nome, pl.preco
          ORDER BY p.created_at DESC
        `;
        params = [dataInicio, dataFim];
        if (provedor) {
          params.push(provedor, `%${provedor}%`);
        }
        break;

      case 'clientes':
        query = `
          SELECT 
            c.nome,
            c.sobrenome,
            c.email,
            c.id_carteirinha,
            c.ativo,
            c.data_criacao as data_cadastro,
            c.vouchers_disponiveis,
            p.nome_empresa as provedor,
            pl.nome as plano_provedor
          FROM clientes c
          LEFT JOIN provedores p ON c.tenant_id = p.tenant_id
          LEFT JOIN planos pl ON p.plano_id = pl.id
          WHERE c.data_criacao BETWEEN $1 AND $2
          ${provedor ? 'AND (p.id = $3 OR p.nome_empresa ILIKE $4)' : ''}
          ORDER BY c.data_criacao DESC
        `;
        params = [dataInicio, dataFim];
        if (provedor) {
          params.push(provedor, `%${provedor}%`);
        }
        break;

      case 'vouchers':
        query = `
          SELECT 
            v.codigo,
            v.descricao,
            v.desconto_valor,
            v.desconto_percentual,
            v.utilizado,
            v.data_criacao,
            v.data_expiracao,
            v.data_utilizacao,
            pa.nome as parceiro,
            p.nome_empresa as provedor,
            CASE WHEN c.nome IS NOT NULL 
                 THEN CONCAT(c.nome, ' ', c.sobrenome) 
                 ELSE 'Não utilizado' 
            END as cliente_utilizou
          FROM vouchers v
          LEFT JOIN parceiros pa ON v.parceiro_id = pa.id
          LEFT JOIN provedores p ON pa.tenant_id = p.tenant_id
          LEFT JOIN clientes c ON v.cliente_id = c.id
          WHERE v.data_criacao BETWEEN $1 AND $2
          ${provedor ? 'AND (p.id = $3 OR p.nome_empresa ILIKE $4)' : ''}
          ORDER BY v.data_criacao DESC
        `;
        params = [dataInicio, dataFim];
        if (provedor) {
          params.push(provedor, `%${provedor}%`);
        }
        break;

      case 'financeiro':
        query = `
          SELECT 
            p.nome_empresa as provedor,
            pl.nome as plano,
            pl.preco as valor_mensal,
            p.ativo as provedor_ativo,
            p.data_vencimento,
            CASE 
              WHEN p.ativo = true AND (p.data_vencimento IS NULL OR p.data_vencimento > CURRENT_DATE)
              THEN pl.preco 
              ELSE 0 
            END as receita_ativa,
            COUNT(DISTINCT c.id) as clientes_ativos
          FROM provedores p
          LEFT JOIN planos pl ON p.plano_id = pl.id
          LEFT JOIN clientes c ON p.tenant_id = c.tenant_id AND c.ativo = true
          WHERE p.created_at <= $2
          ${provedor ? 'AND (p.id = $3 OR p.nome_empresa ILIKE $4)' : ''}
          GROUP BY p.id, p.nome_empresa, pl.nome, pl.preco, p.ativo, p.data_vencimento
          ORDER BY receita_ativa DESC
        `;
        params = [dataInicio, dataFim];
        if (provedor) {
          params.push(provedor, `%${provedor}%`);
        }
        break;

      case 'uso':
        query = `
          SELECT 
            p.nome_empresa as provedor,
            pl.nome as plano,
            pl.limite_clientes,
            pl.limite_parceiros,
            pl.limite_vouchers,
            COUNT(DISTINCT c.id) as clientes_cadastrados,
            COUNT(DISTINCT pa.id) as parceiros_cadastrados,
            COUNT(DISTINCT v.id) as vouchers_criados,
            COUNT(DISTINCT v.id) FILTER (WHERE v.utilizado = true) as vouchers_utilizados,
            ROUND(
              (COUNT(DISTINCT c.id)::FLOAT / NULLIF(pl.limite_clientes, 0)) * 100, 2
            ) as uso_clientes_pct,
            ROUND(
              (COUNT(DISTINCT pa.id)::FLOAT / NULLIF(pl.limite_parceiros, 0)) * 100, 2
            ) as uso_parceiros_pct
          FROM provedores p
          LEFT JOIN planos pl ON p.plano_id = pl.id
          LEFT JOIN clientes c ON p.tenant_id = c.tenant_id
          LEFT JOIN parceiros pa ON p.tenant_id = pa.tenant_id
          LEFT JOIN vouchers v ON pa.id = v.parceiro_id
          WHERE p.created_at <= $2
          ${provedor ? 'AND (p.id = $3 OR p.nome_empresa ILIKE $4)' : ''}
          GROUP BY p.id, p.nome_empresa, pl.nome, pl.limite_clientes, pl.limite_parceiros, pl.limite_vouchers
          ORDER BY uso_clientes_pct DESC
        `;
        params = [dataInicio, dataFim];
        if (provedor) {
          params.push(provedor, `%${provedor}%`);
        }
        break;

      default:
        return NextResponse.json(
          { error: 'Tipo de relatório não especificado ou inválido' },
          { status: 400 }
        );
    }

    const result = await pool.query(query, params);

    return NextResponse.json(result.rows);

  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
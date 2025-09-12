import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { options } from '../../auth/[...nextauth]/options';
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
    const period = searchParams.get('period') || '30d';

    // Determinar período
    let dateCondition = '';
    switch (period) {
      case '7d':
        dateCondition = "AND created_at >= NOW() - INTERVAL '7 days'";
        break;
      case '30d':
        dateCondition = "AND created_at >= NOW() - INTERVAL '30 days'";
        break;
      case '90d':
        dateCondition = "AND created_at >= NOW() - INTERVAL '90 days'";
        break;
      case '1y':
        dateCondition = "AND created_at >= NOW() - INTERVAL '1 year'";
        break;
      default:
        dateCondition = "AND created_at >= NOW() - INTERVAL '30 days'";
    }

    // 1. Crescimento de Provedores (últimos 12 períodos)
    const crescimentoQuery = `
      SELECT 
        TO_CHAR(date_trunc('month', p.created_at), 'MM/YY') as periodo,
        COUNT(p.id) as provedores,
        (
          SELECT COUNT(*) 
          FROM clientes c 
          WHERE c.ativo = true 
          AND date_trunc('month', c.created_at) = date_trunc('month', p.created_at)
        ) as clientes
      FROM provedores p
      WHERE p.created_at >= NOW() - INTERVAL '12 months'
      GROUP BY date_trunc('month', p.created_at)
      ORDER BY date_trunc('month', p.created_at)
    `;

    // 2. Distribuição de Planos
    const distribuicaoQuery = `
      SELECT 
        COALESCE(pl.nome, 'Sem plano') as plano,
        COUNT(p.id) as quantidade
      FROM provedores p
      LEFT JOIN planos pl ON p.plano_id = pl.id
      GROUP BY pl.nome, pl.id
      ORDER BY quantidade DESC
    `;

    // 3. Atividade Mensal de Vouchers (últimos 6 meses)
    const atividadeQuery = `
      SELECT 
        TO_CHAR(date_trunc('month', COALESCE(v.created_at, NOW())), 'Mon/YY') as mes,
        COUNT(v.id) as vouchers_criados,
        COUNT(CASE WHEN v.utilizado = true THEN 1 END) as vouchers_utilizados
      FROM vouchers v
      WHERE v.created_at >= NOW() - INTERVAL '6 months'
      GROUP BY date_trunc('month', v.created_at)
      ORDER BY date_trunc('month', v.created_at)
    `;

    // 4. Top Provedores por Receita
    const topProvedoresQuery = `
      SELECT 
        p.nome_empresa as nome,
        COALESCE(pl.preco * 12, 0) as receita
      FROM provedores p
      LEFT JOIN planos pl ON p.plano_id = pl.id
      WHERE p.ativo = true
      ORDER BY receita DESC
      LIMIT 10
    `;

    // Executar todas as queries
    const [crescimentoRes, distribuicaoRes, atividadeRes, topProvedoresRes] = await Promise.all([
      pool.query(crescimentoQuery),
      pool.query(distribuicaoQuery),
      pool.query(atividadeQuery),
      pool.query(topProvedoresQuery)
    ]);

    // Preparar dados com valores padrão se estiver vazio
    const defaultData = {
      crescimento: crescimentoRes.rows.length > 0 ? crescimentoRes.rows : [
        { periodo: 'Jan/25', provedores: 0, clientes: 0 },
        { periodo: 'Fev/25', provedores: 0, clientes: 0 },
        { periodo: 'Mar/25', provedores: 0, clientes: 0 }
      ],
      distribuicaoPlanos: distribuicaoRes.rows.length > 0 ? distribuicaoRes.rows : [
        { plano: 'Básico', quantidade: 0 },
        { plano: 'Profissional', quantidade: 0 },
        { plano: 'Enterprise', quantidade: 0 }
      ],
      atividadeMensal: atividadeRes.rows.length > 0 ? atividadeRes.rows : [
        { mes: 'Set/24', vouchers_criados: 0, vouchers_utilizados: 0 },
        { mes: 'Out/24', vouchers_criados: 0, vouchers_utilizados: 0 },
        { mes: 'Nov/24', vouchers_criados: 0, vouchers_utilizados: 0 },
        { mes: 'Dez/24', vouchers_criados: 0, vouchers_utilizados: 0 },
        { mes: 'Jan/25', vouchers_criados: 0, vouchers_utilizados: 0 },
        { mes: 'Fev/25', vouchers_criados: 0, vouchers_utilizados: 0 }
      ],
      topProvedores: topProvedoresRes.rows.length > 0 ? topProvedoresRes.rows : [
        { nome: 'Aguardando dados', receita: 0 }
      ]
    };

    // Converter campos numéricos
    defaultData.crescimento = defaultData.crescimento.map(item => ({
      ...item,
      provedores: parseInt(item.provedores) || 0,
      clientes: parseInt(item.clientes) || 0
    }));

    defaultData.distribuicaoPlanos = defaultData.distribuicaoPlanos.map(item => ({
      ...item,
      quantidade: parseInt(item.quantidade) || 0
    }));

    defaultData.atividadeMensal = defaultData.atividadeMensal.map(item => ({
      ...item,
      vouchers_criados: parseInt(item.vouchers_criados) || 0,
      vouchers_utilizados: parseInt(item.vouchers_utilizados) || 0
    }));

    defaultData.topProvedores = defaultData.topProvedores.map(item => ({
      ...item,
      receita: parseFloat(item.receita) || 0
    }));

    return NextResponse.json(defaultData);

  } catch (error) {
    console.error('Erro ao buscar dados dos gráficos:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
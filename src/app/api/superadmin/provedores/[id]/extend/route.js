import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { options } from '../../../../auth/[...nextauth]/options';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// POST - Estender vencimento do provedor
export async function POST(request, { params }) {
  try {
    // Verificar autenticação de superadmin
    const session = await getServerSession(options);

    if (!session || session.user.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas superadmins podem acessar.' },
        { status: 403 }
      );
    }

    const { id } = params;
    const { meses } = await request.json();

    // Validação
    if (!meses || meses < 1 || meses > 24) {
      return NextResponse.json(
        { error: 'Número de meses deve estar entre 1 e 24' },
        { status: 400 }
      );
    }

    // Verificar se provedor existe
    const provedorCheck = await pool.query(
      'SELECT id, nome_empresa, data_vencimento, tenant_id FROM provedores WHERE id = $1',
      [id]
    );

    if (provedorCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Provedor não encontrado' },
        { status: 404 }
      );
    }

    const provedor = provedorCheck.rows[0];

    // Calcular nova data de vencimento
    let novaDataVencimento;
    if (provedor.data_vencimento) {
      // Se já tem vencimento, estender a partir da data atual
      const dataAtual = new Date(provedor.data_vencimento);
      novaDataVencimento = new Date(dataAtual);
      novaDataVencimento.setMonth(novaDataVencimento.getMonth() + meses);
    } else {
      // Se não tem vencimento, começar a partir de hoje
      novaDataVencimento = new Date();
      novaDataVencimento.setMonth(novaDataVencimento.getMonth() + meses);
    }

    // Atualizar data de vencimento
    const updateQuery = `
      UPDATE provedores
      SET data_vencimento = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, nome_empresa, data_vencimento
    `;

    const result = await pool.query(updateQuery, [
      novaDataVencimento.toISOString().split('T')[0], // Formato YYYY-MM-DD
      id
    ]);

    const provedorAtualizado = result.rows[0];

    // Log da ação
    await pool.query(
      `INSERT INTO tenant_logs (tenant_id, usuario_tipo, usuario_id, acao, detalhes)
       VALUES ($1, 'superadmin', $2, 'vencimento_estendido', $3)`,
      [
        provedor.tenant_id,
        session.user.id,
        JSON.stringify({
          provedor_id: id,
          nome_empresa: provedor.nome_empresa,
          meses_estendidos: meses,
          data_vencimento_anterior: provedor.data_vencimento,
          nova_data_vencimento: provedorAtualizado.data_vencimento
        })
      ]
    );

    return NextResponse.json({
      message: `Vencimento estendido por ${meses} meses com sucesso`,
      provedor: {
        id: provedorAtualizado.id,
        nome_empresa: provedorAtualizado.nome_empresa,
        data_vencimento: provedorAtualizado.data_vencimento
      }
    });

  } catch (error) {
    console.error('Erro ao estender vencimento:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
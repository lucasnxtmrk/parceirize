import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { options } from '../../../../auth/[...nextauth]/options';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// POST - Registrar pagamento do provedor
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
    const {
      valor,
      data_pagamento,
      metodo,
      observacoes,
      meses_pagos = 1
    } = await request.json();

    // Validação
    if (!valor || valor <= 0) {
      return NextResponse.json(
        { error: 'Valor do pagamento é obrigatório e deve ser maior que zero' },
        { status: 400 }
      );
    }

    if (!data_pagamento) {
      return NextResponse.json(
        { error: 'Data do pagamento é obrigatória' },
        { status: 400 }
      );
    }

    if (meses_pagos < 1 || meses_pagos > 12) {
      return NextResponse.json(
        { error: 'Número de meses deve estar entre 1 e 12' },
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

    // Iniciar transação
    await pool.query('BEGIN');

    try {
      // 1. Primeiro, criar a tabela de pagamentos se não existir
      await pool.query(`
        CREATE TABLE IF NOT EXISTS provedor_pagamentos (
          id SERIAL PRIMARY KEY,
          provedor_id INT REFERENCES provedores(id) ON DELETE CASCADE,
          valor DECIMAL(10,2) NOT NULL,
          data_pagamento DATE NOT NULL,
          metodo VARCHAR(50) NOT NULL,
          observacoes TEXT,
          meses_pagos INT DEFAULT 1,
          registrado_por INT NOT NULL,
          registrado_em TIMESTAMP DEFAULT NOW()
        )
      `);

      // 2. Registrar o pagamento
      const insertPaymentQuery = `
        INSERT INTO provedor_pagamentos
        (provedor_id, valor, data_pagamento, metodo, observacoes, meses_pagos, registrado_por)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;

      const paymentResult = await pool.query(insertPaymentQuery, [
        id,
        valor,
        data_pagamento,
        metodo,
        observacoes,
        meses_pagos,
        session.user.id
      ]);

      // 3. Calcular nova data de vencimento
      let novaDataVencimento;
      const dataPagamento = new Date(data_pagamento);

      if (provedor.data_vencimento) {
        // Se já tem vencimento, estender a partir da data atual de vencimento
        const dataVencimentoAtual = new Date(provedor.data_vencimento);
        // Se vencimento já passou, começar a partir da data do pagamento
        const baseDate = dataVencimentoAtual < new Date() ? dataPagamento : dataVencimentoAtual;
        novaDataVencimento = new Date(baseDate);
        novaDataVencimento.setMonth(novaDataVencimento.getMonth() + meses_pagos);
      } else {
        // Se não tem vencimento, começar a partir da data do pagamento
        novaDataVencimento = new Date(dataPagamento);
        novaDataVencimento.setMonth(novaDataVencimento.getMonth() + meses_pagos);
      }

      // 4. Atualizar data de vencimento do provedor
      const updateProvedorQuery = `
        UPDATE provedores
        SET data_vencimento = $1, ativo = true, updated_at = NOW()
        WHERE id = $2
        RETURNING id, nome_empresa, data_vencimento
      `;

      const provedorResult = await pool.query(updateProvedorQuery, [
        novaDataVencimento.toISOString().split('T')[0],
        id
      ]);

      // 5. Log da ação
      await pool.query(
        `INSERT INTO tenant_logs (tenant_id, usuario_tipo, usuario_id, acao, detalhes)
         VALUES ($1, 'superadmin', $2, 'pagamento_registrado', $3)`,
        [
          provedor.tenant_id,
          session.user.id,
          JSON.stringify({
            provedor_id: id,
            nome_empresa: provedor.nome_empresa,
            valor_pagamento: valor,
            data_pagamento,
            metodo,
            meses_pagos,
            nova_data_vencimento: novaDataVencimento.toISOString().split('T')[0],
            observacoes
          })
        ]
      );

      await pool.query('COMMIT');

      return NextResponse.json({
        message: 'Pagamento registrado com sucesso',
        pagamento: paymentResult.rows[0],
        provedor: provedorResult.rows[0]
      });

    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Erro ao registrar pagamento:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { options } from '../../../auth/[...nextauth]/options';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// GET - Buscar provedor específico
export async function GET(request, { params }) {
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

    // Query detalhada do provedor
    const query = `
      SELECT 
        p.*,
        pl.nome as plano_nome,
        pl.preco as plano_preco,
        pl.limite_clientes,
        pl.limite_parceiros,
        pl.limite_vouchers,
        pl.tem_subdominio,
        pl.tem_api,
        
        -- Estatísticas detalhadas
        COUNT(DISTINCT c.id) as total_clientes,
        COUNT(DISTINCT pa.id) as total_parceiros,
        COUNT(DISTINCT pr.id) as total_produtos,
        COUNT(DISTINCT pe.id) as total_pedidos,
        COUNT(DISTINCT pe.id) FILTER (WHERE pe.created_at >= CURRENT_DATE - INTERVAL '30 days') as pedidos_mes,
        
        -- Última atividade
        MAX(pe.created_at) as ultima_venda
        
      FROM provedores p
      LEFT JOIN planos pl ON p.plano_id = pl.id
      LEFT JOIN clientes c ON p.tenant_id = c.tenant_id
      LEFT JOIN parceiros pa ON p.tenant_id = pa.tenant_id
      LEFT JOIN produtos pr ON p.tenant_id = pr.tenant_id
      LEFT JOIN pedidos pe ON p.tenant_id = pe.tenant_id
      WHERE p.id = $1
      GROUP BY p.id, pl.nome, pl.preco, pl.limite_clientes, pl.limite_parceiros, 
               pl.limite_vouchers, pl.tem_subdominio, pl.tem_api
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Provedor não encontrado' },
        { status: 404 }
      );
    }

    const provedor = result.rows[0];

    return NextResponse.json({
      id: provedor.id,
      tenant_id: provedor.tenant_id,
      nome_empresa: provedor.nome_empresa,
      email: provedor.email,
      subdominio: provedor.subdominio,
      ativo: provedor.ativo,
      data_vencimento: provedor.data_vencimento,
      created_at: provedor.created_at,
      plano: {
        nome: provedor.plano_nome,
        preco: parseFloat(provedor.plano_preco),
        limite_clientes: provedor.limite_clientes,
        limite_parceiros: provedor.limite_parceiros,
        limite_vouchers: provedor.limite_vouchers,
        tem_subdominio: provedor.tem_subdominio,
        tem_api: provedor.tem_api
      },
      estatisticas: {
        total_clientes: parseInt(provedor.total_clientes) || 0,
        total_parceiros: parseInt(provedor.total_parceiros) || 0,
        total_produtos: parseInt(provedor.total_produtos) || 0,
        total_pedidos: parseInt(provedor.total_pedidos) || 0,
        pedidos_mes: parseInt(provedor.pedidos_mes) || 0,
        ultima_venda: provedor.ultima_venda
      }
    });

  } catch (error) {
    console.error('Erro ao buscar provedor:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// PATCH - Atualizar provedor (status, plano, etc.)
export async function PATCH(request, { params }) {
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
    const data = await request.json();

    // Campos permitidos para atualização
    const allowedFields = ['ativo', 'plano_id', 'data_vencimento', 'subdominio'];
    const updates = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(data)) {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum campo válido para atualização' },
        { status: 400 }
      );
    }

    // Adicionar updated_at
    updates.push(`updated_at = NOW()`);
    values.push(id); // ID para WHERE clause

    const updateQuery = `
      UPDATE provedores 
      SET ${updates.join(', ')} 
      WHERE id = $${paramCount}
      RETURNING id, nome_empresa, ativo, plano_id, data_vencimento, subdominio
    `;

    const result = await pool.query(updateQuery, values);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Provedor não encontrado' },
        { status: 404 }
      );
    }

    const provedorAtualizado = result.rows[0];

    // Log da ação
    await pool.query(
      `INSERT INTO tenant_logs (tenant_id, usuario_tipo, usuario_id, acao, detalhes) 
       VALUES ((SELECT tenant_id FROM provedores WHERE id = $1), 'superadmin', $2, 'provedor_atualizado', $3)`,
      [
        id,
        session.user.id,
        JSON.stringify({ 
          provedor_id: id,
          alteracoes: data
        })
      ]
    );

    return NextResponse.json({
      message: 'Provedor atualizado com sucesso',
      provedor: provedorAtualizado
    });

  } catch (error) {
    console.error('Erro ao atualizar provedor:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Excluir provedor (cuidado!)
export async function DELETE(request, { params }) {
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

    // Verificar se provedor existe e buscar tenant_id
    const provedorCheck = await pool.query(
      'SELECT tenant_id, nome_empresa FROM provedores WHERE id = $1',
      [id]
    );

    if (provedorCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Provedor não encontrado' },
        { status: 404 }
      );
    }

    const { tenant_id, nome_empresa } = provedorCheck.rows[0];

    // AVISO: Isso excluirá TODOS os dados do tenant devido às foreign keys CASCADE
    // Em produção, considere apenas desativar em vez de excluir
    
    // Iniciar transação para exclusão segura
    await pool.query('BEGIN');

    try {
      // Excluir provedor (CASCADE excluirá todos os dados relacionados)
      await pool.query('DELETE FROM provedores WHERE id = $1', [id]);

      // Log da ação crítica
      await pool.query(
        `INSERT INTO tenant_logs (tenant_id, usuario_tipo, usuario_id, acao, detalhes) 
         VALUES ($1, 'superadmin', $2, 'provedor_excluido', $3)`,
        [
          tenant_id,
          session.user.id,
          JSON.stringify({ 
            provedor_id: id,
            nome_empresa: nome_empresa,
            timestamp: new Date().toISOString()
          })
        ]
      );

      await pool.query('COMMIT');

      return NextResponse.json({
        message: `Provedor ${nome_empresa} e todos os dados relacionados foram excluídos permanentemente.`
      });

    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Erro ao excluir provedor:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
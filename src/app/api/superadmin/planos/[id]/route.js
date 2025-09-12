import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { options } from '../../../auth/[...nextauth]/options';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// GET - Buscar plano específico
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(options);
    
    if (!session || session.user.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas superadmins podem acessar.' },
        { status: 403 }
      );
    }

    const { id } = params;

    const query = `
      SELECT 
        p.*,
        COUNT(pr.id) as provedores_usando
      FROM planos p
      LEFT JOIN provedores pr ON p.id = pr.plano_id
      WHERE p.id = $1
      GROUP BY p.id
    `;

    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Plano não encontrado' },
        { status: 404 }
      );
    }

    const plano = result.rows[0];
    plano.recursos = JSON.parse(plano.recursos || '[]');
    plano.provedores_usando = parseInt(plano.provedores_usando) || 0;

    return NextResponse.json(plano);

  } catch (error) {
    console.error('Erro ao buscar plano:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// PUT - Atualizar plano
export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(options);
    
    if (!session || session.user.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas superadmins podem acessar.' },
        { status: 403 }
      );
    }

    const { id } = params;
    const data = await request.json();
    const {
      nome,
      descricao,
      preco,
      limite_clientes,
      limite_parceiros,
      limite_vouchers,
      recursos,
      ativo
    } = data;

    // Validações básicas
    if (!nome || !preco) {
      return NextResponse.json(
        { error: 'Nome e preço são obrigatórios' },
        { status: 400 }
      );
    }

    const query = `
      UPDATE planos 
      SET 
        nome = $1,
        descricao = $2,
        preco = $3,
        limite_clientes = $4,
        limite_parceiros = $5,
        limite_vouchers = $6,
        recursos = $7,
        ativo = $8,
        updated_at = NOW()
      WHERE id = $9
      RETURNING *
    `;

    const values = [
      nome,
      descricao || null,
      parseFloat(preco),
      limite_clientes ? parseInt(limite_clientes) : null,
      limite_parceiros ? parseInt(limite_parceiros) : null,
      limite_vouchers ? parseInt(limite_vouchers) : null,
      JSON.stringify(recursos || []),
      ativo,
      id
    ];

    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Plano não encontrado' },
        { status: 404 }
      );
    }

    const plano = result.rows[0];
    plano.recursos = JSON.parse(plano.recursos || '[]');

    return NextResponse.json(plano);

  } catch (error) {
    console.error('Erro ao atualizar plano:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Excluir plano
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(options);
    
    if (!session || session.user.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas superadmins podem acessar.' },
        { status: 403 }
      );
    }

    const { id } = params;

    // Verificar se há provedores usando este plano
    const checkQuery = 'SELECT COUNT(*) as count FROM provedores WHERE plano_id = $1';
    const checkResult = await pool.query(checkQuery, [id]);
    
    if (parseInt(checkResult.rows[0].count) > 0) {
      return NextResponse.json(
        { error: 'Não é possível excluir um plano que está sendo usado por provedores' },
        { status: 400 }
      );
    }

    const deleteQuery = 'DELETE FROM planos WHERE id = $1 RETURNING *';
    const result = await pool.query(deleteQuery, [id]);
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Plano não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Plano excluído com sucesso' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Erro ao excluir plano:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
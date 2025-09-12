import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { options } from '../../auth/[...nextauth]/options';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// GET - Listar todos os planos
export async function GET() {
  try {
    const session = await getServerSession(options);
    
    if (!session || session.user.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas superadmins podem acessar.' },
        { status: 403 }
      );
    }

    const query = `
      SELECT 
        p.*,
        COUNT(pr.id) as provedores_usando
      FROM planos p
      LEFT JOIN provedores pr ON p.id = pr.plano_id
      GROUP BY p.id
      ORDER BY p.preco ASC
    `;

    const result = await pool.query(query);
    
    // Converter recursos de JSON para array se necessário
    const planos = result.rows.map(plano => ({
      ...plano,
      provedores_usando: parseInt(plano.provedores_usando) || 0,
      recursos: typeof plano.recursos === 'string' ? 
        JSON.parse(plano.recursos || '[]') : 
        (plano.recursos || [])
    }));

    return NextResponse.json(planos);

  } catch (error) {
    console.error('Erro ao buscar planos:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// POST - Criar novo plano
export async function POST(request) {
  try {
    const session = await getServerSession(options);
    
    if (!session || session.user.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas superadmins podem acessar.' },
        { status: 403 }
      );
    }

    const data = await request.json();
    const {
      nome,
      descricao,
      preco,
      limite_clientes,
      limite_parceiros,
      limite_vouchers,
      recursos,
      ativo = true
    } = data;

    // Validações básicas
    if (!nome || !preco) {
      return NextResponse.json(
        { error: 'Nome e preço são obrigatórios' },
        { status: 400 }
      );
    }

    const query = `
      INSERT INTO planos (
        nome, descricao, preco, limite_clientes, limite_parceiros, 
        limite_vouchers, recursos, ativo, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
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
      ativo
    ];

    const result = await pool.query(query, values);
    const plano = result.rows[0];

    // Formatar recursos para retorno
    plano.recursos = JSON.parse(plano.recursos || '[]');

    return NextResponse.json(plano, { status: 201 });

  } catch (error) {
    console.error('Erro ao criar plano:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
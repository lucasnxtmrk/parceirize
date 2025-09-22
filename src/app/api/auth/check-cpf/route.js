import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function POST(request) {
  try {
    const { cpf } = await request.json();

    if (!cpf) {
      return NextResponse.json(
        { exists: false, error: 'CPF é obrigatório' },
        { status: 400 }
      );
    }

    // Remove máscara do CPF
    const cpfLimpo = cpf.replace(/\D/g, '');

    // Validação básica do CPF
    if (cpfLimpo.length !== 11) {
      return NextResponse.json(
        { exists: false, error: 'CPF deve ter 11 dígitos' },
        { status: 400 }
      );
    }

    // Busca cliente pelo CPF (tenta ambos os formatos)
    const query = `
      SELECT
        id,
        nome,
        sobrenome,
        email,
        ativo,
        cpf_cnpj
      FROM clientes
      WHERE (
        cpf_cnpj = $1 OR
        cpf_cnpj = $2 OR
        REPLACE(REPLACE(REPLACE(cpf_cnpj, '.', ''), '-', ''), ' ', '') = $1
      ) AND ativo = true
    `;

    // Formatos: sem máscara e com máscara
    const cpfComMascara = cpfLimpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    const result = await pool.query(query, [cpfLimpo, cpfComMascara]);

    if (result.rows.length === 0) {
      return NextResponse.json({
        exists: false,
        message: 'CPF não encontrado ou conta inativa'
      });
    }

    const cliente = result.rows[0];

    return NextResponse.json({
      exists: true,
      cliente: {
        id: cliente.id,
        nome: cliente.nome,
        sobrenome: cliente.sobrenome,
        email: cliente.email,
        cpf_cnpj: cliente.cpf_cnpj
      }
    });

  } catch (error) {
    console.error('Erro ao verificar CPF:', error);
    return NextResponse.json(
      { exists: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
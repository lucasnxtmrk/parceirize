import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function POST(request) {
  try {
    const { documento } = await request.json();

    if (!documento) {
      return NextResponse.json(
        { exists: false, error: 'CPF ou CNPJ é obrigatório' },
        { status: 400 }
      );
    }

    // Remove máscara do documento
    const documentoLimpo = documento.replace(/\D/g, '');

    // Detectar tipo de documento
    let tipoDocumento;
    let documentoFormatado;

    if (documentoLimpo.length === 11) {
      // CPF
      tipoDocumento = 'CPF';
      documentoFormatado = documentoLimpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else if (documentoLimpo.length === 14) {
      // CNPJ
      tipoDocumento = 'CNPJ';
      documentoFormatado = documentoLimpo.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    } else {
      return NextResponse.json(
        { exists: false, error: 'Documento deve ter 11 dígitos (CPF) ou 14 dígitos (CNPJ)' },
        { status: 400 }
      );
    }

    // Busca cliente pelo documento (tenta múltiplos formatos)
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
        REPLACE(REPLACE(REPLACE(REPLACE(cpf_cnpj, '.', ''), '-', ''), '/', ''), ' ', '') = $1
      ) AND ativo = true
    `;

    // Tenta com documento limpo e formatado
    const result = await pool.query(query, [documentoLimpo, documentoFormatado]);

    if (result.rows.length === 0) {
      return NextResponse.json({
        exists: false,
        message: `${tipoDocumento} não encontrado ou conta inativa`
      });
    }

    const cliente = result.rows[0];

    return NextResponse.json({
      exists: true,
      tipoDocumento,
      cliente: {
        id: cliente.id,
        nome: cliente.nome,
        sobrenome: cliente.sobrenome,
        email: cliente.email,
        cpf_cnpj: cliente.cpf_cnpj
      }
    });

  } catch (error) {
    console.error('Erro ao verificar documento:', error);
    return NextResponse.json(
      { exists: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
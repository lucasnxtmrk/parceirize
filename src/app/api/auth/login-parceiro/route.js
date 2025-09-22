import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'E-mail e senha são obrigatórios' },
        { status: 400 }
      );
    }

    // CONSULTA ESPECÍFICA: Apenas parceiros
    const query = `
      SELECT id,
             nome_empresa AS nome,
             NULL AS sobrenome,
             email,
             NULL AS cpf_cnpj,
             NULL AS id_carteirinha,
             NULL AS data_ultimo_voucher,
             true AS ativo,
             tenant_id,
             senha AS "password",
             'parceiro' AS role
      FROM parceiros
      WHERE email = $1
    `;

    const result = await pool.query(query, [email]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'E-mail não encontrado ou não é uma conta de parceiro' },
        { status: 401 }
      );
    }

    const userRecord = result.rows[0];

    // Verificar senha
    const senhaCorreta = await bcrypt.compare(password, userRecord.password);
    if (!senhaCorreta) {
      return NextResponse.json(
        { success: false, message: 'Senha incorreta' },
        { status: 401 }
      );
    }

    // Retornar dados do usuário (sem senha)
    const { password: _, ...userData } = userRecord;

    return NextResponse.json({
      success: true,
      user: userData,
      message: 'Autenticação de parceiro realizada com sucesso'
    });

  } catch (error) {
    console.error('Erro na autenticação de parceiro:', error);
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
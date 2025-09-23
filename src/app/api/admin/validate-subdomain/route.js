import { Pool } from 'pg';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);

    // Verificar se é superadmin
    if (!session || session.user.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas superadmin pode validar subdomínios.' },
        { status: 403 }
      );
    }

    const { subdominio } = await request.json();

    if (!subdominio || typeof subdominio !== 'string') {
      return NextResponse.json(
        { error: 'Subdomínio é obrigatório' },
        { status: 400 }
      );
    }

    // Usar função do banco para validar
    const result = await pool.query(
      'SELECT validar_subdominio($1) as valido',
      [subdominio.trim().toLowerCase()]
    );

    const isValid = result.rows[0].valido;

    if (!isValid) {
      // Verificar razões específicas
      let reason = 'Subdomínio inválido';

      // Verificar se já existe
      const existingCheck = await pool.query(
        'SELECT id FROM provedores WHERE LOWER(subdominio) = $1',
        [subdominio.trim().toLowerCase()]
      );

      if (existingCheck.rows.length > 0) {
        reason = 'Subdomínio já está em uso';
      } else if (['admin', 'api', 'www', 'app'].includes(subdominio.toLowerCase())) {
        reason = 'Subdomínio reservado pelo sistema';
      } else if (!/^[a-z0-9][a-z0-9-]{0,48}[a-z0-9]$/.test(subdominio) && subdominio.length > 1) {
        reason = 'Formato inválido. Use apenas letras, números e hífen (não pode começar/terminar com hífen)';
      } else if (subdominio.length === 1 && !/^[a-z0-9]$/.test(subdominio)) {
        reason = 'Subdomínio de 1 caractere deve ser letra ou número';
      }

      return NextResponse.json(
        {
          valid: false,
          error: reason,
          subdominio: subdominio.trim().toLowerCase()
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      subdominio: subdominio.trim().toLowerCase(),
      domain_preview: `${subdominio.trim().toLowerCase()}.parceirize.com`,
      message: 'Subdomínio disponível!'
    });

  } catch (error) {
    console.error('Erro ao validar subdomínio:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
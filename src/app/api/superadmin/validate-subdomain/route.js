import { Pool } from 'pg';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { options } from '../../auth/[...nextauth]/options';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function POST(request) {
  try {
    const session = await getServerSession(options);

    console.log('🔍 Validate Subdomain - Session:', {
      exists: !!session,
      user: session?.user,
      role: session?.user?.role
    });

    // Verificar se é superadmin
    if (!session || session.user.role !== 'superadmin') {
      console.log('❌ Validate Subdomain - Acesso negado:', {
        sessionExists: !!session,
        userRole: session?.user?.role,
        expected: 'superadmin'
      });
      return NextResponse.json(
        { error: 'Acesso negado. Apenas superadmin pode validar subdomínios.' },
        { status: 403 }
      );
    }

    const { subdominio, provedor_id } = await request.json();

    if (!subdominio || typeof subdominio !== 'string') {
      return NextResponse.json(
        { error: 'Subdomínio é obrigatório' },
        { status: 400 }
      );
    }

    const subdomainClean = subdominio.trim().toLowerCase();

    // Validações básicas
    if (subdomainClean === '') {
      return NextResponse.json({
        valid: true,
        subdominio: '',
        message: 'Subdomínio vazio é permitido'
      });
    }

    // Verificar se já existe (excluindo o provedor atual se for edição)
    let existingQuery = 'SELECT id FROM provedores WHERE LOWER(subdominio) = $1';
    let existingParams = [subdomainClean];

    if (provedor_id) {
      existingQuery += ' AND id != $2';
      existingParams.push(provedor_id);
    }

    const existingCheck = await pool.query(existingQuery, existingParams);

    if (existingCheck.rows.length > 0) {
      return NextResponse.json(
        {
          valid: false,
          error: 'Subdomínio já está em uso',
          subdominio: subdomainClean
        },
        { status: 400 }
      );
    }

    // Verificar subdomínios reservados
    const reserved = ['admin', 'api', 'www', 'app', 'mail', 'ftp', 'blog', 'docs'];
    if (reserved.includes(subdomainClean)) {
      return NextResponse.json(
        {
          valid: false,
          error: 'Subdomínio reservado pelo sistema',
          subdominio: subdomainClean
        },
        { status: 400 }
      );
    }

    // Validar formato
    if (subdomainClean.length === 1) {
      if (!/^[a-z0-9]$/.test(subdomainClean)) {
        return NextResponse.json(
          {
            valid: false,
            error: 'Subdomínio de 1 caractere deve ser letra ou número',
            subdominio: subdomainClean
          },
          { status: 400 }
        );
      }
    } else {
      if (!/^[a-z0-9][a-z0-9-]{0,48}[a-z0-9]$/.test(subdomainClean)) {
        return NextResponse.json(
          {
            valid: false,
            error: 'Formato inválido. Use apenas letras, números e hífen (não pode começar/terminar com hífen)',
            subdominio: subdomainClean
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({
      valid: true,
      subdominio: subdomainClean,
      domain_preview: `${subdomainClean}.parceirize.com.br`,
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
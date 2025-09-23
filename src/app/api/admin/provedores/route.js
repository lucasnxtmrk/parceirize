import { Pool } from 'pg';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import bcrypt from 'bcryptjs';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      );
    }

    const result = await pool.query(`
      SELECT
        p.id,
        p.tenant_id,
        p.nome_empresa,
        p.email,
        p.subdominio,
        p.ativo,
        p.created_at,
        COUNT(DISTINCT c.id) as total_clientes,
        COUNT(DISTINCT pa.id) as total_parceiros,
        array_agg(DISTINCT dp.dominio) FILTER (WHERE dp.ativo = true) as dominios
      FROM provedores p
      LEFT JOIN clientes c ON c.provedor_id = p.id AND c.ativo = true
      LEFT JOIN parceiros pa ON pa.provedor_id = p.id AND pa.ativo = true
      LEFT JOIN dominios_personalizados dp ON dp.provedor_id = p.id AND dp.ativo = true
      GROUP BY p.id, p.tenant_id, p.nome_empresa, p.email, p.subdominio, p.ativo, p.created_at
      ORDER BY p.created_at DESC
    `);

    return NextResponse.json(result.rows);

  } catch (error) {
    console.error('Erro ao buscar provedores:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas superadmin pode criar provedores.' },
        { status: 403 }
      );
    }

    const {
      nome_empresa,
      email,
      senha,
      subdominio,
      telefone = null,
      endereco = null,
      cnpj = null
    } = await request.json();

    // Validações básicas
    if (!nome_empresa || !email || !senha) {
      return NextResponse.json(
        { error: 'Nome da empresa, email e senha são obrigatórios' },
        { status: 400 }
      );
    }

    // Validar subdomínio
    if (subdominio) {
      const subdomainValid = await pool.query(
        'SELECT validar_subdominio($1) as valido',
        [subdominio.trim().toLowerCase()]
      );

      if (!subdomainValid.rows[0].valido) {
        return NextResponse.json(
          { error: 'Subdomínio inválido ou já em uso' },
          { status: 400 }
        );
      }
    }

    // Verificar se email já existe
    const emailCheck = await pool.query(
      'SELECT id FROM provedores WHERE email = $1',
      [email]
    );

    if (emailCheck.rows.length > 0) {
      return NextResponse.json(
        { error: 'Email já está cadastrado' },
        { status: 400 }
      );
    }

    // Gerar tenant_id único
    const tenantId = `tenant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Hash da senha
    const hashedPassword = await bcrypt.hash(senha, 12);

    // Inserir provedor
    const result = await pool.query(`
      INSERT INTO provedores (
        tenant_id,
        nome_empresa,
        email,
        senha_hash,
        subdominio,
        telefone,
        endereco,
        cnpj,
        ativo,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW())
      RETURNING id, tenant_id, nome_empresa, email, subdominio, ativo, created_at
    `, [
      tenantId,
      nome_empresa.trim(),
      email.trim().toLowerCase(),
      hashedPassword,
      subdominio ? subdominio.trim().toLowerCase() : null,
      telefone,
      endereco,
      cnpj
    ]);

    const newProvedor = result.rows[0];

    // Limpar cache de domínios
    try {
      await fetch(`${process.env.NEXTAUTH_URL}/api/domains/cache`, {
        method: 'DELETE'
      });
    } catch (cacheError) {
      console.error('Erro ao limpar cache:', cacheError);
    }

    // Buscar domínios criados automaticamente pelo trigger
    let dominios = [];
    if (subdominio) {
      const dominiosResult = await pool.query(
        'SELECT dominio FROM dominios_personalizados WHERE provedor_id = $1 AND ativo = true',
        [newProvedor.id]
      );
      dominios = dominiosResult.rows.map(r => r.dominio);
    }

    console.log(`✅ Provedor criado: ${newProvedor.nome_empresa} (ID: ${newProvedor.id})`);
    if (dominios.length > 0) {
      console.log(`✅ Domínios criados: ${dominios.join(', ')}`);
    }

    return NextResponse.json({
      ...newProvedor,
      dominios,
      message: 'Provedor criado com sucesso!'
    }, { status: 201 });

  } catch (error) {
    console.error('Erro ao criar provedor:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor: ' + error.message },
      { status: 500 }
    );
  }
}
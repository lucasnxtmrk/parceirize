import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { options } from '../../auth/[...nextauth]/options';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { DomainHelper } from '@/lib/domain-helper.js';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// GET - Listar todos os provedores
export async function GET() {
  try {
    // Verificar autenticação de superadmin
    const session = await getServerSession(options);
    
    if (!session || session.user.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas superadmins podem acessar.' },
        { status: 403 }
      );
    }

    // Query para buscar provedores com estatísticas
    const query = `
      SELECT 
        p.id,
        p.tenant_id,
        p.nome_empresa,
        p.email,
        p.subdominio,
        p.ativo,
        p.data_vencimento,
        p.created_at,
        
        -- Dados do plano
        pl.nome as plano_nome,
        pl.preco as plano_preco,
        
        -- Estatísticas do tenant
        COUNT(DISTINCT c.id) as total_clientes,
        COUNT(DISTINCT pa.id) as total_parceiros,
        COUNT(DISTINCT pr.id) as total_produtos,
        COUNT(DISTINCT pe.id) as total_pedidos
        
      FROM provedores p
      LEFT JOIN planos pl ON p.plano_id = pl.id
      LEFT JOIN clientes c ON p.tenant_id = c.tenant_id AND c.ativo = true
      LEFT JOIN parceiros pa ON p.tenant_id = pa.tenant_id
      LEFT JOIN produtos pr ON p.tenant_id = pr.tenant_id AND pr.ativo = true
      LEFT JOIN pedidos pe ON p.tenant_id = pe.tenant_id
      GROUP BY p.id, p.tenant_id, p.nome_empresa, p.email, p.subdominio, 
               p.ativo, p.data_vencimento, p.created_at, pl.nome, pl.preco
      ORDER BY p.created_at DESC
    `;

    const result = await pool.query(query);
    
    // Formatar dados para o frontend
    const provedores = result.rows.map(row => ({
      id: row.id,
      tenant_id: row.tenant_id,
      nome_empresa: row.nome_empresa,
      email: row.email,
      subdominio: row.subdominio,
      ativo: row.ativo,
      data_vencimento: row.data_vencimento,
      created_at: row.created_at,
      plano_nome: row.plano_nome,
      plano_preco: parseFloat(row.plano_preco),
      total_clientes: parseInt(row.total_clientes) || 0,
      total_parceiros: parseInt(row.total_parceiros) || 0,
      total_produtos: parseInt(row.total_produtos) || 0,
      total_pedidos: parseInt(row.total_pedidos) || 0
    }));

    return NextResponse.json(provedores);

  } catch (error) {
    console.error('Erro ao buscar provedores:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// POST - Criar novo provedor
export async function POST(request) {
  try {
    // Verificar autenticação de superadmin
    const session = await getServerSession(options);
    
    if (!session || session.user.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas superadmins podem acessar.' },
        { status: 403 }
      );
    }

    const data = await request.json();
    const { nome_empresa, email, senha, plano_id, subdominio, data_vencimento } = data;

    // Validações básicas
    if (!nome_empresa || !email || !senha || !plano_id) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: nome_empresa, email, senha, plano_id' },
        { status: 400 }
      );
    }

    // Verificar se email já existe
    const emailCheck = await pool.query(
      'SELECT id FROM provedores WHERE email = $1',
      [email]
    );

    if (emailCheck.rows.length > 0) {
      return NextResponse.json(
        { error: 'Email já cadastrado para outro provedor' },
        { status: 400 }
      );
    }

    // Verificar se subdomínio já existe (se fornecido)
    if (subdominio) {
      const subdomainCheck = await pool.query(
        'SELECT id FROM provedores WHERE subdominio = $1',
        [subdominio]
      );

      if (subdomainCheck.rows.length > 0) {
        return NextResponse.json(
          { error: 'Subdomínio já está em uso' },
          { status: 400 }
        );
      }
    }

    // Hash da senha
    const senhaHash = await bcrypt.hash(senha, 12);

    // Inserir novo provedor
    const insertQuery = `
      INSERT INTO provedores 
      (nome_empresa, email, senha, plano_id, subdominio, data_vencimento, ativo)
      VALUES ($1, $2, $3, $4, $5, $6, true)
      RETURNING id, tenant_id, nome_empresa, email, subdominio, created_at
    `;

    const result = await pool.query(insertQuery, [
      nome_empresa,
      email,
      senhaHash,
      plano_id,
      subdominio || null,
      data_vencimento || null
    ]);

    const novoProvedor = result.rows[0];

    // 🆕 CRIAR SUBDOMÍNIO AUTOMATICAMENTE SE FORNECIDO
    let dominioInfo = null;
    if (subdominio) {
      try {
        const dominioCompleto = `${subdominio}.parceirize.com`;
        console.log(`🌐 Criando subdomínio automático: ${dominioCompleto}`);

        dominioInfo = await DomainHelper.registerDomain(
          novoProvedor.id,
          dominioCompleto,
          'subdominio'
        );

        console.log(`✅ Subdomínio criado com sucesso: ${dominioCompleto}`);
      } catch (domainError) {
        console.error('❌ Erro ao criar subdomínio automático:', domainError);
        // Não falhar a criação do provedor por erro de domínio
        // O provedor pode criar o domínio manualmente depois
      }
    }

    // Log da ação
    await pool.query(
      `INSERT INTO tenant_logs (tenant_id, usuario_tipo, usuario_id, acao, detalhes)
       VALUES ($1, 'superadmin', $2, 'provedor_criado', $3)`,
      [
        novoProvedor.tenant_id,
        session.user.id,
        JSON.stringify({
          provedor_id: novoProvedor.id,
          nome_empresa: novoProvedor.nome_empresa,
          subdominio_criado: dominioInfo ? true : false,
          dominio_url: dominioInfo ? dominioInfo.dominio : null
        })
      ]
    );

    return NextResponse.json({
      message: 'Provedor criado com sucesso',
      provedor: novoProvedor,
      dominio: dominioInfo ? {
        url: dominioInfo.dominio,
        status: 'criado_automaticamente',
        verificado: dominioInfo.verificado
      } : null
    }, { status: 201 });

  } catch (error) {
    console.error('Erro ao criar provedor:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
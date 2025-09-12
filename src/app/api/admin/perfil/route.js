import { Pool } from "pg";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// GET - Buscar perfil do provedor
export async function GET() {
  try {
    const session = await getServerSession(options);
    
    if (!session || !['provedor', 'superadmin'].includes(session.user.role)) {
      return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403 });
    }

    const userId = session.user.id;
    
    // Buscar dados do provedor e seu plano
    const query = `
      SELECT 
        p.nome_empresa,
        p.email,
        p.subdominio,
        pl.nome as plano_nome,
        p.ativo,
        p.data_vencimento
      FROM provedores p
      LEFT JOIN planos pl ON p.plano_id = pl.id
      WHERE p.id = $1
    `;
    
    const result = await pool.query(query, [userId]);
    
    if (result.rows.length === 0) {
      return new Response(JSON.stringify({ error: 'Provedor não encontrado' }), { status: 404 });
    }
    
    const provedor = result.rows[0];
    
    return new Response(JSON.stringify({
      nome_empresa: provedor.nome_empresa,
      email: provedor.email,
      subdominio: provedor.subdominio,
      plano: provedor.plano_nome || 'Não definido',
      ativo: provedor.ativo,
      data_vencimento: provedor.data_vencimento
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error('❌ Erro ao buscar perfil do provedor:', error);
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), { status: 500 });
  }
}

// PUT - Atualizar perfil do provedor
export async function PUT(req) {
  try {
    const session = await getServerSession(options);
    
    if (!session || !['provedor', 'superadmin'].includes(session.user.role)) {
      return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403 });
    }

    const userId = session.user.id;
    const { nome_empresa, email, subdominio } = await req.json();
    
    // Atualizar dados do provedor
    const updateQuery = `
      UPDATE provedores 
      SET 
        nome_empresa = $1,
        email = $2,
        subdominio = $3,
        updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `;
    
    const result = await pool.query(updateQuery, [
      nome_empresa,
      email, 
      subdominio,
      userId
    ]);
    
    if (result.rows.length === 0) {
      return new Response(JSON.stringify({ error: 'Provedor não encontrado' }), { status: 404 });
    }
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Perfil atualizado com sucesso'
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error('❌ Erro ao atualizar perfil do provedor:', error);
    
    // Verifica se é erro de unique constraint (email ou subdomínio já existe)
    if (error.code === '23505') {
      return new Response(JSON.stringify({ 
        error: 'Email ou subdomínio já estão em uso' 
      }), { status: 400 });
    }
    
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), { status: 500 });
  }
}
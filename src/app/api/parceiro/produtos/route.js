import { Pool } from "pg";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(req) {
  try {
    const session = await getServerSession(options);
    
    if (!session || session.user.role !== 'parceiro') {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const parceiroId = session.user.id;

    const query = `
      SELECT 
        id,
        nome,
        descricao,
        preco,
        desconto,
        ativo,
        imagem_url,
        created_at,
        updated_at
      FROM produtos
      WHERE parceiro_id = $1
      ORDER BY created_at DESC
    `;

    const result = await pool.query(query, [parceiroId]);
    
    return new Response(JSON.stringify(result.rows), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Erro ao buscar produtos:", error);
    return new Response(JSON.stringify({ error: "Erro interno ao buscar produtos" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function POST(req) {
  try {
    const session = await getServerSession(options);
    
    if (!session || session.user.role !== 'parceiro') {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const parceiroId = session.user.id;
    const { nome, descricao, preco, desconto, imagem_url } = await req.json();

    if (!nome || !preco) {
      return new Response(JSON.stringify({ error: "Nome e preço são obrigatórios" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const query = `
      INSERT INTO produtos (parceiro_id, nome, descricao, preco, desconto, imagem_url)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await pool.query(query, [parceiroId, nome, descricao, preco, desconto || 0, imagem_url]);
    
    return new Response(JSON.stringify(result.rows[0]), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Erro ao criar produto:", error);
    return new Response(JSON.stringify({ error: "Erro interno ao criar produto" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function PUT(req) {
  try {
    const session = await getServerSession(options);
    
    if (!session || session.user.role !== 'parceiro') {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const parceiroId = session.user.id;
    const { id, nome, descricao, preco, desconto, ativo, imagem_url } = await req.json();

    if (!id || !nome || !preco) {
      return new Response(JSON.stringify({ error: "ID, nome e preço são obrigatórios" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const query = `
      UPDATE produtos 
      SET nome = $1, descricao = $2, preco = $3, desconto = $4, ativo = $5, imagem_url = $6, updated_at = NOW()
      WHERE id = $7 AND parceiro_id = $8
      RETURNING *
    `;

    const result = await pool.query(query, [nome, descricao, preco, desconto || 0, ativo, imagem_url, id, parceiroId]);
    
    if (result.rows.length === 0) {
      return new Response(JSON.stringify({ error: "Produto não encontrado" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    
    return new Response(JSON.stringify(result.rows[0]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Erro ao atualizar produto:", error);
    return new Response(JSON.stringify({ error: "Erro interno ao atualizar produto" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function DELETE(req) {
  try {
    const session = await getServerSession(options);
    
    if (!session || session.user.role !== 'parceiro') {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const parceiroId = session.user.id;
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return new Response(JSON.stringify({ error: "ID do produto é obrigatório" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const query = `
      DELETE FROM produtos 
      WHERE id = $1 AND parceiro_id = $2
      RETURNING *
    `;

    const result = await pool.query(query, [id, parceiroId]);
    
    if (result.rows.length === 0) {
      return new Response(JSON.stringify({ error: "Produto não encontrado" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    
    return new Response(JSON.stringify({ message: "Produto excluído com sucesso" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Erro ao excluir produto:", error);
    return new Response(JSON.stringify({ error: "Erro interno ao excluir produto" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
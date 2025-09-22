import { Pool } from "pg";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(req) {
  try {
    const session = await getServerSession(options);

    if (!session || session.user.role !== 'cliente') {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const clienteId = session.user.id;

    const query = `
      SELECT
        id,
        nome,
        sobrenome,
        email,
        id_carteirinha,
        data_criacao,
        ativo
      FROM clientes
      WHERE id = $1
    `;

    const result = await pool.query(query, [clienteId]);

    if (result.rows.length === 0) {
      return new Response(JSON.stringify({ error: "Cliente não encontrado" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(result.rows[0]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Erro ao buscar perfil do cliente:", error);
    return new Response(JSON.stringify({ error: "Erro interno ao buscar perfil" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function PUT(req) {
  try {
    const session = await getServerSession(options);

    if (!session || session.user.role !== 'cliente') {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const clienteId = session.user.id;
    const { nome, sobrenome, email } = await req.json();

    if (!nome || !sobrenome) {
      return new Response(JSON.stringify({ error: "Nome e sobrenome são obrigatórios" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Verificar se o email já está em uso por outro cliente
    if (email && email !== session.user.email) {
      const emailCheckQuery = `
        SELECT id FROM clientes
        WHERE email = $1 AND id != $2
      `;
      const emailCheck = await pool.query(emailCheckQuery, [email, clienteId]);

      if (emailCheck.rows.length > 0) {
        return new Response(JSON.stringify({ error: "Este e-mail já está em uso" }), {
          status: 409,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    const updateQuery = `
      UPDATE clientes
      SET nome = $1, sobrenome = $2, email = $3
      WHERE id = $4
      RETURNING id, nome, sobrenome, email, id_carteirinha, data_criacao, ativo
    `;

    const result = await pool.query(updateQuery, [
      nome,
      sobrenome,
      email || session.user.email,
      clienteId
    ]);

    if (result.rows.length === 0) {
      return new Response(JSON.stringify({ error: "Erro ao atualizar perfil" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      cliente: result.rows[0]
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Erro ao atualizar perfil do cliente:", error);
    return new Response(JSON.stringify({ error: "Erro interno ao atualizar perfil" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
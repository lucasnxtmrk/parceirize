import { Pool } from "pg";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";
import bcrypt from "bcryptjs";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

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
    const { senhaAtual, novaSenha } = await req.json();

    if (!senhaAtual || !novaSenha) {
      return new Response(JSON.stringify({ error: "Senha atual e nova senha são obrigatórias" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (novaSenha.length < 6) {
      return new Response(JSON.stringify({ error: "A nova senha deve ter pelo menos 6 caracteres" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Buscar senha atual do cliente
    const clienteQuery = `SELECT senha FROM clientes WHERE id = $1`;
    const clienteResult = await pool.query(clienteQuery, [clienteId]);

    if (clienteResult.rows.length === 0) {
      return new Response(JSON.stringify({ error: "Cliente não encontrado" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Verificar se a senha atual está correta
    const senhaCorreta = await bcrypt.compare(senhaAtual, clienteResult.rows[0].senha);

    if (!senhaCorreta) {
      return new Response(JSON.stringify({ error: "Senha atual incorreta" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Gerar hash da nova senha
    const novaSenhaHash = await bcrypt.hash(novaSenha, 12);

    // Atualizar senha no banco
    const updateQuery = `
      UPDATE clientes
      SET senha = $1
      WHERE id = $2
    `;

    await pool.query(updateQuery, [novaSenhaHash, clienteId]);

    return new Response(JSON.stringify({
      success: true,
      message: "Senha alterada com sucesso"
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ Erro ao alterar senha:", error);
    return new Response(JSON.stringify({ error: "Erro interno ao alterar senha" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
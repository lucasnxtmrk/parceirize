import { Pool } from "pg";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options"; // Caminho do NextAuth

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// ✅ BUSCAR OS DADOS DO PARCEIRO
export async function GET(req) {
  try {
    const session = await getServerSession(options);

    if (!session || session.user.role !== "parceiro") {
      return new Response(JSON.stringify({ error: "Acesso negado" }), { status: 403 });
    }

    console.log("📡 Buscando perfil do parceiro:", session.user.email);

    // Buscar os dados do parceiro
    const query = `
      SELECT id, nome_empresa, email, foto, nicho, desconto_padrao
      FROM parceiros
      WHERE email = $1
    `;
    const result = await pool.query(query, [session.user.email]);

    if (result.rows.length === 0) {
      return new Response(JSON.stringify({ error: "Parceiro não encontrado." }), { status: 404 });
    }

    return new Response(JSON.stringify(result.rows[0]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ Erro ao buscar perfil do parceiro:", error);
    return new Response(JSON.stringify({ error: "Erro interno ao buscar perfil." }), { status: 500 });
  }
}

// ✅ ATUALIZAR OS DADOS DO PARCEIRO
export async function PUT(req) {
  try {
    const session = await getServerSession(options);

    if (!session || session.user.role !== "parceiro") {
      return new Response(JSON.stringify({ error: "Acesso negado" }), { status: 403 });
    }

    const { nome_empresa, email, foto, nicho, desconto_padrao } = await req.json();

    console.log("📡 Atualizando perfil do parceiro:", session.user.email);

    // Atualizar os dados do parceiro no banco
    const updateQuery = `
      UPDATE parceiros
      SET nome_empresa = $1, email = $2, foto = $3, nicho = $4, desconto_padrao = $5
      WHERE email = $6
      RETURNING id, nome_empresa, email, foto, nicho, desconto_padrao
    `;

    const result = await pool.query(updateQuery, [nome_empresa, email, foto, nicho, desconto_padrao, session.user.email]);

    if (result.rows.length === 0) {
      return new Response(JSON.stringify({ error: "Erro ao atualizar perfil." }), { status: 400 });
    }

    return new Response(JSON.stringify({ success: true, parceiro: result.rows[0] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ Erro ao atualizar perfil do parceiro:", error);
    return new Response(JSON.stringify({ error: "Erro interno ao atualizar perfil." }), { status: 500 });
  }
}

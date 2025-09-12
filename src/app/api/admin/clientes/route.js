import { Pool } from "pg";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";
import { withTenantIsolation, getTenantContext, logTenantAction, validatePlanLimits } from "@/lib/tenant-helper";
import bcrypt from "bcryptjs";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// 🔹 Função para gerar um ID de carteirinha aleatório (6 caracteres alfanuméricos)
function generateRandomId() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let id = "";
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

// 🔹 Função para garantir que o ID seja único no banco
async function generateUniqueCarteirinhaId() {
  let uniqueId;
  let exists = true;

  while (exists) {
    uniqueId = generateRandomId();
    const checkId = await pool.query("SELECT id FROM clientes WHERE id_carteirinha = $1", [uniqueId]);
    exists = checkId.rows.length > 0;
  }

  return uniqueId;
}

// ✅ BUSCAR LISTA DE CLIENTES (GET) - COM ISOLAMENTO MULTI-TENANT
export const GET = withTenantIsolation(async (request, { tenant }) => {
  try {
    console.log("📡 Buscando lista de clientes para tenant:", tenant.tenant_id);

    // Query com filtro de tenant (SuperAdmin vê todos, Provedor vê apenas os seus)
    let query = `
      SELECT id, nome, sobrenome, email, id_carteirinha, tipo_cliente, ativo, data_criacao
      FROM clientes 
    `;
    let params = [];

    if (!tenant.isGlobalAccess) {
      query += " WHERE tenant_id = $1";
      params.push(tenant.tenant_id);
    }

    query += " ORDER BY data_criacao DESC";

    const result = await pool.query(query, params);

    return new Response(JSON.stringify({
      clientes: result.rows,
      total: result.rows.length,
      tenant_info: {
        tenant_id: tenant.tenant_id,
        is_global: tenant.isGlobalAccess,
        role: tenant.role
      }
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ Erro ao buscar clientes:", error);
    return new Response(JSON.stringify({ error: "Erro interno ao buscar clientes." }), { status: 500 });
  }
});

// ✅ CRIAR NOVO CLIENTE (POST)
export async function POST(req) {
  try {
    const session = await getServerSession(options);
    if (!session || !['provedor', 'superadmin'].includes(session.user.role)) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), { status: 403 });
    }

    const { nome, sobrenome, email, senha } = await req.json();
    if (!nome || !sobrenome || !email || !senha) {
      return new Response(JSON.stringify({ error: "Todos os campos são obrigatórios" }), { status: 400 });
    }

    console.log("📡 Criando novo cliente:", email);

    // Verificar limite do plano antes de criar
    if (session.user.role === 'provedor') {
      try {
        await validatePlanLimits(session.user.tenant_id, 'clientes');
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 403 });
      }
    }

    // Verifica se o e-mail já está cadastrado
    const emailCheck = await pool.query("SELECT id FROM clientes WHERE email = $1", [email]);
    if (emailCheck.rows.length > 0) {
      return new Response(JSON.stringify({ error: "E-mail já cadastrado." }), { status: 409 });
    }

    // Gera ID de carteirinha único
    const idCarteirinha = await generateUniqueCarteirinhaId();

    // Criptografa a senha antes de salvar
    const senhaHash = await bcrypt.hash(senha, 10);

    const tenant_id = session.user.tenant_id;
    const result = await pool.query(
      `INSERT INTO clientes (nome, sobrenome, email, senha, id_carteirinha, tipo_cliente, ativo, tenant_id, data_criacao) 
       VALUES ($1, $2, $3, $4, $5, 'cliente', TRUE, $6, NOW()) 
       RETURNING id, nome, sobrenome, email, id_carteirinha, tipo_cliente, ativo`,
      [nome, sobrenome, email, senhaHash, idCarteirinha, tenant_id]
    );

    return new Response(JSON.stringify({ success: true, cliente: result.rows[0] }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ Erro ao criar cliente:", error);
    return new Response(JSON.stringify({ error: "Erro interno ao criar cliente." }), { status: 500 });
  }
}

// ✅ ATUALIZAR CLIENTE (PUT)
export async function PUT(req) {
  try {
    const session = await getServerSession(options);
    if (!session || !['provedor', 'superadmin'].includes(session.user.role)) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), { status: 403 });
    }

    const { id, nome, sobrenome, email } = await req.json();
    if (!id || !nome || !sobrenome || !email) {
      return new Response(JSON.stringify({ error: "Todos os campos são obrigatórios" }), { status: 400 });
    }

    console.log("📡 Atualizando cliente:", id);

    const tenant_id = session.user.tenant_id;
    const result = await pool.query(
      "UPDATE clientes SET nome = $1, sobrenome = $2, email = $3 WHERE id = $4 AND tenant_id = $5 RETURNING id, nome, sobrenome, email, id_carteirinha",
      [nome, sobrenome, email, id, tenant_id]
    );

    if (result.rows.length === 0) {
      return new Response(JSON.stringify({ error: "Cliente não encontrado." }), { status: 404 });
    }

    return new Response(JSON.stringify({ success: true, cliente: result.rows[0] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ Erro ao atualizar cliente:", error);
    return new Response(JSON.stringify({ error: "Erro interno ao atualizar cliente." }), { status: 500 });
  }
}

// ✅ EXCLUIR CLIENTES (DELETE)
export async function DELETE(req) {
  try {
    const session = await getServerSession(options);
    if (!session || !['provedor', 'superadmin'].includes(session.user.role)) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), { status: 403 });
    }

    const bodyText = await req.text();
    const { ids } = JSON.parse(bodyText);

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return new Response(JSON.stringify({ error: "IDs inválidos." }), { status: 400 });
    }

    console.log("🗑️ Excluindo clientes:", ids);

    const tenant_id = session.user.tenant_id;

    // 1️⃣ Excluir todos os registros da tabela voucher_utilizados relacionados aos clientes (com tenant_id)
    await pool.query("DELETE FROM voucher_utilizados WHERE cliente_id = ANY($1) AND tenant_id = $2", [ids, tenant_id]);

    // 2️⃣ Agora pode excluir os clientes (com tenant_id para segurança)
    const result = await pool.query("DELETE FROM clientes WHERE id = ANY($1) AND tenant_id = $2", [ids, tenant_id]);

    if (result.rowCount === 0) {
      return new Response(JSON.stringify({ error: "Nenhum cliente encontrado para exclusão." }), { status: 404 });
    }

    return new Response(JSON.stringify({ success: true, deletedCount: result.rowCount }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ Erro ao excluir clientes:", error);
    return new Response(JSON.stringify({ error: "Erro interno ao excluir clientes.", detail: error.message }), { status: 500 });
  }
}


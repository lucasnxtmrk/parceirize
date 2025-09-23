import { Pool } from "pg";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";
import { withTenantIsolation, getTenantContext, logTenantAction, validatePlanLimits, validateId, validateEmail, sanitizeString } from "@/lib/tenant-helper";
import { withValidation, withRateLimit, combineMiddlewares } from "@/lib/validation-middleware";
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

// ✅ BUSCAR LISTA DE CLIENTES (GET) - COM ISOLAMENTO MULTI-TENANT, PAGINAÇÃO E BUSCA
export const GET = withTenantIsolation(async (request, { tenant }) => {
  try {
    console.log("📡 Buscando lista de clientes para tenant:", tenant.tenant_id);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = Math.min(parseInt(searchParams.get('limit')) || 10, 50); // Máximo 50
    const search = searchParams.get('search') || '';
    const offset = (page - 1) * limit;

    // Query base com filtro de tenant
    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    if (!tenant.isGlobalAccess) {
      whereConditions.push(`tenant_id = $${paramIndex}`);
      params.push(tenant.tenant_id);
      paramIndex++;
    }

    // Adicionar filtro de busca
    if (search) {
      whereConditions.push(`(
        nome ILIKE $${paramIndex} OR
        sobrenome ILIKE $${paramIndex} OR
        email ILIKE $${paramIndex} OR
        cpf_cnpj ILIKE $${paramIndex} OR
        id_carteirinha ILIKE $${paramIndex}
      )`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Query para contar total
    const countQuery = `SELECT COUNT(*) as total FROM clientes ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Query principal com paginação
    const dataQuery = `
      SELECT id, nome, sobrenome, email, cpf_cnpj, id_carteirinha, tipo_cliente, ativo, data_criacao
      FROM clientes
      ${whereClause}
      ORDER BY data_criacao DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const result = await pool.query(dataQuery, params);

    const totalPages = Math.ceil(total / limit);

    return new Response(JSON.stringify({
      clientes: result.rows,
      pagination: {
        current_page: page,
        per_page: limit,
        total,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_prev: page > 1
      },
      search: search || null,
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

// ✅ CRIAR NOVO CLIENTE (POST) COM VALIDAÇÃO
export const POST = combineMiddlewares(
  withRateLimit,
  (handler) => withValidation(handler, 'cliente'),
  withTenantIsolation
)(async (request, { validatedData, tenant }) => {
  try {
    if (!['provedor', 'superadmin'].includes(tenant.role)) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), { status: 403 });
    }

    const { nome, sobrenome, email, cpf_cnpj, senha } = validatedData;

    console.log("📡 Criando novo cliente:", email);

    // Verificar limite do plano antes de criar
    if (tenant.role === 'provedor') {
      try {
        await validatePlanLimits(tenant.tenant_id, 'clientes');
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 403 });
      }
    }

    // Verificar se o e-mail já está cadastrado (com tenant isolation)
    let emailCheckQuery = "SELECT id FROM clientes WHERE email = $1";
    let emailCheckParams = [email];

    if (!tenant.isGlobalAccess) {
      emailCheckQuery += " AND tenant_id = $2";
      emailCheckParams.push(tenant.tenant_id);
    }

    const emailCheck = await pool.query(emailCheckQuery, emailCheckParams);
    if (emailCheck.rows.length > 0) {
      return new Response(JSON.stringify({ error: "E-mail já cadastrado neste provedor." }), { status: 409 });
    }

    // Verificar se o CPF/CNPJ já está cadastrado (com tenant isolation)
    let cpfCheckQuery = "SELECT id FROM clientes WHERE cpf_cnpj = $1";
    let cpfCheckParams = [cpf_cnpj];

    if (!tenant.isGlobalAccess) {
      cpfCheckQuery += " AND tenant_id = $2";
      cpfCheckParams.push(tenant.tenant_id);
    }

    const cpfCheck = await pool.query(cpfCheckQuery, cpfCheckParams);
    if (cpfCheck.rows.length > 0) {
      return new Response(JSON.stringify({ error: "CPF/CNPJ já cadastrado neste provedor." }), { status: 409 });
    }

    // Gera ID de carteirinha único
    const idCarteirinha = await generateUniqueCarteirinhaId();

    // Criptografa a senha antes de salvar
    const senhaHash = await bcrypt.hash(senha, 10);

    const result = await pool.query(
      `INSERT INTO clientes (nome, sobrenome, email, cpf_cnpj, senha, id_carteirinha, tipo_cliente, ativo, tenant_id, data_criacao)
       VALUES ($1, $2, $3, $4, $5, $6, 'cliente', TRUE, $7, NOW())
       RETURNING id, nome, sobrenome, email, cpf_cnpj, id_carteirinha, tipo_cliente, ativo`,
      [nome, sobrenome, email, cpf_cnpj, senhaHash, idCarteirinha, tenant.tenant_id]
    );

    // Log de auditoria
    await logTenantAction(
      tenant.tenant_id,
      tenant.user.id,
      tenant.role,
      'cliente_criado',
      { cliente_email: email, cliente_id: result.rows[0].id }
    );

    return new Response(JSON.stringify({ success: true, cliente: result.rows[0] }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ Erro ao criar cliente:", error.message);
    return new Response(JSON.stringify({ error: "Erro interno ao criar cliente." }), { status: 500 });
  }
});

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

    // 1️⃣ Excluir todos os registros da tabela voucher_utilizados relacionados aos clientes (com isolamento via clientes)
    await pool.query(`
      DELETE FROM voucher_utilizados
      WHERE cliente_id = ANY($1)
      AND cliente_id IN (
        SELECT id FROM clientes WHERE tenant_id = $2
      )
    `, [ids, tenant_id]);

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


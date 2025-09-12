// EXEMPLO: API de Clientes usando Drizzle ORM
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";
import { validatePlanLimits } from "@/lib/tenant-helper";
import bcrypt from "bcryptjs";

// Import do Drizzle
import { db, clientes, provedores, eq, and, count } from "@/db/index.js";

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
    const existing = await db
      .select({ id: clientes.id })
      .from(clientes)
      .where(eq(clientes.idCarteirinha, uniqueId))
      .limit(1);
    
    exists = existing.length > 0;
  }

  return uniqueId;
}

// ✅ BUSCAR LISTA DE CLIENTES (GET) - COM DRIZZLE
export async function GET(req) {
  try {
    const session = await getServerSession(options);
    if (!session || !['provedor', 'superadmin'].includes(session.user.role)) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), { status: 403 });
    }

    console.log("📡 Buscando lista de clientes para:", session.user.role);

    let whereCondition;
    
    // SuperAdmin vê todos, Provedor vê apenas seus clientes
    if (session.user.role === 'superadmin') {
      whereCondition = undefined; // Sem filtro
    } else {
      whereCondition = eq(clientes.tenantId, session.user.tenant_id);
    }

    // Query com Drizzle - Type Safe!
    const clientesList = await db
      .select({
        id: clientes.id,
        nome: clientes.nome,
        sobrenome: clientes.sobrenome,
        email: clientes.email,
        id_carteirinha: clientes.idCarteirinha,
        tipo_cliente: clientes.tipoCliente,
        ativo: clientes.ativo,
        data_criacao: clientes.dataCriacao,
        // Join com provedor para ver empresa (opcional)
        nome_empresa: provedores.nomeEmpresa
      })
      .from(clientes)
      .leftJoin(provedores, eq(clientes.tenantId, provedores.tenantId))
      .where(whereCondition)
      .orderBy(clientes.dataCriacao);

    return new Response(JSON.stringify({
      clientes: clientesList,
      total: clientesList.length,
      tenant_info: {
        tenant_id: session.user.tenant_id,
        is_global: session.user.role === 'superadmin',
        role: session.user.role
      }
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ Erro ao buscar clientes:", error);
    return new Response(JSON.stringify({ error: "Erro interno ao buscar clientes." }), { status: 500 });
  }
}

// ✅ CRIAR NOVO CLIENTE (POST) - COM DRIZZLE
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
      await validatePlanLimits(session.user.tenant_id, 'clientes');
    }

    // Verificar se email já existe - Com Drizzle!
    const existingClient = await db
      .select({ id: clientes.id })
      .from(clientes)
      .where(eq(clientes.email, email))
      .limit(1);

    if (existingClient.length > 0) {
      return new Response(JSON.stringify({ error: "E-mail já cadastrado." }), { status: 409 });
    }

    // Gerar ID de carteirinha único
    const idCarteirinha = await generateUniqueCarteirinhaId();

    // Criptografar senha
    const senhaHash = await bcrypt.hash(senha, 10);

    // Inserir com Drizzle - Type Safe e com retorno automático!
    const novoCliente = await db
      .insert(clientes)
      .values({
        nome,
        sobrenome,
        email,
        senha: senhaHash,
        idCarteirinha,
        tipoCliente: 'cliente',
        ativo: true,
        tenantId: session.user.tenant_id || null
      })
      .returning({
        id: clientes.id,
        nome: clientes.nome,
        sobrenome: clientes.sobrenome,
        email: clientes.email,
        id_carteirinha: clientes.idCarteirinha,
        tipo_cliente: clientes.tipoCliente,
        ativo: clientes.ativo
      });

    return new Response(JSON.stringify({ 
      success: true, 
      cliente: novoCliente[0] 
    }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ Erro ao criar cliente:", error);
    
    // Drizzle automaticamente identifica erros de constraint
    if (error.code === '23505') { // Unique violation
      return new Response(JSON.stringify({ error: "E-mail já cadastrado." }), { status: 409 });
    }
    
    return new Response(JSON.stringify({ error: "Erro interno ao criar cliente." }), { status: 500 });
  }
}

// ✅ ATUALIZAR CLIENTE (PUT) - COM DRIZZLE
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

    // Atualizar com Drizzle - Type Safe!
    const clienteAtualizado = await db
      .update(clientes)
      .set({
        nome,
        sobrenome,
        email
      })
      .where(and(
        eq(clientes.id, id),
        // Apenas superadmin pode editar qualquer cliente
        session.user.role === 'superadmin' ? undefined : eq(clientes.tenantId, session.user.tenant_id)
      ))
      .returning({
        id: clientes.id,
        nome: clientes.nome,
        sobrenome: clientes.sobrenome,
        email: clientes.email,
        id_carteirinha: clientes.idCarteirinha
      });

    if (clienteAtualizado.length === 0) {
      return new Response(JSON.stringify({ error: "Cliente não encontrado." }), { status: 404 });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      cliente: clienteAtualizado[0] 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ Erro ao atualizar cliente:", error);
    return new Response(JSON.stringify({ error: "Erro interno ao atualizar cliente." }), { status: 500 });
  }
}

// ✅ EXCLUIR CLIENTES (DELETE) - COM DRIZZLE
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

    // Usar transação para garantir consistência
    const result = await db.transaction(async (tx) => {
      // 1️⃣ Primeiro, excluir vouchers utilizados
      await tx
        .delete(voucherUtilizados)
        .where(
          and(
            // IDs dos clientes
            voucherUtilizados.clienteId.in(ids),
            // Filtro de tenant se não for superadmin
            session.user.role === 'superadmin' ? undefined : 
              eq(clientes.tenantId, session.user.tenant_id)
          )
        );

      // 2️⃣ Depois, excluir os clientes
      const deletedClientes = await tx
        .delete(clientes)
        .where(
          and(
            clientes.id.in(ids),
            // Filtro de tenant se não for superadmin
            session.user.role === 'superadmin' ? undefined : 
              eq(clientes.tenantId, session.user.tenant_id)
          )
        )
        .returning({ id: clientes.id });

      return deletedClientes;
    });

    if (result.length === 0) {
      return new Response(JSON.stringify({ error: "Nenhum cliente encontrado para exclusão." }), { status: 404 });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      deletedCount: result.length 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ Erro ao excluir clientes:", error);
    return new Response(JSON.stringify({ 
      error: "Erro interno ao excluir clientes.", 
      detail: error.message 
    }), { status: 500 });
  }
}
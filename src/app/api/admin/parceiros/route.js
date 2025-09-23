// 📦 IMPORTS
import { Pool } from "pg";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";
import { withTenantIsolation, getTenantContext, logTenantAction, validatePlanLimits, validateId } from "@/lib/tenant-helper";
import bcrypt from "bcryptjs"; 
import fs from "fs";
import path from "path";

// 📌 Função para salvar imagem no servidor
const saveImage = (base64Image, filename) => {
  console.log("💾 Salvando imagem...");
  const imagePath = path.join(process.cwd(), "public/uploads", filename);
  const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
  fs.writeFileSync(imagePath, base64Data, "base64");
  return `/uploads/${filename}`; 
};

// 📌 Função para gerar código único
const generateUniqueVoucher = async (nome_empresa, desconto) => {
  console.log("🎟️ Gerando voucher...");
  const base = nome_empresa.slice(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, "");
  const random = Math.floor(10000 + Math.random() * 90000);
  const codigo = `${base}${random}`;

  const check = await pool.query("SELECT id FROM vouchers WHERE codigo = $1", [codigo]);
  if (check.rows.length > 0) {
    console.log("⚠️ Voucher repetido, tentando novamente...");
    return generateUniqueVoucher(nome_empresa, desconto); // recursão
  }

  return codigo;
};

// 📌 Conexão com banco
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// ✅ GET - LISTA PARCEIROS - COM ISOLAMENTO MULTI-TENANT, PAGINAÇÃO E BUSCA
export const GET = withTenantIsolation(async (request, { tenant }) => {
  try {
    console.log("📡 Buscando lista de parceiros para tenant:", tenant.tenant_id);

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
      whereConditions.push(`p.tenant_id = $${paramIndex}`);
      params.push(tenant.tenant_id);
      paramIndex++;
    }

    // Adicionar filtro de busca
    if (search) {
      whereConditions.push(`(
        p.nome_empresa ILIKE $${paramIndex} OR
        p.email ILIKE $${paramIndex} OR
        p.nicho ILIKE $${paramIndex}
      )`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Query para contar total
    const countQuery = `
      SELECT COUNT(DISTINCT p.id) as total
      FROM parceiros p
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Query principal com paginação
    const dataQuery = `
      SELECT
        p.id,
        p.nome_empresa,
        p.email,
        p.nicho,
        p.foto,
        p.data_criacao,
        COUNT(DISTINCT v.id) as total_vouchers
      FROM parceiros p
      LEFT JOIN vouchers v ON p.id = v.parceiro_id ${!tenant.isGlobalAccess ? 'AND v.tenant_id = p.tenant_id' : ''}
      ${whereClause}
      GROUP BY p.id, p.nome_empresa, p.email, p.nicho, p.foto, p.data_criacao
      ORDER BY p.data_criacao DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const result = await pool.query(dataQuery, params);

    const totalPages = Math.ceil(total / limit);

    return new Response(JSON.stringify({
      parceiros: result.rows,
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
    console.error("❌ Erro ao buscar parceiros:", error);
    return new Response(JSON.stringify({ error: "Erro ao buscar parceiros" }), { status: 500 });
  }
});

// ✅ POST - CRIAR PARCEIRO
export async function POST(req) {
  try {
    const session = await getServerSession(options);
    if (!session || !["provedor", "superadmin"].includes(session.user.role)) {
      console.log("🚫 Acesso negado");
      return new Response(JSON.stringify({ error: "Acesso negado" }), { status: 403 });
    }

    const body = await req.json();
    console.log("📥 Dados recebidos:", body);

    // Verificar limite do plano antes de criar
    if (session.user.role === 'provedor') {
      try {
        await validatePlanLimits(session.user.tenant_id, 'parceiros');
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 403 });
      }
    }

    const {
      nome_empresa,
      email,
      senha,
      foto,
      desconto,
      limitar_voucher,
      limite_uso, 
      nicho // CORRIGIDO
    } = body;

    if (!nome_empresa || !email || !senha || !desconto) {
      console.log("⚠️ Campos obrigatórios ausentes");
      return new Response(JSON.stringify({ error: "Nome, email, senha e desconto são obrigatórios" }), { status: 400 });
    }

    const emailCheck = await pool.query("SELECT id FROM parceiros WHERE email = $1", [email]);
    if (emailCheck.rows.length > 0) {
      console.log("⚠️ E-mail já cadastrado:", email);
      return new Response(JSON.stringify({ error: "E-mail já cadastrado." }), { status: 409 });
    }

    console.log("🔒 Criptografando senha...");
    const senhaHash = await bcrypt.hash(senha, 10);

    let fotoParceiro = "/assets/images/avatar.jpg";
    if (foto && foto.startsWith("data:image")) {
      const filename = `parceiro_${Date.now()}.png`;
      fotoParceiro = saveImage(foto, filename);
    }

    console.log("📥 Inserindo parceiro...");
    const tenant_id = session.user.tenant_id;
    const parceiroResult = await pool.query(
  "INSERT INTO parceiros (nome_empresa, email, senha, foto, nicho, tenant_id, data_criacao) VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING id",
  [nome_empresa, email, senhaHash, fotoParceiro, nicho, tenant_id]
);


    const parceiroId = parceiroResult.rows[0].id;
    console.log("✅ Parceiro criado com ID:", parceiroId);

    const voucherCode = await generateUniqueVoucher(nome_empresa, desconto);
    const limiteUsoFinal = limitar_voucher ? limite_uso : null;

    console.log("🎟️ Criando voucher...");
    await pool.query(
      "INSERT INTO vouchers (parceiro_id, codigo, desconto, titulo, tipo_desconto, valor_desconto, condicoes, tenant_id, data_criacao, limite_uso) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9)",
      [
        parceiroId,
        voucherCode,
        desconto,
        'Desconto Exclusivo',
        'percentual',
        desconto,
        'Válido para compras no estabelecimento. Não cumulativo com outras promoções.',
        tenant_id,
        limiteUsoFinal
      ]
    );

    console.log("✅ Voucher criado:", voucherCode);

    return new Response(JSON.stringify({ success: true, parceiro: parceiroResult.rows[0], voucher: voucherCode }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ Erro ao criar parceiro:", error);
    return new Response(JSON.stringify({ error: "Erro ao criar parceiro", detail: error.message }), { status: 500 });
  }
}


// ✅ PUT - ATUALIZAR PARCEIRO (inclui nova senha se fornecida)
export async function PUT(req) {
  try {
    const session = await getServerSession(options);
    if (!session || !["provedor", "superadmin"].includes(session.user.role)) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), { status: 403 });
    }

    const body = await req.json();
    const {
      id,
      nome_empresa,
      email,
      foto,
      desconto,
      limitar_voucher,
      limite_uso, // CORRIGIDO
      novaSenha, 
      nicho
    } = body;

    if (!id || !nome_empresa || !email || !desconto) {
      return new Response(JSON.stringify({ error: "ID, Nome, Email e Desconto são obrigatórios" }), { status: 400 });
    }

    let senhaHash = null;
    if (novaSenha && novaSenha.trim() !== "") {
      senhaHash = await bcrypt.hash(novaSenha, 10);
    }

    const parceiroData = await pool.query("SELECT foto FROM parceiros WHERE id = $1", [id]);
    let fotoParceiro = parceiroData.rows[0]?.foto || "/assets/images/users/dummy-avatar.jpg";

    if (foto && foto.startsWith("data:image")) {
      const filename = `parceiro_${Date.now()}.png`;
      fotoParceiro = saveImage(foto, filename);
    }

    // Monta dinamicamente a query de atualização
    const fields = ["nome_empresa = $1", "email = $2", "foto = $3", "nicho = $4"];
const values = [nome_empresa, email, fotoParceiro, nicho];

if (senhaHash) {
  fields.push(`senha = $${fields.length + 1}`);
  values.push(senhaHash);
}


    values.push(id); // ID será o último valor

    const updateQuery = `
      UPDATE parceiros
      SET ${fields.join(", ")}
      WHERE id = $${values.length}
      RETURNING id, nome_empresa, email, foto
    `;

    const parceiroUpdate = await pool.query(updateQuery, values);

    if (parceiroUpdate.rows.length === 0) {
      return new Response(JSON.stringify({ error: "Parceiro não encontrado" }), { status: 404 });
    }

    const limiteUsoFinal = limitar_voucher ? limite_uso : null;

    await pool.query(
      "UPDATE vouchers SET desconto = $1, limite_uso = $2 WHERE parceiro_id = $3",
      [desconto, limiteUsoFinal, id]
    );

    return new Response(JSON.stringify({ success: true, parceiro: parceiroUpdate.rows[0] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: "Erro ao atualizar parceiro", detail: error.message }), { status: 500 });
  }
}


// ✅ DELETE - REMOVER PARCEIRO COM ISOLAMENTO TENANT
export const DELETE = withTenantIsolation(async (request, { tenant }) => {
  try {
    if (!["provedor", "superadmin"].includes(tenant.role)) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const parceiroIdParam = searchParams.get("id");

    if (!parceiroIdParam) {
      return new Response(JSON.stringify({ error: "ID do parceiro não fornecido" }), { status: 400 });
    }

    const parceiroId = validateId(parceiroIdParam, 'Parceiro ID');

    // 1️⃣ Verificar se o parceiro pertence ao tenant (se não for superadmin)
    let parceiroCheckQuery = "SELECT id, tenant_id FROM parceiros WHERE id = $1";
    let parceiroCheckParams = [parceiroId];

    if (!tenant.isGlobalAccess) {
      parceiroCheckQuery += " AND tenant_id = $2";
      parceiroCheckParams.push(tenant.tenant_id);
    }

    const parceiroCheck = await pool.query(parceiroCheckQuery, parceiroCheckParams);

    if (parceiroCheck.rows.length === 0) {
      return new Response(JSON.stringify({ error: "Parceiro não encontrado ou sem permissão" }), { status: 404 });
    }

    const parceiro = parceiroCheck.rows[0];

    // 2️⃣ Buscar todos os vouchers do parceiro COM tenant_id
    const vouchersQuery = `
      SELECT v.id FROM vouchers v
      INNER JOIN parceiros p ON v.parceiro_id = p.id
      WHERE v.parceiro_id = $1 ${!tenant.isGlobalAccess ? 'AND p.tenant_id = $2' : ''}
    `;
    const vouchersParams = !tenant.isGlobalAccess
      ? [parceiroId, tenant.tenant_id]
      : [parceiroId];

    const vouchers = await pool.query(vouchersQuery, vouchersParams);

    // 3️⃣ Remover voucher_utilizados (isolamento já garantido pelos voucher_ids)
    if (vouchers.rows.length > 0) {
      const voucherIds = vouchers.rows.map(v => v.id);
      const deleteUtilizadosQuery = `
        DELETE FROM voucher_utilizados
        WHERE voucher_id = ANY($1)
      `;

      await pool.query(deleteUtilizadosQuery, [voucherIds]);
    }

    // 4️⃣ Remover vouchers COM filtro de tenant
    const deleteVouchersQuery = `
      DELETE FROM vouchers
      WHERE parceiro_id = $1 ${!tenant.isGlobalAccess ? 'AND tenant_id = $2' : ''}
    `;
    const deleteVouchersParams = !tenant.isGlobalAccess
      ? [parceiroId, tenant.tenant_id]
      : [parceiroId];

    await pool.query(deleteVouchersQuery, deleteVouchersParams);

    // 5️⃣ Remover parceiro COM filtro de tenant
    const deleteParceiroQuery = `
      DELETE FROM parceiros
      WHERE id = $1 ${!tenant.isGlobalAccess ? 'AND tenant_id = $2' : ''}
      RETURNING id
    `;
    const deleteParceiroParams = !tenant.isGlobalAccess
      ? [parceiroId, tenant.tenant_id]
      : [parceiroId];

    const result = await pool.query(deleteParceiroQuery, deleteParceiroParams);

    if (result.rows.length === 0) {
      return new Response(JSON.stringify({ error: "Falha ao excluir parceiro" }), { status: 500 });
    }

    // 6️⃣ Log de auditoria
    await logTenantAction(
      tenant.tenant_id,
      tenant.user.id,
      tenant.role,
      'parceiro_excluido',
      { parceiro_id: parceiroId }
    );

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ Erro ao excluir parceiro:", error.message);
    return new Response(JSON.stringify({ error: "Erro interno ao excluir parceiro" }), { status: 500 });
  }
});


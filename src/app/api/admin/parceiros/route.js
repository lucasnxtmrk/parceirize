// 📦 IMPORTS
import { Pool } from "pg";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";
import { withTenantIsolation, getTenantContext, logTenantAction, validatePlanLimits } from "@/lib/tenant-helper";
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

// ✅ GET - LISTA PARCEIROS - COM ISOLAMENTO MULTI-TENANT
export const GET = withTenantIsolation(async (request, { tenant }) => {
  try {
    console.log("📡 Buscando lista de parceiros para tenant:", tenant.tenant_id);

    let query = `
      SELECT 
        p.id,
        p.nome_empresa,
        p.email,
        p.nicho,
        p.foto,
        p.data_criacao,
        COUNT(DISTINCT v.id) as total_vouchers
      FROM parceiros p
      LEFT JOIN vouchers v ON p.id = v.parceiro_id
    `;
    
    let params = [];

    if (!tenant.isGlobalAccess) {
      query += " WHERE p.tenant_id = $1";
      params.push(tenant.tenant_id);
    }

    query += `
      GROUP BY p.id, p.nome_empresa, p.email, p.nicho, p.foto, p.data_criacao
      ORDER BY p.data_criacao DESC
    `;

    const result = await pool.query(query, params);

    return new Response(JSON.stringify({
      parceiros: result.rows,
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
      "INSERT INTO vouchers (parceiro_id, codigo, desconto, tenant_id, data_criacao, limite_uso) VALUES ($1, $2, $3, $4, NOW(), $5)",
      [parceiroId, voucherCode, desconto, tenant_id, limiteUsoFinal]
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


// ✅ DELETE - REMOVER PARCEIRO
export async function DELETE(req) {
  try {
    const session = await getServerSession(options);
    if (!session || !["provedor", "superadmin"].includes(session.user.role)) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const parceiroId = searchParams.get("id");

    if (!parceiroId) {
      return new Response(JSON.stringify({ error: "ID do parceiro não fornecido" }), { status: 400 });
    }

    // 1️⃣ Buscar todos os vouchers do parceiro
    const vouchers = await pool.query(
      "SELECT id FROM vouchers WHERE parceiro_id = $1",
      [parceiroId]
    );

    // 2️⃣ Remover todos os registros em voucher_utilizados relacionados
    for (const voucher of vouchers.rows) {
      await pool.query(
        "DELETE FROM voucher_utilizados WHERE voucher_id = $1",
        [voucher.id]
      );
    }

    // 3️⃣ Remover os vouchers do parceiro
    await pool.query("DELETE FROM vouchers WHERE parceiro_id = $1", [parceiroId]);

    // 4️⃣ Remover o parceiro
    const result = await pool.query("DELETE FROM parceiros WHERE id = $1 RETURNING id", [parceiroId]);

    if (result.rows.length === 0) {
      return new Response(JSON.stringify({ error: "Parceiro não encontrado" }), { status: 404 });
    }

    console.log("🗑️ Parceiro e dados associados excluídos:", parceiroId);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ Erro ao excluir parceiro e dados associados:", error);
    return new Response(JSON.stringify({ error: "Erro ao excluir parceiro", detail: error.message }), { status: 500 });
  }
}


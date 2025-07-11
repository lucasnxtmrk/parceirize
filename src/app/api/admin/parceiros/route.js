// 📦 IMPORTS
import { Pool } from "pg";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";
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

// ✅ GET - LISTA PARCEIROS
export async function GET(req) {
  try {
    const session = await getServerSession(options);
    if (!session || session.user.role !== "admin") {
      return new Response(JSON.stringify({ error: "Acesso negado" }), { status: 403 });
    }

    console.log("📡 Buscando lista de parceiros...");

    const result = await pool.query(`
      SELECT 
        p.id, p.nome_empresa, p.email, p.foto, 
        v.codigo AS voucher_codigo, v.desconto, 
        COALESCE(v.limite_uso, 0) AS limite_uso
      FROM parceiros p
      LEFT JOIN vouchers v ON p.id = v.parceiro_id
    `);

    console.log("✅ Parceiros encontrados:", result.rowCount);

    return new Response(JSON.stringify(result.rows), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ Erro ao buscar parceiros:", error);
    return new Response(JSON.stringify({ error: "Erro ao buscar parceiros" }), { status: 500 });
  }
}

// ✅ POST - CRIAR PARCEIRO
export async function POST(req) {
  try {
    const session = await getServerSession(options);
    if (!session || session.user.role !== "admin") {
      console.log("🚫 Acesso negado");
      return new Response(JSON.stringify({ error: "Acesso negado" }), { status: 403 });
    }

    const body = await req.json();
    console.log("📥 Dados recebidos:", body);

    const { nome_empresa, email, senha, foto, desconto, limitar_voucher, limite_voucher } = body;

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

    let fotoParceiro = "/assets/images/users/dummy-avatar.jpg";
    if (foto && foto.startsWith("data:image")) {
      const filename = `parceiro_${Date.now()}.png`;
      fotoParceiro = saveImage(foto, filename);
    }

    console.log("📥 Inserindo parceiro...");
    const parceiroResult = await pool.query(
      "INSERT INTO parceiros (nome_empresa, email, senha, foto, data_criacao) VALUES ($1, $2, $3, $4, NOW()) RETURNING id, nome_empresa, email, foto",
      [nome_empresa, email, senhaHash, fotoParceiro]
    );

    const parceiroId = parceiroResult.rows[0].id;
    console.log("✅ Parceiro criado com ID:", parceiroId);

    const voucherCode = await generateUniqueVoucher(nome_empresa, desconto);
    const limiteUsoFinal = limitar_voucher ? limite_voucher : null;

    console.log("🎟️ Criando voucher...");
    await pool.query(
      "INSERT INTO vouchers (parceiro_id, codigo, desconto, data_criacao, limite_uso) VALUES ($1, $2, $3, NOW(), $4)",
      [parceiroId, voucherCode, desconto, limiteUsoFinal]
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

// ✅ PUT - ATUALIZAR PARCEIRO
export async function PUT(req) {
  try {
    const session = await getServerSession(options);
    if (!session || session.user.role !== "admin") {
      console.log("🚫 Acesso negado na atualização");
      return new Response(JSON.stringify({ error: "Acesso negado" }), { status: 403 });
    }

    const body = await req.json();
    const { id, nome_empresa, email, foto, desconto, limitar_voucher, limite_voucher } = body;

    console.log("📥 Atualizando parceiro com ID:", id);

    if (!id || !nome_empresa || !email || !desconto) {
      console.log("⚠️ Dados incompletos para atualização");
      return new Response(JSON.stringify({ error: "ID, Nome, Email e Desconto são obrigatórios" }), { status: 400 });
    }

    const parceiroData = await pool.query("SELECT foto FROM parceiros WHERE id = $1", [id]);
    let fotoParceiro = parceiroData.rows[0]?.foto || "/assets/images/users/dummy-avatar.jpg";

    if (foto && foto.startsWith("data:image")) {
      const filename = `parceiro_${Date.now()}.png`;
      fotoParceiro = saveImage(foto, filename);
    }

    const parceiroUpdate = await pool.query(
      "UPDATE parceiros SET nome_empresa = $1, email = $2, foto = $3 WHERE id = $4 RETURNING id, nome_empresa, email, foto",
      [nome_empresa, email, fotoParceiro, id]
    );

    if (parceiroUpdate.rows.length === 0) {
      console.log("⚠️ Parceiro não encontrado:", id);
      return new Response(JSON.stringify({ error: "Parceiro não encontrado" }), { status: 404 });
    }

    const limiteUsoFinal = limitar_voucher ? limite_voucher : null;

    await pool.query(
      "UPDATE vouchers SET desconto = $1, limite_uso = $2 WHERE parceiro_id = $3",
      [desconto, limiteUsoFinal, id]
    );

    console.log("✅ Parceiro atualizado com sucesso:", id);

    return new Response(JSON.stringify({ success: true, parceiro: parceiroUpdate.rows[0] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ Erro ao atualizar parceiro:", error);
    return new Response(JSON.stringify({ error: "Erro ao atualizar parceiro", detail: error.message }), { status: 500 });
  }
}

// ✅ DELETE - REMOVER PARCEIRO
export async function DELETE(req) {
  try {
    const session = await getServerSession(options);
    if (!session || session.user.role !== "admin") {
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


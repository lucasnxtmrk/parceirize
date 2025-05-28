import { Pool } from "pg";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";
import bcrypt from "bcryptjs"; 
import fs from "fs";
import path from "path";

// 📌 Função para salvar imagem no servidor
const saveImage = (base64Image, filename) => {
    const imagePath = path.join(process.cwd(), "public/uploads", filename);
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");

    fs.writeFileSync(imagePath, base64Data, "base64");

    return `/uploads/${filename}`; 
};

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// ✅ BUSCAR LISTA DE PARCEIROS (GET)
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

    return new Response(JSON.stringify(result.rows), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ Erro ao buscar parceiros:", error);
    return new Response(JSON.stringify({ error: "Erro ao buscar parceiros" }), { status: 500 });
  }
}

// ✅ CRIAR NOVO PARCEIRO (POST)
export async function POST(req) {
  try {
    const session = await getServerSession(options);

    if (!session || session.user.role !== "admin") {
      return new Response(JSON.stringify({ error: "Acesso negado" }), { status: 403 });
    }

    const { nome_empresa, email, senha, foto, desconto, limitar_voucher, limite_voucher } = await req.json();

    if (!nome_empresa || !email || !senha || !desconto) {
      return new Response(JSON.stringify({ error: "Nome, email, senha e desconto são obrigatórios" }), { status: 400 });
    }

    console.log("📡 Criando novo parceiro:", email);

    const emailCheck = await pool.query("SELECT id FROM parceiros WHERE email = $1", [email]);
    if (emailCheck.rows.length > 0) {
      return new Response(JSON.stringify({ error: "E-mail já cadastrado." }), { status: 409 });
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    let fotoParceiro = "/assets/images/users/dummy-avatar.jpg";
    if (foto && foto.startsWith("data:image")) {
        const filename = `parceiro_${Date.now()}.png`;
        fotoParceiro = saveImage(foto, filename);
    }

    const parceiroResult = await pool.query(
      "INSERT INTO parceiros (nome_empresa, email, senha, foto, data_criacao) VALUES ($1, $2, $3, $4, NOW()) RETURNING id, nome_empresa, email, foto",
      [nome_empresa, email, senhaHash, fotoParceiro]
    );

    const parceiroId = parceiroResult.rows[0].id;

    const voucherCode = await generateUniqueVoucher(nome_empresa, desconto);

    const limiteUsoFinal = limitar_voucher ? limite_voucher : null;

    await pool.query(
      "INSERT INTO vouchers (parceiro_id, codigo, desconto, data_criacao, limite_uso) VALUES ($1, $2, $3, NOW(), $4)",
      [parceiroId, voucherCode, desconto, limiteUsoFinal]
    );

    return new Response(JSON.stringify({ success: true, parceiro: parceiroResult.rows[0], voucher: voucherCode }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ Erro ao criar parceiro:", error);
    return new Response(JSON.stringify({ error: "Erro ao criar parceiro" }), { status: 500 });
  }
}

// ✅ ATUALIZAR PARCEIRO E SEU VOUCHER (PUT)
export async function PUT(req) {
  try {
    const session = await getServerSession(options);

    if (!session || session.user.role !== "admin") {
      return new Response(JSON.stringify({ error: "Acesso negado" }), { status: 403 });
    }

    const { id, nome_empresa, email, foto, desconto, limitar_voucher, limite_voucher } = await req.json();

    if (!id || !nome_empresa || !email || !desconto) {
      return new Response(JSON.stringify({ error: "ID, Nome, Email e Desconto são obrigatórios" }), { status: 400 });
    }

    console.log("📡 Atualizando parceiro:", id);

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
      return new Response(JSON.stringify({ error: "Parceiro não encontrado" }), { status: 404 });
    }

    const limiteUsoFinal = limitar_voucher ? limite_voucher : null;

    await pool.query(
      "UPDATE vouchers SET desconto = $1, limite_uso = $2 WHERE parceiro_id = $3",
      [desconto, limiteUsoFinal, id]
    );

    return new Response(JSON.stringify({ success: true, parceiro: parceiroUpdate.rows[0] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ Erro ao atualizar parceiro:", error);
    return new Response(JSON.stringify({ error: "Erro ao atualizar parceiro" }), { status: 500 });
  }
}

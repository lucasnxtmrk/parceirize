import { Pool } from "pg";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function POST(req) {
  try {
    const session = await getServerSession(options);

    if (!session || session.user.role !== 'cliente') {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const clienteId = session.user.id;
    const formData = await req.formData();
    const file = formData.get('foto');

    if (!file) {
      return new Response(JSON.stringify({ error: "Nenhum arquivo enviado" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      return new Response(JSON.stringify({ error: "Arquivo deve ser uma imagem" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validar tamanho (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: "Arquivo deve ter no máximo 5MB" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Converter arquivo para buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Criar diretório se não existir
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'clientes');
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (error) {
      // Diretório já existe
    }

    // Gerar nome único para o arquivo
    const extension = path.extname(file.name);
    const fileName = `cliente_${clienteId}_${Date.now()}${extension}`;
    const filePath = path.join(uploadDir, fileName);

    // Salvar arquivo
    await writeFile(filePath, buffer);

    // URL relativa da foto
    const fotoUrl = `/uploads/clientes/${fileName}`;

    // Atualizar banco de dados
    const updateQuery = `
      UPDATE clientes
      SET foto_url = $1
      WHERE id = $2
      RETURNING foto_url
    `;

    const result = await pool.query(updateQuery, [fotoUrl, clienteId]);

    if (result.rows.length === 0) {
      return new Response(JSON.stringify({ error: "Erro ao atualizar foto no banco" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      foto_url: result.rows[0].foto_url,
      message: "Foto atualizada com sucesso"
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ Erro ao fazer upload da foto:", error);
    return new Response(JSON.stringify({ error: "Erro interno ao fazer upload da foto" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
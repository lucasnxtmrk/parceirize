import { Pool } from "pg";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// GET - Buscar voucher do parceiro
export async function GET(req) {
  try {
    const session = await getServerSession(options);

    if (!session || session.user.role !== 'parceiro') {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const parceiroId = session.user.id;

    console.log(`🎫 Buscando voucher do parceiro ${parceiroId}`);

    const query = `
      SELECT
        v.id,
        v.codigo,
        v.titulo,
        v.tipo_desconto,
        v.valor_desconto,
        v.condicoes,
        v.limite_uso,
        v.utilizado,
        v.data_criacao
      FROM vouchers v
      WHERE v.parceiro_id = $1
    `;

    const result = await pool.query(query, [parceiroId]);

    const voucher = result.rows.length > 0 ? result.rows[0] : null;

    console.log(`✅ Voucher encontrado:`, voucher ? voucher.titulo : 'Nenhum voucher');

    return new Response(JSON.stringify({ voucher }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ Erro ao buscar voucher do parceiro:", error);
    return new Response(JSON.stringify({ error: "Erro interno do servidor" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// POST - Criar voucher (se não existir)
export async function POST(req) {
  try {
    const session = await getServerSession(options);

    if (!session || session.user.role !== 'parceiro') {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const parceiroId = session.user.id;
    const {
      titulo,
      descricao,
      condicoes,
      limite_uso
    } = await req.json();

    // Validações
    if (!titulo) {
      return new Response(JSON.stringify({
        error: "Título é obrigatório"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log(`🎫 Criando voucher para parceiro ${parceiroId}`);

    // Verificar se já existe voucher para este parceiro
    const existeQuery = `SELECT id FROM vouchers WHERE parceiro_id = $1`;
    const existeResult = await pool.query(existeQuery, [parceiroId]);

    if (existeResult.rows.length > 0) {
      return new Response(JSON.stringify({
        error: "Você já possui um voucher. Use PUT para atualizar."
      }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Gerar código único
    const codigo = `VCH-${parceiroId}-${Date.now()}`;

    const insertQuery = `
      INSERT INTO vouchers (
        parceiro_id,
        codigo,
        titulo,
        descricao,
        condicoes,
        limite_uso,
        utilizado
      ) VALUES ($1, $2, $3, $4, $5, $6, false)
      RETURNING *
    `;

    const insertParams = [
      parceiroId,
      codigo,
      titulo,
      descricao,
      condicoes,
      limite_uso || null
    ];

    const result = await pool.query(insertQuery, insertParams);
    const voucher = result.rows[0];

    console.log(`✅ Voucher criado com ID: ${voucher.id}`);

    return new Response(JSON.stringify({
      success: true,
      message: "Voucher criado com sucesso!",
      voucher
    }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ Erro ao criar voucher:", error);

    if (error.message && error.message.includes('unique')) {
      return new Response(JSON.stringify({
        error: "Você já possui um voucher. Cada parceiro pode ter apenas um voucher."
      }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Erro interno do servidor" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// PUT - Atualizar voucher existente
export async function PUT(req) {
  try {
    const session = await getServerSession(options);

    if (!session || session.user.role !== 'parceiro') {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const parceiroId = session.user.id;
    const {
      titulo,
      descricao,
      condicoes,
      limite_uso
    } = await req.json();

    // Validações
    if (!titulo) {
      return new Response(JSON.stringify({
        error: "Título é obrigatório"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log(`🎫 Atualizando voucher do parceiro ${parceiroId}`);

    const updateQuery = `
      UPDATE vouchers
      SET
        titulo = $1,
        descricao = $2,
        condicoes = $3,
        limite_uso = $4,
        updated_at = NOW()
      WHERE parceiro_id = $5
      RETURNING *
    `;

    const updateParams = [
      titulo,
      descricao,
      condicoes,
      limite_uso || null,
      parceiroId
    ];

    const result = await pool.query(updateQuery, updateParams);

    if (result.rows.length === 0) {
      return new Response(JSON.stringify({
        error: "Voucher não encontrado. Crie um voucher primeiro."
      }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const voucher = result.rows[0];

    console.log(`✅ Voucher atualizado: ${voucher.titulo}`);

    return new Response(JSON.stringify({
      success: true,
      message: "Voucher atualizado com sucesso!",
      voucher
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ Erro ao atualizar voucher:", error);
    return new Response(JSON.stringify({ error: "Erro interno do servidor" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
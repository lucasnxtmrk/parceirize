import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const parceiroId = searchParams.get('parceiro_id');

    if (!parceiroId) {
      return new Response(JSON.stringify({ error: "parceiro_id é obrigatório" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log(`🎫 Buscando voucher do parceiro ${parceiroId} (cliente)`);

    const query = `
      SELECT
        v.id,
        v.codigo,
        v.titulo,
        v.tipo_desconto,
        v.valor_desconto,
        v.desconto,
        v.condicoes,
        v.limite_uso,
        v.utilizado,
        v.data_criacao,
        p.nome_empresa AS parceiro_nome,
        p.nicho AS parceiro_nicho,
        p.foto AS parceiro_foto
      FROM vouchers v
      INNER JOIN parceiros p ON v.parceiro_id = p.id
      WHERE v.parceiro_id = $1
    `;

    const result = await pool.query(query, [parceiroId]);

    console.log("🔍 Voucher encontrado:", result.rows);

    // Retornar voucher único ou null se não existir
    const voucher = result.rows.length > 0 ? result.rows[0] : null;

    return new Response(JSON.stringify(voucher), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ Erro ao buscar voucher:", error);
    return new Response(JSON.stringify({ error: "Erro interno ao buscar voucher" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
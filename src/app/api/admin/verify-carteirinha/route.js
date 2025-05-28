import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            return new Response(JSON.stringify({ error: "ID não informado" }), { status: 400 });
        }

        console.log(`🔎 Verificando ID da carteirinha: ${id}`);

        const result = await pool.query("SELECT id FROM clientes WHERE id_carteirinha = $1", [id]);

        return new Response(JSON.stringify({ exists: result.rows.length > 0 }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("❌ Erro ao verificar ID da carteirinha:", error);
        return new Response(JSON.stringify({ error: "Erro ao verificar ID da carteirinha." }), { status: 500 });
    }
}

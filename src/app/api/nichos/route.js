import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET() {
  try {
    console.log("📡 Buscando nichos no banco de dados...");

    const query = `
      SELECT DISTINCT nicho FROM parceiros WHERE nicho IS NOT NULL AND nicho != ''
    `;

    const result = await pool.query(query);

    console.log("🔍 Nichos encontrados:", result.rows);

    return new Response(JSON.stringify(result.rows), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Erro ao buscar nichos:", error);
    return new Response(JSON.stringify({ error: "Erro interno ao buscar nichos" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

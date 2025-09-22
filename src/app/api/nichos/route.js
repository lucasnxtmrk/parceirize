import { Pool } from "pg";
import { Nichos } from "@/data/nichos";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET() {
  try {
    console.log("📡 Buscando nichos no banco de dados...");

    const query = `
      SELECT nicho, COUNT(*) as count
      FROM parceiros
      WHERE nicho IS NOT NULL AND nicho != ''
      GROUP BY nicho
      ORDER BY count DESC
    `;

    const result = await pool.query(query);

    console.log("🔍 Nichos encontrados:", result.rows);

    // Mapear nichos para nomes legíveis
    const nichosFormatados = result.rows.map(row => {
      const nichoId = Number(row.nicho);
      const nichoData = Nichos.find(n => n.id === nichoId);

      return {
        nicho: nichoData ? nichoData.nome : row.nicho, // Se não encontrar, usa o valor original
        count: parseInt(row.count),
        original: row.nicho // Mantém o valor original para filtros
      };
    });

    return new Response(JSON.stringify(nichosFormatados), {
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

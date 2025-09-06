import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Categorias predefinidas - pode ser expandido futuramente
const CATEGORIAS_PADRAO = [
  { id: 1, nome: 'Alimentação' },
  { id: 2, nome: 'Saúde e Bem-estar' },
  { id: 3, nome: 'Beleza e Estética' },
  { id: 4, nome: 'Educação' },
  { id: 5, nome: 'Tecnologia' },
  { id: 6, nome: 'Vestuário e Moda' },
  { id: 7, nome: 'Casa e Decoração' },
  { id: 8, nome: 'Esportes e Lazer' },
  { id: 9, nome: 'Serviços Automotivos' },
  { id: 10, nome: 'Turismo e Viagens' },
  { id: 11, nome: 'Pet Shop' },
  { id: 12, nome: 'Farmácia e Drogaria' }
];

export async function GET() {
  try {
    // Retorna categorias predefinidas para simplicidade
    // No futuro pode buscar de uma tabela dedicada
    return new Response(JSON.stringify(CATEGORIAS_PADRAO), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Erro ao buscar categorias:", error);
    return new Response(JSON.stringify({ error: "Erro interno ao buscar categorias" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
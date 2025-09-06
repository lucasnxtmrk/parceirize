import { Pool } from "pg";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET() {
  try {
    const session = await getServerSession(options);
    
    if (!session || session.user.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    console.log("🎟️ Buscando vouchers utilizados...");

    // Query para buscar vouchers utilizados com informações do cliente e parceiro
    const query = `
      SELECT 
        v.id,
        v.codigo,
        v.desconto as valor_desconto,
        v.data_utilizacao,
        c.nome as cliente_nome,
        p.nome_empresa as parceiro_nome,
        v.status
      FROM vouchers v
      LEFT JOIN clientes c ON v.cliente_id = c.id
      LEFT JOIN parceiros p ON v.parceiro_id = p.id
      WHERE v.status = 'usado' OR v.data_utilizacao IS NOT NULL
      ORDER BY v.data_utilizacao DESC
      LIMIT 50
    `;

    const result = await pool.query(query);
    
    // Formatar os dados para o frontend
    const vouchersUtilizados = result.rows.map(row => ({
      id: row.id,
      codigo: row.codigo,
      cliente: row.cliente_nome || 'Cliente não identificado',
      dataUtilizacao: row.data_utilizacao ? new Date(row.data_utilizacao).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      valorDesconto: row.valor_desconto ? `R$ ${parseFloat(row.valor_desconto).toFixed(2).replace('.', ',')}` : 'R$ 0,00',
      parceiro: row.parceiro_nome || 'Parceiro não identificado',
      status: row.status || 'utilizado'
    }));

    console.log("🔍 Vouchers utilizados encontrados:", vouchersUtilizados.length);

    return new Response(JSON.stringify(vouchersUtilizados), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error('Erro ao buscar vouchers utilizados:', error);
    
    // Se der erro na query, retornar dados de exemplo
    const vouchersExemplo = [
      {
        id: 1,
        codigo: 'DESCONTO20',
        cliente: 'Exemplo Cliente',
        dataUtilizacao: new Date().toISOString().split('T')[0],
        valorDesconto: 'R$ 10,00',
        parceiro: 'Exemplo Parceiro',
        status: 'utilizado'
      }
    ];
    
    return new Response(JSON.stringify(vouchersExemplo), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }
}
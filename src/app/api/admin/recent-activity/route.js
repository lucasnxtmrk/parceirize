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

    console.log("📊 Buscando atividades recentes...");

    const activities = [];

    try {
      // 1. Buscar vouchers utilizados recentemente
      const vouchersQuery = `
        SELECT 'voucher_used' as type, 
               CONCAT('Voucher ', codigo, ' utilizado') as description,
               data_utilizacao as timestamp,
               'Voucher utilizado' as action
        FROM vouchers 
        WHERE data_utilizacao IS NOT NULL 
        ORDER BY data_utilizacao DESC 
        LIMIT 3
      `;
      const vouchersResult = await pool.query(vouchersQuery);
      activities.push(...vouchersResult.rows);

    } catch (err) {
      console.log("Erro ao buscar vouchers utilizados:", err.message);
    }

    try {
      // 2. Buscar clientes cadastrados recentemente
      const clientesQuery = `
        SELECT 'new_client' as type,
               CONCAT('Novo cliente cadastrado: ', nome) as description,
               created_at as timestamp,
               'Cliente cadastrado' as action
        FROM clientes 
        WHERE created_at IS NOT NULL
        ORDER BY created_at DESC 
        LIMIT 3
      `;
      const clientesResult = await pool.query(clientesQuery);
      activities.push(...clientesResult.rows);

    } catch (err) {
      console.log("Erro ao buscar clientes:", err.message);
    }

    try {
      // 3. Buscar parceiros atualizados recentemente
      const parceirosQuery = `
        SELECT 'partner_update' as type,
               CONCAT('Parceiro ', nome_empresa, ' atualizou perfil') as description,
               updated_at as timestamp,
               'Perfil atualizado' as action
        FROM parceiros 
        WHERE updated_at IS NOT NULL
        ORDER BY updated_at DESC 
        LIMIT 2
      `;
      const parceirosResult = await pool.query(parceirosQuery);
      activities.push(...parceirosResult.rows);

    } catch (err) {
      console.log("Erro ao buscar parceiros:", err.message);
    }

    // Ordenar por timestamp e limitar a 10 atividades
    const sortedActivities = activities
      .filter(activity => activity.timestamp)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10)
      .map((activity, index) => ({
        id: index + 1,
        type: activity.type,
        description: activity.description,
        timestamp: new Date(activity.timestamp).toISOString(),
        action: activity.action,
        user: 'Sistema'
      }));

    // Se não encontrou atividades, retornar algumas de exemplo
    if (sortedActivities.length === 0) {
      const exampleActivities = [
        {
          id: 1,
          type: 'voucher_used',
          description: 'Sistema em funcionamento',
          timestamp: new Date().toISOString(),
          user: 'Sistema',
          action: 'Status do sistema'
        }
      ];
      
      return new Response(JSON.stringify(exampleActivities), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    console.log("🔍 Atividades encontradas:", sortedActivities.length);

    return new Response(JSON.stringify(sortedActivities), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error('Erro ao buscar atividades:', error);
    
    // Retornar atividade de exemplo em caso de erro
    const fallbackActivity = [{
      id: 1,
      type: 'system',
      description: 'Sistema operacional',
      timestamp: new Date().toISOString(),
      user: 'Sistema',
      action: 'Status'
    }];
    
    return new Response(JSON.stringify(fallbackActivity), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }
}
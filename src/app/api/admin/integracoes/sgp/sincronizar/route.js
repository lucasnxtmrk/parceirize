import { Pool } from 'pg';
import { getServerSession } from 'next-auth';
import { options } from '@/app/api/auth/[...nextauth]/options';
import SGPSyncService from '@/lib/sgp-sync-service';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const sgpSync = new SGPSyncService();

async function getProvedor(email) {
  const r = await pool.query('SELECT id, email, tenant_id FROM provedores WHERE email = $1', [email]);
  return r.rows[0] || null;
}

async function getIntegracao(provedorId) {
  const r = await pool.query(
    `SELECT * FROM integracoes WHERE provedor_id = $1 AND tipo = 'SGP'`,
    [provedorId]
  );
  return r.rows[0] || null;
}

// Função para sincronizar automaticamente (será chamada pelo cron)
async function sincronizarAutomatico(provedorId) {
  return await sgpSync.sincronizarProvedor(provedorId, {
    buscar_apenas_alteracoes: true,
    incluir_novos_clientes: true,
    horas_alteracao: 24
  });
}


// GET: sincronização manual pelo provedor
export async function GET() {
  const session = await getServerSession(options);
  if (!session || !['provedor', 'superadmin'].includes(session.user.role)) {
    return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403 });
  }

  let provedor = null;
  if (session.user.role === 'provedor') {
    provedor = await getProvedor(session.user.email);
    if (!provedor) return new Response(JSON.stringify({ error: 'Provedor não encontrado' }), { status: 404 });
  } else {
    // SuperAdmin sincroniza para o primeiro provedor ativo
    const provedorResult = await pool.query('SELECT id FROM provedores WHERE ativo = true LIMIT 1');
    if (provedorResult.rows.length === 0) {
      return new Response(JSON.stringify({ error: 'Nenhum provedor ativo encontrado' }), { status: 404 });
    }
    provedor = provedorResult.rows[0];
  }

  const integracao = await getIntegracao(provedor.id);
  if (!integracao) return new Response(JSON.stringify({ error: 'Integração SGP não configurada' }), { status: 400 });

  try {
    // Usar novo serviço de sincronização com busca de alterações recentes
    const resultado = await sgpSync.sincronizarProvedor(provedor.id, {
      buscar_apenas_alteracoes: false, // Sincronização manual busca mais dados
      incluir_novos_clientes: true,
      horas_alteracao: 72 // Últimas 72h para sincronização manual
    });
    return new Response(JSON.stringify(resultado), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message,
      details: 'Falha na sincronização manual'
    }), { status: 502 });
  }
}

// POST: endpoint para cron automático (será usado pelo sistema)
export async function POST(req) {
  try {
    const { provedor_id } = await req.json();

    if (!provedor_id) {
      // Se não informou provedor_id, sincroniza todas as integrações ativas
      const resultados = await sgpSync.sincronizarTodos();
      return new Response(JSON.stringify({
        success: true,
        sincronizacoes: resultados
      }), { status: 200 });
    }

    // Sincronização específica de um provedor
    const resultado = await sincronizarAutomatico(provedor_id);
    return new Response(JSON.stringify(resultado), { status: 200 });

  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message,
      details: 'Falha na sincronização automática'
    }), { status: 500 });
  }
}
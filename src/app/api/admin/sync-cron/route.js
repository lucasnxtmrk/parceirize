import { Pool } from 'pg';
import { getServerSession } from 'next-auth';
import { options } from '@/app/api/auth/[...nextauth]/options';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Status global do cron (em produção, usar Redis ou banco)
let cronStatus = {
  running: false,
  lastRun: null,
  nextRun: null,
  intervalId: null
};

async function executarSincronizacao() {
  console.log('🔄 Executando sincronização SGP automática...');
  
  try {
    const integracoes = await pool.query(
      `SELECT provedor_id, subdominio, token, app_name
       FROM integracoes
       WHERE tipo = 'SGP'
       AND modo_ativacao = 'integracao'
       AND provedor_id IS NOT NULL`
    );
    
    let totalSincronizacoes = 0;
    
    for (const integracao of integracoes.rows) {
      try {
        const url = `https://${integracao.subdominio}.sgp.net.br/api/ura/clientes/`;
        const authBody = {
          token: integracao.token,
          app: integracao.app_name,
          omitir_contratos: false,
          limit: 100 // API SGP permite max 100
        };

        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(authBody)
        });
        
        if (!resp.ok) continue;
        
        const data = await resp.json();
        const clientes = data?.clientes || [];
        
        let ativados = 0, desativados = 0;
        
        for (const cliente of clientes) {
          const contratos = cliente?.contratos || [];
          
          for (const contrato of contratos) {
            const status = (contrato?.status || '').toString().toUpperCase();
            const cpfcnpj = cliente?.cpfcnpj;
            const email = cliente?.email;
            const loginEmail = email || (cpfcnpj ? `${cpfcnpj}@sgp.local` : null);
            
            if (!loginEmail) continue;

            const clienteCheck = await pool.query(
              'SELECT id, tipo_cliente FROM clientes WHERE email = $1', 
              [loginEmail]
            );
            
            if (clienteCheck.rows.length === 0) continue;
            
            const clienteExistente = clienteCheck.rows[0];

            // Atualizar cliente
            if (status === 'ATIVO') {
              const r = await pool.query('UPDATE clientes SET ativo = TRUE WHERE email = $1', [loginEmail]);
              if (r.rowCount > 0) ativados++;
            } else if (['SUSPENSO', 'CANCELADO', 'INATIVO'].includes(status)) {
              const r = await pool.query('UPDATE clientes SET ativo = FALSE WHERE email = $1', [loginEmail]);
              if (r.rowCount > 0) desativados++;
            }

            // Se cliente foi transformado em parceiro, sincronizar também a tabela parceiros
            if (clienteExistente.tipo_cliente === 'parceiro') {
              if (status === 'ATIVO') {
                await pool.query('UPDATE parceiros SET ativo = TRUE WHERE email = $1', [loginEmail]);
              } else if (['SUSPENSO', 'CANCELADO', 'INATIVO'].includes(status)) {
                await pool.query('UPDATE parceiros SET ativo = FALSE WHERE email = $1', [loginEmail]);
              }
            }
          }
        }

        // Atualizar timestamp
        await pool.query(
          `UPDATE integracoes SET last_sync = NOW() WHERE provedor_id = $1 AND tipo = 'SGP'`,
          [integracao.provedor_id]
        );

        totalSincronizacoes++;
        
      } catch (error) {
        console.error(`Erro na sincronização provedor_id ${integracao.provedor_id}:`, error.message);
      }
    }
    
    cronStatus.lastRun = new Date();
    console.log(`✅ Sincronização concluída: ${totalSincronizacoes} integrações processadas`);
    
  } catch (error) {
    console.error('❌ Erro na sincronização:', error);
  }
}

function iniciarCron() {
  if (cronStatus.running) return;
  
  const OITO_HORAS_MS = 8 * 60 * 60 * 1000;
  
  cronStatus.running = true;
  cronStatus.intervalId = setInterval(executarSincronizacao, OITO_HORAS_MS);
  cronStatus.nextRun = new Date(Date.now() + OITO_HORAS_MS);
  
  console.log('🚀 Cron SGP iniciado - execuções a cada 8 horas');
}

function pararCron() {
  if (cronStatus.intervalId) {
    clearInterval(cronStatus.intervalId);
    cronStatus.intervalId = null;
  }
  cronStatus.running = false;
  cronStatus.nextRun = null;
  
  console.log('🛑 Cron SGP parado');
}

// GET: Status do cron
export async function GET() {
  const session = await getServerSession(options);
  if (!session || session.user.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403 });
  }

  return new Response(JSON.stringify({
    running: cronStatus.running,
    lastRun: cronStatus.lastRun,
    nextRun: cronStatus.nextRun
  }), { status: 200 });
}

// POST: Controlar cron (start/stop)
export async function POST(req) {
  const session = await getServerSession(options);
  if (!session || session.user.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403 });
  }

  const { action } = await req.json();
  
  if (action === 'start') {
    iniciarCron();
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Cron iniciado',
      status: cronStatus
    }), { status: 200 });
  }
  
  if (action === 'stop') {
    pararCron();
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Cron parado',
      status: cronStatus
    }), { status: 200 });
  }
  
  if (action === 'run_now') {
    await executarSincronizacao();
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Sincronização executada manualmente',
      status: cronStatus
    }), { status: 200 });
  }
  
  return new Response(JSON.stringify({ error: 'Ação inválida' }), { status: 400 });
}
import { Pool } from 'pg';
import { getServerSession } from 'next-auth';
import { options } from '@/app/api/auth/[...nextauth]/options';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function getAdmin(email) {
  const r = await pool.query('SELECT id, email FROM admins WHERE email = $1', [email]);
  return r.rows[0] || null;
}

async function getIntegracao(adminId) {
  const r = await pool.query(
    `SELECT * FROM integracoes WHERE admin_id = $1 AND tipo = 'SGP'`,
    [adminId]
  );
  return r.rows[0] || null;
}

// Função para sincronizar automaticamente (será chamada pelo cron)
async function sincronizarAutomatico(adminId) {
  const integracao = await getIntegracao(adminId);
  if (!integracao || (integracao.modo_ativacao || 'manual') !== 'integracao') {
    return { skipped: true, motivo: 'Modo de ativação não é integração' };
  }

  return await executarSincronizacao(integracao, adminId);
}

async function executarSincronizacao(integracao, adminId) {
  const url = `https://${integracao.subdominio}.sgp.net.br/api/clientes`;
  
  if (!integracao.token || !integracao.app_name) {
    throw new Error('Configuração incompleta: é necessário Token + App para listar clientes');
  }
  
  const authBody = {
    token: integracao.token,
    app: integracao.app_name,
    omitir_contratos: false,
    limit: 500
  };

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(authBody),
    cache: 'no-store',
  });
  
  if (!resp.ok) {
    throw new Error(`Falha ao consultar SGP: ${resp.status} ${resp.statusText}`);
  }
  
  const data = await resp.json();
  const clientes = data?.clientes || [];

  let ativados = 0;
  let desativados = 0;
  const errosDetalhados = [];
  
  for (const cliente of clientes) {
    const contratos = cliente?.contratos || [];
    
    for (const contrato of contratos) {
      const status = (contrato?.status || '').toString().toUpperCase();
      const cpfcnpj = cliente?.cpfcnpj;
      const email = cliente?.email;
      const loginEmail = email || (cpfcnpj ? `${cpfcnpj}@sgp.local` : null);
      
      if (!loginEmail) continue;

      try {
        // Verifica se cliente existe
        const clienteCheck = await pool.query(
          'SELECT id, tipo_cliente FROM clientes WHERE email = $1', 
          [loginEmail]
        );
        
        if (clienteCheck.rows.length === 0) continue; // Cliente não existe, pula
        
        const clienteExistente = clienteCheck.rows[0];

        // Atualizar cliente
        if (status === 'ATIVO') {
          const r = await pool.query('UPDATE clientes SET ativo = TRUE WHERE email = $1', [loginEmail]);
          if (r.rowCount > 0) ativados += r.rowCount;
        } else if (['SUSPENSO', 'CANCELADO', 'INATIVO'].includes(status)) {
          const r = await pool.query('UPDATE clientes SET ativo = FALSE WHERE email = $1', [loginEmail]);
          if (r.rowCount > 0) desativados += r.rowCount;
        }

        // Se cliente foi transformado em parceiro, sincronizar também a tabela parceiros
        if (clienteExistente.tipo_cliente === 'parceiro') {
          if (status === 'ATIVO') {
            await pool.query('UPDATE parceiros SET ativo = TRUE WHERE email = $1', [loginEmail]);
          } else if (['SUSPENSO', 'CANCELADO', 'INATIVO'].includes(status)) {
            await pool.query('UPDATE parceiros SET ativo = FALSE WHERE email = $1', [loginEmail]);
          }
        }
      } catch (dbError) {
        errosDetalhados.push(`Erro ao atualizar ${loginEmail}: ${dbError.message}`);
      }
    }
  }

  // Atualiza timestamp da última sincronização
  await pool.query(
    `UPDATE integracoes SET last_sync = NOW() WHERE admin_id = $1 AND tipo = 'SGP'`,
    [adminId]
  );

  return { 
    success: true, 
    ativados, 
    desativados,
    erros: errosDetalhados.length > 0 ? errosDetalhados : null
  };
}

// GET: sincronização manual pelo admin
export async function GET() {
  const session = await getServerSession(options);
  if (!session || session.user.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403 });
  }

  const admin = await getAdmin(session.user.email);
  if (!admin) return new Response(JSON.stringify({ error: 'Admin não encontrado' }), { status: 404 });

  const integracao = await getIntegracao(admin.id);
  if (!integracao) return new Response(JSON.stringify({ error: 'Integração SGP não configurada' }), { status: 400 });

  try {
    const resultado = await executarSincronizacao(integracao, admin.id);
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
    const { admin_id } = await req.json();
    
    if (!admin_id) {
      // Se não informou admin_id, sincroniza todas as integrações ativas
      const integracoes = await pool.query(
        `SELECT admin_id FROM integracoes WHERE tipo = 'SGP' AND modo_ativacao = 'integracao'`
      );
      
      const resultados = [];
      for (const integracao of integracoes.rows) {
        try {
          const resultado = await sincronizarAutomatico(integracao.admin_id);
          resultados.push({ admin_id: integracao.admin_id, resultado });
        } catch (error) {
          resultados.push({ 
            admin_id: integracao.admin_id, 
            erro: error.message 
          });
        }
      }
      
      return new Response(JSON.stringify({ 
        success: true, 
        sincronizacoes: resultados 
      }), { status: 200 });
    }
    
    // Sincronização específica de um admin
    const resultado = await sincronizarAutomatico(admin_id);
    return new Response(JSON.stringify(resultado), { status: 200 });
    
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: error.message, 
      details: 'Falha na sincronização automática' 
    }), { status: 500 });
  }
}
import { Pool } from 'pg';
import { getServerSession } from 'next-auth';
import { options } from '@/app/api/auth/[...nextauth]/options';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function getParceiro(email) {
  const r = await pool.query('SELECT id, email FROM parceiros WHERE email = $1', [email]);
  return r.rows[0] || null;
}

async function getIntegracao(parceiroId) {
  const r = await pool.query(
    `SELECT * FROM integracoes WHERE parceiro_id = $1 AND tipo = 'SGP'`,
    [parceiroId]
  );
  return r.rows[0] || null;
}

function idFromContrato(c) {
  const email = c?.email || c?.cliente?.email || c?.clienteEmail || null;
  const cpf = c?.cpf || c?.cliente?.cpf || c?.cpfCliente || null;
  const loginEmail = email || (cpf ? `${cpf}@sgp.local` : null);
  return loginEmail;
}

export async function GET() {
  const session = await getServerSession(options);
  if (!session || session.user.role !== 'parceiro') {
    return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403 });
  }

  const parceiro = await getParceiro(session.user.email);
  if (!parceiro) return new Response(JSON.stringify({ error: 'Parceiro não encontrado' }), { status: 404 });

  const integracao = await getIntegracao(parceiro.id);
  if (!integracao) return new Response(JSON.stringify({ error: 'Integração SGP não configurada' }), { status: 400 });

  if ((integracao.modo_ativacao || 'manual') !== 'integracao') {
    return new Response(JSON.stringify({ skipped: true, motivo: 'Modo de ativação não é integracao' }), { status: 200 });
  }

  const url = `https://${integracao.subdominio}.sgp.net.br/api/clientes`;
  // Para listar todos os clientes, usar apenas autenticação por Token + App
  if (!integracao.token || !integracao.app_name) {
    return new Response(JSON.stringify({ 
      error: 'Configuração incompleta: é necessário Token + App para listar clientes' 
    }), { status: 400 });
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
    return new Response(JSON.stringify({ error: 'Falha ao consultar SGP', status: resp.status }), { status: 502 });
  }
  const data = await resp.json();
  const clientes = data?.clientes || [];

  let ativados = 0;
  let desativados = 0;
  
  for (const cliente of clientes) {
    const contratos = cliente?.contratos || [];
    
    for (const contrato of contratos) {
      const status = (contrato?.status || '').toString().toUpperCase();
      const cpfcnpj = cliente?.cpfcnpj;
      const email = cliente?.email;
      const loginEmail = email || (cpfcnpj ? `${cpfcnpj}@sgp.local` : null);
      
      if (!loginEmail) continue;

      if (status === 'ATIVO') {
        const r = await pool.query('UPDATE clientes SET ativo = TRUE WHERE email = $1', [loginEmail]);
        if (r.rowCount > 0) ativados += r.rowCount;
      } else if (['SUSPENSO', 'CANCELADO', 'INATIVO'].includes(status)) {
        const r = await pool.query('UPDATE clientes SET ativo = FALSE WHERE email = $1', [loginEmail]);
        if (r.rowCount > 0) desativados += r.rowCount;
      }
    }
  }

  return new Response(JSON.stringify({ success: true, ativados, desativados }), { status: 200 });
}


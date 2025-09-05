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

  const url = `https://${integracao.subdominio}.sgp.net.br/api/contratos`;
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${integracao.token}` },
    cache: 'no-store',
  });
  if (!resp.ok) {
    return new Response(JSON.stringify({ error: 'Falha ao consultar SGP', status: resp.status }), { status: 502 });
  }
  const contratos = await resp.json();

  let ativados = 0;
  let desativados = 0;
  for (const c of (Array.isArray(contratos) ? contratos : [])) {
    const status = (c?.status || c?.situacao || '').toString().toUpperCase();
    const loginEmail = idFromContrato(c);
    if (!loginEmail) continue;

    if (status === 'ATIVO') {
      const r = await pool.query('UPDATE clientes SET ativo = TRUE WHERE email = $1', [loginEmail]);
      if (r.rowCount > 0) ativados += r.rowCount;
    } else if (['SUSPENSO', 'CANCELADO', 'INATIVO'].includes(status)) {
      const r = await pool.query('UPDATE clientes SET ativo = FALSE WHERE email = $1', [loginEmail]);
      if (r.rowCount > 0) desativados += r.rowCount;
    }
  }

  return new Response(JSON.stringify({ success: true, ativados, desativados }), { status: 200 });
}


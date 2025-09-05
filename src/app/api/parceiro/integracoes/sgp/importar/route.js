import { Pool } from 'pg';
import { getServerSession } from 'next-auth';
import { options } from '@/app/api/auth/[...nextauth]/options';
import bcrypt from 'bcryptjs';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function getParceiro(email) {
  const r = await pool.query('SELECT id, email, nome_empresa FROM parceiros WHERE email = $1', [email]);
  return r.rows[0] || null;
}

async function getIntegracao(parceiroId) {
  const r = await pool.query(
    `SELECT * FROM integracoes WHERE parceiro_id = $1 AND tipo = 'SGP'`,
    [parceiroId]
  );
  return r.rows[0] || null;
}

function pickIdentifier(contract) {
  const email = contract?.email || contract?.cliente?.email || contract?.clienteEmail || null;
  const cpf = contract?.cpf || contract?.cliente?.cpf || contract?.cpfCliente || null;
  return { email, cpf };
}

function pickName(contract) {
  return (
    contract?.cliente?.nome || contract?.nomeCliente || contract?.nome || 'Cliente SGP'
  );
}

export async function POST(req) {
  const session = await getServerSession(options);
  if (!session || session.user.role !== 'parceiro') {
    return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403 });
  }

  const parceiro = await getParceiro(session.user.email);
  if (!parceiro) return new Response(JSON.stringify({ error: 'Parceiro não encontrado' }), { status: 404 });

  const integracao = await getIntegracao(parceiro.id);
  if (!integracao) return new Response(JSON.stringify({ error: 'Integração SGP não configurada' }), { status: 400 });

  const { senha_padrao } = await req.json();
  if (!senha_padrao || senha_padrao.length < 6) {
    return new Response(JSON.stringify({ error: 'Senha padrão inválida (mín. 6 caracteres)' }), { status: 400 });
  }

  // Busca contratos no SGP
  const url = `https://${integracao.subdominio}.sgp.net.br/api/contratos`;
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${integracao.token}` },
    cache: 'no-store',
  });
  if (!resp.ok) {
    return new Response(JSON.stringify({ error: 'Falha ao consultar SGP', status: resp.status }), { status: 502 });
  }
  const contratos = await resp.json();

  const ativos = (Array.isArray(contratos) ? contratos : []).filter(
    (c) => (c?.status || c?.situacao || '').toString().toUpperCase() === 'ATIVO'
  );

  const senhaHash = await bcrypt.hash(senha_padrao, 10);

  let criados = 0;
  let atualizados = 0;
  for (const c of ativos) {
    const { email, cpf } = pickIdentifier(c);
    if (!email && !cpf) continue;
    const loginEmail = email || (cpf ? `${cpf}@sgp.local` : null);
    if (!loginEmail) continue;

    const nomeCompleto = pickName(c);
    let nome = nomeCompleto;
    let sobrenome = '';
    if (nomeCompleto && typeof nomeCompleto === 'string' && nomeCompleto.includes(' ')) {
      const parts = nomeCompleto.split(' ');
      nome = parts.shift();
      sobrenome = parts.join(' ');
    }

    // Se modo integracao, respeita status do contrato; se manual, ativa por padrão
    const ativo = (integracao.modo_ativacao === 'integracao') ? true : true;
    // Mesmo em modo manual só importamos contratos ATIVOS, conforme requisito

    const sel = await pool.query('SELECT id FROM clientes WHERE email = $1', [loginEmail]);
    if (sel.rows.length === 0) {
      // criar id_carteirinha único simples
      const idCarteirinha = (Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 4)).toUpperCase().slice(0, 6);
      await pool.query(
        `INSERT INTO clientes (nome, sobrenome, email, senha, id_carteirinha, ativo, data_criacao)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [nome || 'Cliente', sobrenome || '', loginEmail, senhaHash, idCarteirinha, ativo]
      );
      criados++;
    } else {
      await pool.query(
        `UPDATE clientes SET ativo = $1 WHERE email = $2`,
        [ativo, loginEmail]
      );
      atualizados++;
    }
  }

  return new Response(JSON.stringify({ success: true, criados, atualizados, totalProcessados: ativos.length }), { status: 200 });
}


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

  // Busca clientes no SGP usando endpoint correto
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
    const errorText = await resp.text();
    return new Response(JSON.stringify({ 
      error: 'Falha ao consultar SGP', 
      status: resp.status,
      statusText: resp.statusText,
      details: errorText,
      url: url
    }), { status: 502 });
  }
  const data = await resp.json();
  const clientesSGP = data?.clientes || [];

  const senhaHash = await bcrypt.hash(senha_padrao, 10);

  let criados = 0;
  let atualizados = 0;
  let totalProcessados = 0;

  for (const clienteSGP of clientesSGP) {
    const contratos = clienteSGP?.contratos || [];
    
    // Verifica se tem pelo menos um contrato ativo
    const temContratoAtivo = contratos.some(c => 
      (c?.status || '').toString().toUpperCase() === 'ATIVO'
    );
    
    if (!temContratoAtivo) continue;
    
    totalProcessados++;

    const cpfcnpj = clienteSGP?.cpfcnpj;
    const email = clienteSGP?.email;
    const loginEmail = email || (cpfcnpj ? `${cpfcnpj}@sgp.local` : null);
    
    if (!loginEmail) continue;

    const nomeCompleto = clienteSGP?.nome || 'Cliente SGP';
    let nome = nomeCompleto;
    let sobrenome = '';
    if (nomeCompleto && typeof nomeCompleto === 'string' && nomeCompleto.includes(' ')) {
      const parts = nomeCompleto.split(' ');
      nome = parts.shift();
      sobrenome = parts.join(' ');
    }

    // Se modo integracao, respeita status do contrato; se manual, ativa por padrão
    const ativo = (integracao.modo_ativacao === 'integracao') ? temContratoAtivo : true;

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

  return new Response(JSON.stringify({ success: true, criados, atualizados, totalProcessados }), { status: 200 });
}


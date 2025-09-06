import { Pool } from 'pg';
import { getServerSession } from 'next-auth';
import { options } from '@/app/api/auth/[...nextauth]/options';
import bcrypt from 'bcryptjs';

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

export async function POST(req) {
  const session = await getServerSession(options);
  if (!session || session.user.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403 });
  }

  const admin = await getAdmin(session.user.email);
  if (!admin) return new Response(JSON.stringify({ error: 'Admin não encontrado' }), { status: 404 });

  const integracao = await getIntegracao(admin.id);
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
  const errosDetalhados = [];

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
    
    if (!loginEmail) {
      errosDetalhados.push(`Cliente ${clienteSGP?.nome || 'sem nome'} não possui email nem CPF válido`);
      continue;
    }

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

    try {
      const sel = await pool.query('SELECT id, tipo_cliente FROM clientes WHERE email = $1', [loginEmail]);
      if (sel.rows.length === 0) {
        // Criar novo cliente
        const idCarteirinha = (Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 4)).toUpperCase().slice(0, 6);
        await pool.query(
          `INSERT INTO clientes (nome, sobrenome, email, senha, id_carteirinha, ativo, tipo_cliente, data_criacao)
           VALUES ($1, $2, $3, $4, $5, $6, 'cliente', NOW())`,
          [nome || 'Cliente', sobrenome || '', loginEmail, senhaHash, idCarteirinha, ativo]
        );
        criados++;
      } else {
        const clienteExistente = sel.rows[0];
        // Verifica se já não é parceiro para evitar sobrescrever
        if (clienteExistente.tipo_cliente === 'parceiro') {
          errosDetalhados.push(`Cliente ${loginEmail} já é parceiro - não atualizado`);
          continue;
        }
        
        await pool.query(
          `UPDATE clientes SET ativo = $1 WHERE email = $2`,
          [ativo, loginEmail]
        );
        atualizados++;
      }
    } catch (dbError) {
      errosDetalhados.push(`Erro ao processar ${loginEmail}: ${dbError.message}`);
    }
  }

  // Atualiza timestamp da última sincronização
  await pool.query(
    `UPDATE integracoes SET last_sync = NOW() WHERE admin_id = $1 AND tipo = 'SGP'`,
    [admin.id]
  );

  return new Response(JSON.stringify({ 
    success: true, 
    criados, 
    atualizados, 
    totalProcessados,
    erros: errosDetalhados.length > 0 ? errosDetalhados : null
  }), { status: 200 });
}
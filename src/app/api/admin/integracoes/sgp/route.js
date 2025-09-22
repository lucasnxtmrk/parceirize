import { Pool } from 'pg';
import { getServerSession } from 'next-auth';
import { options } from '@/app/api/auth/[...nextauth]/options';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function getProvedorByEmail(email) {
  const q = 'SELECT id, email, tenant_id FROM provedores WHERE email = $1';
  const r = await pool.query(q, [email]);
  return r.rows[0] || null;
}

// GET: retorna config atual do SGP para o admin logado
export async function GET() {
  const session = await getServerSession(options);
  if (!session || !['provedor', 'superadmin'].includes(session.user.role)) {
    return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403 });
  }

  // SuperAdmin pode acessar qualquer configuração, provedor apenas a sua
  let provedor = null;
  if (session.user.role === 'provedor') {
    provedor = await getProvedorByEmail(session.user.email);
    if (!provedor) {
      return new Response(JSON.stringify({ error: 'Provedor não encontrado' }), { status: 404 });
    }
  }

  // Buscar configuração do SGP
  let q, params;
  if (session.user.role === 'superadmin') {
    // SuperAdmin pode ver todas as configurações (para debug/suporte)
    q = `SELECT id, tipo, subdominio, token, app_name, cpf_central, senha_central, modo_ativacao, created_at, last_sync
         FROM integracoes WHERE tipo = 'SGP' LIMIT 1`;
    params = [];
  } else {
    // Provedor vê apenas a sua configuração
    q = `SELECT id, tipo, subdominio, token, app_name, cpf_central, senha_central, modo_ativacao, created_at, last_sync
         FROM integracoes WHERE provedor_id = $1 AND tipo = 'SGP'`;
    params = [provedor.id];
  }

  const r = await pool.query(q, params);
  const config = r.rows[0] || null;

  return new Response(JSON.stringify({ 
    config, 
    lastSync: config?.last_sync 
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

// POST: salva/atualiza config do SGP (subdominio, token, modo_ativacao)
export async function POST(req) {
  try {
    const session = await getServerSession(options);
    if (!session || !['provedor', 'superadmin'].includes(session.user.role)) {
      return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403 });
    }

  // SuperAdmin pode configurar para qualquer provedor, provedor apenas para si
  let provedor = null;
  if (session.user.role === 'provedor') {
    provedor = await getProvedorByEmail(session.user.email);
    if (!provedor) {
      return new Response(JSON.stringify({ error: 'Provedor não encontrado' }), { status: 404 });
    }
  } else {
    // SuperAdmin precisa especificar qual provedor está configurando
    // Por enquanto, vamos assumir que é para o primeiro provedor ativo
    const provedorResult = await pool.query('SELECT id FROM provedores WHERE ativo = true LIMIT 1');
    if (provedorResult.rows.length === 0) {
      return new Response(JSON.stringify({ error: 'Nenhum provedor ativo encontrado' }), { status: 404 });
    }
    provedor = provedorResult.rows[0];
  }

  const { subdominio, token, app_name, cpf_central, senha_central, modo_ativacao } = await req.json();

  // Permite atualização parcial
  if (!subdominio && !token && !app_name && !cpf_central && !senha_central && !modo_ativacao) {
    return new Response(JSON.stringify({ error: 'Nada para atualizar' }), { status: 400 });
  }

  // Verifica se já existe
  const sel = await pool.query(
    `SELECT id FROM integracoes WHERE provedor_id = $1 AND tipo = 'SGP'`,
    [provedor.id]
  );

  if (sel.rows.length > 0) {
    // update
    const fields = [];
    const params = [];
    let idx = 1;
    if (subdominio) { fields.push(`subdominio = $${idx++}`); params.push(subdominio); }
    if (token)      { fields.push(`token = $${idx++}`); params.push(token); }
    if (app_name)   { fields.push(`app_name = $${idx++}`); params.push(app_name); }
    if (cpf_central) { fields.push(`cpf_central = $${idx++}`); params.push(cpf_central); }
    if (senha_central) { fields.push(`senha_central = $${idx++}`); params.push(senha_central); }
    if (modo_ativacao) { fields.push(`modo_ativacao = $${idx++}`); params.push(modo_ativacao); }
    params.push(provedor.id);
    const sql = `UPDATE integracoes SET ${fields.join(', ')} WHERE provedor_id = $${idx} AND tipo = 'SGP' RETURNING *`;
    const up = await pool.query(sql, params);
    return new Response(JSON.stringify({ success: true, config: up.rows[0] }), { status: 200 });
  }

  // insert - valida campos obrigatórios
  if (!subdominio) {
    return new Response(JSON.stringify({ error: 'Subdomínio é obrigatório' }), { status: 400 });
  }
  
  if (!token || !app_name) {
    return new Response(JSON.stringify({ 
      error: 'Token e Nome da Aplicação são obrigatórios' 
    }), { status: 400 });
  }
  
  const ins = await pool.query(
    `INSERT INTO integracoes (provedor_id, tipo, subdominio, token, app_name, cpf_central, senha_central, modo_ativacao)
     VALUES ($1, 'SGP', $2, $3, $4, $5, $6, COALESCE($7, 'manual'))
     RETURNING *`,
    [provedor.id, subdominio, token, app_name, cpf_central, senha_central, modo_ativacao]
  );
  return new Response(JSON.stringify({ success: true, config: ins.rows[0] }), { status: 201 });

  } catch (error) {
    console.error('Erro na API de configuração SGP:', error);
    return new Response(JSON.stringify({
      error: 'Erro interno do servidor',
      details: error.message
    }), { status: 500 });
  }
}
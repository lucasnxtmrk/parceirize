import { Pool } from 'pg';
import { getServerSession } from 'next-auth';
import { options } from '@/app/api/auth/[...nextauth]/options';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function getParceiroByEmail(email) {
  const q = 'SELECT id, email FROM parceiros WHERE email = $1';
  const r = await pool.query(q, [email]);
  return r.rows[0] || null;
}

// GET: retorna config atual do SGP para o parceiro logado
export async function GET() {
  const session = await getServerSession(options);
  if (!session || session.user.role !== 'parceiro') {
    return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403 });
  }

  const parceiro = await getParceiroByEmail(session.user.email);
  if (!parceiro) {
    return new Response(JSON.stringify({ error: 'Parceiro não encontrado' }), { status: 404 });
  }

  const q = `SELECT id, parceiro_id, tipo, subdominio, token, modo_ativacao, created_at
             FROM integracoes WHERE parceiro_id = $1 AND tipo = 'SGP'`;
  const r = await pool.query(q, [parceiro.id]);
  const config = r.rows[0] || null;

  return new Response(JSON.stringify({ config }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

// POST: salva/atualiza config do SGP (subdominio, token, modo_ativacao)
export async function POST(req) {
  const session = await getServerSession(options);
  if (!session || session.user.role !== 'parceiro') {
    return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403 });
  }

  const parceiro = await getParceiroByEmail(session.user.email);
  if (!parceiro) {
    return new Response(JSON.stringify({ error: 'Parceiro não encontrado' }), { status: 404 });
  }

  const { subdominio, token, modo_ativacao } = await req.json();

  // Permite atualização parcial do modo_ativacao pela página de perfil
  if (!subdominio && !token && !modo_ativacao) {
    return new Response(JSON.stringify({ error: 'Nada para atualizar' }), { status: 400 });
  }

  // Verifica se já existe
  const sel = await pool.query(
    `SELECT id FROM integracoes WHERE parceiro_id = $1 AND tipo = 'SGP'`,
    [parceiro.id]
  );

  if (sel.rows.length > 0) {
    // update
    const fields = [];
    const params = [];
    let idx = 1;
    if (subdominio) { fields.push(`subdominio = $${idx++}`); params.push(subdominio); }
    if (token)      { fields.push(`token = $${idx++}`); params.push(token); }
    if (modo_ativacao) { fields.push(`modo_ativacao = $${idx++}`); params.push(modo_ativacao); }
    params.push(parceiro.id);
    const sql = `UPDATE integracoes SET ${fields.join(', ')} WHERE parceiro_id = $${idx} AND tipo = 'SGP' RETURNING *`;
    const up = await pool.query(sql, params);
    return new Response(JSON.stringify({ success: true, config: up.rows[0] }), { status: 200 });
  }

  // insert
  if (!subdominio || !token) {
    return new Response(JSON.stringify({ error: 'subdominio e token são obrigatórios na criação' }), { status: 400 });
  }
  const ins = await pool.query(
    `INSERT INTO integracoes (parceiro_id, tipo, subdominio, token, modo_ativacao)
     VALUES ($1, 'SGP', $2, $3, COALESCE($4, 'manual'))
     RETURNING *`,
    [parceiro.id, subdominio, token, modo_ativacao]
  );
  return new Response(JSON.stringify({ success: true, config: ins.rows[0] }), { status: 201 });
}


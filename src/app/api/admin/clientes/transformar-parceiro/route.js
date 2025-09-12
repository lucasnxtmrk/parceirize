import { Pool } from "pg";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";
import { validatePlanLimits } from "@/lib/tenant-helper";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function POST(req) {
  try {
    const session = await getServerSession(options);
    if (!session || !["provedor", "superadmin"].includes(session.user.role)) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), { status: 403 });
    }

    const { cliente_id, categoria_id, nome_empresa, descricao } = await req.json();
    
    if (!cliente_id || !categoria_id || !nome_empresa) {
      return new Response(JSON.stringify({ error: "Cliente ID, categoria e nome da empresa são obrigatórios" }), { status: 400 });
    }

    // Começar transação
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // 1. Verificar se cliente existe e não é já um parceiro
      const clienteCheck = await client.query(
        'SELECT id, nome, sobrenome, email, senha, tipo_cliente FROM clientes WHERE id = $1',
        [cliente_id]
      );

      if (clienteCheck.rows.length === 0) {
        throw new Error('Cliente não encontrado');
      }

      const cliente = clienteCheck.rows[0];
      if (cliente.tipo_cliente === 'parceiro') {
        throw new Error('Cliente já foi transformado em parceiro');
      }

      // 2. Verificar se categoria é válida (1-12)
      if (categoria_id < 1 || categoria_id > 12) {
        throw new Error('Categoria inválida');
      }

      // 3. Verificar se já existe parceiro com mesmo email
      const parceiroExistente = await client.query(
        'SELECT id FROM parceiros WHERE email = $1',
        [cliente.email]
      );

      if (parceiroExistente.rows.length > 0) {
        throw new Error('Já existe um parceiro com este email');
      }

      // Verificar limite do plano antes de criar parceiro (apenas para provedores)
      if (session.user.role === 'provedor') {
        await validatePlanLimits(session.user.tenant_id, 'parceiros');
      }

      // 4. Criar registro na tabela parceiros
      const parceiroResult = await client.query(
        `INSERT INTO parceiros 
         (nome_empresa, email, senha, nicho, descricao, ativo, data_criacao, tenant_id) 
         VALUES ($1, $2, $3, $4, $5, TRUE, NOW(), $6) 
         RETURNING id`,
        [nome_empresa, cliente.email, cliente.senha, categoria_id, descricao || '', session.user.tenant_id || null]
      );

      const parceiroId = parceiroResult.rows[0].id;

      // 5. Atualizar tipo_cliente na tabela clientes
      await client.query(
        'UPDATE clientes SET tipo_cliente = $1 WHERE id = $2',
        ['parceiro', cliente_id]
      );

      await client.query('COMMIT');

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Cliente transformado em parceiro com sucesso',
        parceiro_id: parceiroId
      }), { status: 200 });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error("❌ Erro ao transformar cliente em parceiro:", error);
    return new Response(JSON.stringify({ 
      error: error.message || "Erro interno ao transformar cliente." 
    }), { status: 500 });
  }
}
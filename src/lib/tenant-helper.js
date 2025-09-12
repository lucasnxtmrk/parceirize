import { headers } from 'next/headers';
import { getServerSession } from 'next-auth';
import { options } from '@/app/api/auth/[...nextauth]/options';

/**
 * Helper para isolamento multi-tenant
 * Garante que todas as queries sejam filtradas por tenant_id
 */

// Obter tenant_id da sessão ou headers
export async function getTenantContext() {
  try {
    // Buscar sessão atual
    const session = await getServerSession(options);
    
    if (!session) {
      throw new Error('Usuário não autenticado');
    }

    // SuperAdmin tem acesso a todos os tenants
    if (session.user.role === 'superadmin') {
      return {
        user: session.user,
        tenant_id: null, // null = acesso global
        role: 'superadmin',
        isGlobalAccess: true
      };
    }

    // Outros usuários devem ter tenant_id
    const tenant_id = session.user.tenant_id;
    
    if (!tenant_id) {
      throw new Error('Tenant ID não encontrado na sessão');
    }

    return {
      user: session.user,
      tenant_id,
      role: session.user.role,
      isGlobalAccess: false
    };

  } catch (error) {
    console.error('Erro ao obter contexto do tenant:', error);
    throw error;
  }
}

// Adicionar filtro de tenant em queries SQL
export function addTenantFilter(baseQuery, tenantId, tableAlias = '') {
  if (!tenantId) {
    // SuperAdmin - sem filtro
    return baseQuery;
  }

  const prefix = tableAlias ? `${tableAlias}.` : '';
  const hasWhere = baseQuery.toLowerCase().includes('where');
  
  if (hasWhere) {
    return `${baseQuery} AND ${prefix}tenant_id = '${tenantId}'`;
  } else {
    return `${baseQuery} WHERE ${prefix}tenant_id = '${tenantId}'`;
  }
}

// Validar limites do plano
export async function validatePlanLimits(tenantId, type, currentCount) {
  if (!tenantId) return true; // SuperAdmin sem limites

  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Buscar limites do plano
    const planQuery = `
      SELECT pl.limite_clientes, pl.limite_parceiros, pl.limite_vouchers, pl.limite_produtos
      FROM provedores p
      JOIN planos pl ON p.plano_id = pl.id
      WHERE p.tenant_id = $1 AND p.ativo = true
    `;

    const result = await pool.query(planQuery, [tenantId]);
    
    if (result.rows.length === 0) {
      throw new Error('Plano não encontrado ou provedor inativo');
    }

    const limits = result.rows[0];
    
    // Verificar limite específico
    let limit = null;
    switch (type) {
      case 'clientes':
        limit = limits.limite_clientes;
        break;
      case 'parceiros':
        limit = limits.limite_parceiros;
        break;
      case 'vouchers':
        limit = limits.limite_vouchers;
        break;
      case 'produtos':
        limit = limits.limite_produtos;
        break;
    }

    // NULL significa ilimitado
    if (limit === null) return true;
    
    // Verificar se excedeu o limite
    if (currentCount >= limit) {
      throw new Error(`Limite do plano atingido: máximo ${limit} ${type} permitidos`);
    }

    return true;

  } catch (error) {
    console.error('Erro ao validar limite do plano:', error);
    throw error;
  }
}

// Verificar permissões específicas
export function checkTenantPermission(userTenantId, resourceTenantId, userRole) {
  // SuperAdmin tem acesso total
  if (userRole === 'superadmin') {
    return true;
  }

  // Usuários só acessam dados do próprio tenant
  return userTenantId === resourceTenantId;
}

// Wrapper para APIs com isolamento automático
export function withTenantIsolation(handler) {
  return async (request, context = {}) => {
    try {
      // Obter contexto do tenant
      const tenantContext = await getTenantContext();
      
      // Adicionar ao contexto da requisição
      context.tenant = tenantContext;
      
      // Executar handler original
      return await handler(request, context);
      
    } catch (error) {
      console.error('Erro no isolamento de tenant:', error);
      
      if (error.message === 'Usuário não autenticado') {
        return new Response(
          JSON.stringify({ error: 'Acesso negado' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Erro interno do servidor' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  };
}

// Logs de auditoria por tenant
export async function logTenantAction(tenantId, userId, userType, action, details = {}) {
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await pool.query(
      `INSERT INTO tenant_logs (tenant_id, usuario_tipo, usuario_id, acao, detalhes, ip_address) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        tenantId,
        userType,
        userId,
        action,
        JSON.stringify(details),
        null // TODO: extrair IP do request
      ]
    );
  } catch (error) {
    console.error('Erro ao registrar log de auditoria:', error);
    // Não propagar erro para não quebrar a operação principal
  }
}

export default {
  getTenantContext,
  addTenantFilter,
  validatePlanLimits,
  checkTenantPermission,
  withTenantIsolation,
  logTenantAction
};
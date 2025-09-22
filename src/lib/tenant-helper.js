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

// Adicionar filtro de tenant em queries SQL - VERSÃO SEGURA COM PARÂMETROS
export function addTenantFilter(baseQuery, tenantId, tableAlias = '', paramIndex = 1) {
  if (!tenantId) {
    // SuperAdmin - sem filtro
    return { query: baseQuery, params: [] };
  }

  // Validar tenantId como número para prevenir SQL injection
  const tenantIdNum = parseInt(tenantId, 10);
  if (isNaN(tenantIdNum) || tenantIdNum <= 0) {
    throw new Error('Tenant ID inválido');
  }

  const prefix = tableAlias ? `${tableAlias}.` : '';
  const hasWhere = baseQuery.toLowerCase().includes('where');

  const paramPlaceholder = `$${paramIndex}`;

  let filteredQuery;
  if (hasWhere) {
    filteredQuery = `${baseQuery} AND ${prefix}tenant_id = ${paramPlaceholder}`;
  } else {
    filteredQuery = `${baseQuery} WHERE ${prefix}tenant_id = ${paramPlaceholder}`;
  }

  return {
    query: filteredQuery,
    params: [tenantIdNum]
  };
}

// Função para validar e sanitizar IDs
export function validateId(id, fieldName = 'ID') {
  const numericId = parseInt(id, 10);
  if (isNaN(numericId) || numericId <= 0) {
    throw new Error(`${fieldName} inválido`);
  }
  return numericId;
}

// Função para sanitizar strings evitando XSS
export function sanitizeString(str, maxLength = 255) {
  if (typeof str !== 'string') {
    return '';
  }

  return str
    .trim()
    .slice(0, maxLength)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
    .replace(/[<>]/g, ''); // Remove caracteres perigosos
}

// Função para validar email
export function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    throw new Error('Email é obrigatório');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email) || email.length > 255) {
    throw new Error('Email inválido');
  }

  return email.toLowerCase().trim();
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

// Logs de auditoria por tenant - SEM DADOS SENSÍVEIS
export async function logTenantAction(tenantId, userId, userType, action, details = {}, ipAddress = null) {
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Sanitizar detalhes removendo dados sensíveis
    const sanitizedDetails = sanitizeLogDetails(details);

    // Validar parâmetros
    const validTenantId = tenantId ? validateId(tenantId, 'Tenant ID') : null;
    const validUserId = validateId(userId, 'User ID');

    if (!action || typeof action !== 'string') {
      throw new Error('Ação é obrigatória');
    }

    await pool.query(
      `INSERT INTO tenant_logs (tenant_id, usuario_tipo, usuario_id, acao, detalhes, ip_address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [
        validTenantId,
        sanitizeString(userType, 50),
        validUserId,
        sanitizeString(action, 100),
        JSON.stringify(sanitizedDetails),
        ipAddress
      ]
    );
  } catch (error) {
    console.error('Erro ao registrar log de auditoria:', error.message);
    // Não propagar erro para não quebrar a operação principal
  }
}

// Sanitizar detalhes do log removendo dados sensíveis
function sanitizeLogDetails(details) {
  const sensitiveFields = ['senha', 'password', 'token', 'cpf_central', 'senha_central', 'hash'];
  const sanitized = {};

  for (const [key, value] of Object.entries(details)) {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
      sanitized[key] = '[DADOS_REMOVIDOS]';
    } else if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value, 500);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

export default {
  getTenantContext,
  addTenantFilter,
  validatePlanLimits,
  checkTenantPermission,
  withTenantIsolation,
  logTenantAction
};
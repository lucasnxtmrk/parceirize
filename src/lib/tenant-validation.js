import { DomainHelper } from './domain-helper.js';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Valida se um usuário pode fazer login em um domínio específico
 */
export class TenantValidation {

  /**
   * Verifica se usuário pertence ao tenant do domínio
   * @param {string} hostname - domínio da requisição
   * @param {Object} user - dados do usuário tentando fazer login
   * @returns {Promise<{allowed: boolean, reason?: string}>}
   */
  static async validateUserDomainAccess(hostname, user) {
    try {
      // 1. Detectar tenant do domínio
      const domainTenant = await DomainHelper.detectTenantByDomain(hostname);

      // Se não é um domínio de tenant específico, aplicar regras especiais
      if (!domainTenant) {
        // Para superadmin: BLOQUEAR acesso a qualquer subdomínio que não seja admin
        if (user.role === 'superadmin' && hostname.includes('.localhost') && !hostname.includes('admin.')) {
          return {
            allowed: false,
            reason: 'superadmin_restricted_to_admin_domain',
            message: 'Superadmin deve acessar apenas o domínio administrativo'
          };
        }

        // Para outros usuários em domínio principal: permitir
        return { allowed: true };
      }

      // 2. DOMÍNIO DE SUPERADMIN - ACESSO RESTRITO
      if (domainTenant.isSuperadmin) {
        if (user.role === 'superadmin') {
          return {
            allowed: true,
            reason: 'superadmin_domain_access',
            message: 'Acesso permitido ao domínio administrativo'
          };
        } else {
          return {
            allowed: false,
            reason: 'admin_domain_restricted',
            message: 'Apenas superadmins podem acessar o domínio administrativo'
          };
        }
      }

      // 3. Superadmin NÃO pode acessar domínios de provedores (isolamento de segurança)
      if (user.role === 'superadmin') {
        return {
          allowed: false,
          reason: 'superadmin_restricted_to_admin_domain',
          message: 'Superadmin deve acessar apenas o domínio administrativo'
        };
      }

      // 4. Verificar se usuário tem tenant_id
      if (!user.tenant_id) {
        return {
          allowed: false,
          reason: 'user_no_tenant',
          message: 'Usuário não pertence a nenhum provedor'
        };
      }

      // 5. Verificar se tenant do usuário corresponde ao tenant do domínio
      if (user.tenant_id !== domainTenant.tenant_id) {
        return {
          allowed: false,
          reason: 'tenant_mismatch',
          message: `Este usuário não pode acessar este domínio`,
          userTenant: user.tenant_id,
          domainTenant: domainTenant.tenant_id,
          domainName: domainTenant.nome_empresa
        };
      }

      // 6. Validação passou
      return {
        allowed: true,
        reason: 'tenant_match',
        domainInfo: domainTenant
      };

    } catch (error) {
      console.error('Erro na validação de tenant:', error);
      return {
        allowed: false,
        reason: 'validation_error',
        message: 'Erro na validação de acesso'
      };
    }
  }

  /**
   * Valida antes do login (para usar no NextAuth)
   * @param {Request} req - requisição
   * @param {Object} credentials - credenciais do login
   * @param {Object} user - usuário autenticado
   * @returns {Promise<Object|null>} - usuário ou null se não permitido
   */
  static async validateLoginDomain(req, credentials, user) {
    const hostname = req?.headers?.get?.('host') || req?.headers?.host || 'localhost:3000';

    const validation = await this.validateUserDomainAccess(hostname, user);

    if (!validation.allowed) {
      console.log(`🚫 Login bloqueado: ${validation.reason} - ${validation.message}`);

      // Retornar erro específico
      throw new Error(validation.message || 'Acesso negado para este domínio');
    }

    console.log(`✅ Login permitido: ${validation.reason} - ${user.email} em ${hostname}`);

    // Adicionar informações de domínio ao usuário
    if (validation.domainInfo) {
      user.domainContext = {
        domain: hostname,
        providerName: validation.domainInfo.nome_empresa,
        domainType: validation.domainInfo.tipo
      };
    }

    return user;
  }

  /**
   * Busca informações detalhadas do tenant do usuário
   * @param {string} tenantId - UUID do tenant
   * @returns {Promise<Object|null>}
   */
  static async getUserTenantInfo(tenantId) {
    try {
      const result = await pool.query(`
        SELECT
          id,
          tenant_id,
          nome_empresa,
          email,
          ativo,
          plano_id,
          subdominio
        FROM provedores
        WHERE tenant_id = $1 AND ativo = true
      `, [tenantId]);

      return result.rows[0] || null;
    } catch (error) {
      console.error('Erro ao buscar tenant info:', error);
      return null;
    }
  }

  /**
   * Valida se usuário pode acessar uma rota específica
   * @param {Object} session - sessão do usuário
   * @param {string} hostname - domínio
   * @param {string} path - rota acessada
   * @returns {Promise<{allowed: boolean, redirect?: string}>}
   */
  static async validateRouteAccess(session, hostname, path) {
    // Detectar tenant do domínio
    const domainTenant = await DomainHelper.detectTenantByDomain(hostname);

    if (!domainTenant) {
      return { allowed: true }; // Domínio principal
    }

    // DOMÍNIO DE SUPERADMIN
    if (domainTenant.isSuperadmin) {
      if (!session?.user || session.user.role !== 'superadmin') {
        return {
          allowed: false,
          redirect: '/auth/login'
        };
      }
      return { allowed: true };
    }

    // Verificar sessão
    if (!session?.user) {
      return {
        allowed: false,
        redirect: `/auth/login${path.startsWith('/carteirinha') ? '?tab=cliente' : ''}`
      };
    }

    const user = session.user;

    // Superadmin NÃO pode acessar domínios de provedores (isolamento de segurança)
    if (user.role === 'superadmin') {
      return {
        allowed: false,
        redirect: '/not-authorized?reason=superadmin_restricted'
      };
    }

    // Verificar tenant
    if (user.tenant_id !== domainTenant.tenant_id) {
      return {
        allowed: false,
        redirect: '/not-authorized?reason=wrong_domain'
      };
    }

    // Verificar role vs rota
    const routeRoleMap = {
      '/carteirinha': 'cliente',
      '/painel': 'parceiro',
      '/dashboard': ['provedor', 'superadmin'],
      '/admin-': ['provedor', 'superadmin']
    };

    for (const [route, allowedRoles] of Object.entries(routeRoleMap)) {
      if (path.startsWith(route)) {
        const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
        if (!roles.includes(user.role)) {
          return {
            allowed: false,
            redirect: '/not-authorized?reason=wrong_role'
          };
        }
        break;
      }
    }

    return { allowed: true };
  }

  /**
   * Log de tentativa de acesso para auditoria
   * @param {string} hostname - domínio
   * @param {Object} user - usuário
   * @param {boolean} allowed - se foi permitido
   * @param {string} reason - motivo
   */
  static async logAccessAttempt(hostname, user, allowed, reason) {
    try {
      // Buscar domínio
      const domainResult = await pool.query(
        'SELECT id, provedor_id FROM dominios_personalizados WHERE dominio = $1',
        [hostname]
      );

      if (domainResult.rows.length > 0) {
        const domain = domainResult.rows[0];

        await pool.query(`
          INSERT INTO acessos_dominio (
            dominio_id,
            provedor_id,
            path,
            metodo,
            status_code,
            user_id,
            user_tipo,
            ip_address,
            user_agent
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          domain.id,
          domain.provedor_id,
          `/auth/login`,
          'LOGIN_ATTEMPT',
          allowed ? 200 : 403,
          user.id,
          user.role,
          '127.0.0.1', // Will be updated by actual IP
          `Access: ${allowed ? 'ALLOWED' : 'DENIED'} - ${reason}`
        ]);
      }
    } catch (error) {
      console.error('Erro ao registrar tentativa de acesso:', error);
    }
  }
}

export default TenantValidation;
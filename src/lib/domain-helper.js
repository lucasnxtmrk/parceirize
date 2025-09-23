import { Pool } from 'pg';
import dns from 'dns';
import { promisify } from 'util';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const resolveTxt = promisify(dns.resolveTxt);

/**
 * Helper para gerenciamento de domínios personalizados
 */
export class DomainHelper {

  /**
   * Detecta o tenant baseado no hostname da requisição
   * @param {string} hostname - hostname da requisição (ex: empresa.parceirize.com)
   * @returns {Promise<Object|null>} - dados do provedor ou null
   */
  static async detectTenantByDomain(hostname) {
    if (!hostname) return null;

    try {
      // 1. Verificar se é domínio de superadmin
      if (this.isSuperadminDomain(hostname)) {
        return {
          provedor_id: null,
          tenant_id: null,
          nome_empresa: 'Administração do Sistema',
          dominio: hostname,
          tipo: 'superadmin',
          verificado: true,
          source: 'superadmin_domain',
          isSuperadmin: true
        };
      }

      // 2. Primeiro tenta buscar domínio personalizado
      const customDomain = await this.getProviderByCustomDomain(hostname);
      if (customDomain) {
        return {
          ...customDomain,
          isTenant: true,
          isSuperadmin: customDomain.issuperadmin || false,
          type: 'tenant',
          source: 'custom_domain'
        };
      }

      // 3. Depois tenta subdomínio
      const subdomain = this.extractSubdomain(hostname);
      if (subdomain) {
        const subdomainProvider = await this.getProviderBySubdomain(subdomain);
        if (subdomainProvider) {
          return {
            ...subdomainProvider,
            isTenant: true,
            isSuperadmin: false,
            type: 'tenant',
            source: 'subdomain'
          };
        }
      }

      return null;
    } catch (error) {
      console.error('Erro ao detectar tenant por domínio:', error);
      return null;
    }
  }

  /**
   * Busca provedor por domínio personalizado
   * @param {string} domain - domínio completo
   * @returns {Promise<Object|null>}
   */
  static async getProviderByCustomDomain(domain) {
    try {
      const result = await pool.query(
        'SELECT * FROM buscar_provedor_por_dominio($1)',
        [domain]
      );

      return result.rows[0] || null;
    } catch (error) {
      console.error('Erro ao buscar provedor por domínio personalizado:', error);
      return null;
    }
  }

  /**
   * Busca provedor por subdomínio
   * @param {string} subdomain - apenas o subdomínio (ex: 'empresa')
   * @returns {Promise<Object|null>}
   */
  static async getProviderBySubdomain(subdomain) {
    try {
      const domain = `${subdomain}.parceirize.com`;

      const result = await pool.query(`
        SELECT
          p.id as provedor_id,
          p.tenant_id,
          p.nome_empresa,
          p.email,
          dp.dominio,
          dp.tipo,
          dp.verificado
        FROM provedores p
        INNER JOIN dominios_personalizados dp ON p.id = dp.provedor_id
        WHERE dp.dominio = $1
          AND dp.ativo = true
          AND dp.verificado = true
          AND p.ativo = true
      `, [domain]);

      return result.rows[0] || null;
    } catch (error) {
      console.error('Erro ao buscar provedor por subdomínio:', error);
      return null;
    }
  }

  /**
   * Verifica se o hostname é do domínio de superadmin
   * @param {string} hostname - hostname completo
   * @returns {boolean} - true se for domínio de superadmin
   */
  static isSuperadminDomain(hostname) {
    if (!hostname) return false;

    const superadminDomains = [
      'admin.parceirize.com.br',
      'admin.parceirize.com',
      'admin.localhost',
      'admin.localhost:3000'
    ];

    return superadminDomains.includes(hostname.toLowerCase());
  }

  /**
   * Extrai subdomínio do hostname
   * @param {string} hostname - hostname completo
   * @returns {string|null} - subdomínio ou null
   */
  static extractSubdomain(hostname) {
    if (!hostname) return null;

    const parts = hostname.split('.');

    // Para localhost:3000, detectar subdomínio antes do localhost
    if (hostname.includes('localhost')) {
      if (parts.length >= 2 && parts[1].includes('localhost')) {
        const subdomain = parts[0];
        // Não retornar admin como subdomínio normal (é superadmin)
        if (subdomain !== 'admin' && subdomain !== 'www') {
          return subdomain;
        }
      }
      return null;
    }

    // Para parceirize.com ou www.parceirize.com, não há subdomínio válido
    if (parts.length < 3) return null;

    const subdomain = parts[0];
    const domain = parts.slice(1).join('.');

    // Verificar se é um subdomínio válido do parceirize.com
    if (domain === 'parceirize.com' && subdomain !== 'www' && subdomain !== 'admin') {
      return subdomain;
    }

    return null;
  }

  /**
   * Valida se um domínio é válido para uso
   * @param {string} domain - domínio a validar
   * @returns {Object} - {valid: boolean, error?: string}
   */
  static validateDomain(domain) {
    if (!domain || typeof domain !== 'string') {
      return { valid: false, error: 'Domínio é obrigatório' };
    }

    // Limpar espaços
    domain = domain.trim().toLowerCase();

    // Regex básica para validação de domínio
    const domainRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/;

    if (!domainRegex.test(domain)) {
      return { valid: false, error: 'Formato de domínio inválido' };
    }

    // Verificar se não é um domínio reservado
    const reservedDomains = [
      'localhost',
      'parceirize.com',
      'www.parceirize.com',
      'api.parceirize.com',
      'admin.parceirize.com',
      'admin.parceirize.com.br',
      'app.parceirize.com',
      'cdn.parceirize.com',
      'static.parceirize.com'
    ];

    if (reservedDomains.includes(domain)) {
      return { valid: false, error: 'Domínio reservado pelo sistema' };
    }

    // Verificar comprimento
    if (domain.length > 253) {
      return { valid: false, error: 'Domínio muito longo (máximo 253 caracteres)' };
    }

    return { valid: true };
  }

  /**
   * Registra um novo domínio personalizado
   * @param {number} provedorId - ID do provedor
   * @param {string} domain - domínio a registrar
   * @param {string} tipo - 'subdominio' ou 'personalizado'
   * @returns {Promise<Object>} - dados do domínio criado
   */
  static async registerDomain(provedorId, domain, tipo = 'personalizado') {
    // Validar domínio
    const validation = this.validateDomain(domain);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    try {
      // Verificar se domínio já existe
      const existing = await pool.query(
        'SELECT id FROM dominios_personalizados WHERE dominio = $1',
        [domain]
      );

      if (existing.rows.length > 0) {
        throw new Error('Domínio já está registrado');
      }

      // Gerar token de verificação
      const tokenResult = await pool.query('SELECT gerar_token_verificacao() as token');
      const token = tokenResult.rows[0].token;

      // Inserir domínio
      const result = await pool.query(`
        INSERT INTO dominios_personalizados (
          provedor_id,
          dominio,
          tipo,
          verificacao_token,
          verificacao_metodo
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [provedorId, domain, tipo, token, 'dns_txt']);

      return result.rows[0];
    } catch (error) {
      console.error('Erro ao registrar domínio:', error);
      throw error;
    }
  }

  /**
   * Verifica se um domínio está configurado corretamente
   * @param {string} domain - domínio a verificar
   * @returns {Promise<Object>} - resultado da verificação
   */
  static async verifyDomainConfiguration(domain) {
    try {
      // Buscar dados do domínio no banco
      const domainData = await pool.query(`
        SELECT *
        FROM dominios_personalizados
        WHERE dominio = $1
      `, [domain]);

      if (domainData.rows.length === 0) {
        return {
          verified: false,
          error: 'Domínio não encontrado no sistema'
        };
      }

      const domainInfo = domainData.rows[0];

      // Verificar DNS TXT record
      if (domainInfo.verificacao_metodo === 'dns_txt') {
        try {
          const txtRecords = await resolveTxt(`_parceirize.${domain}`);
          const expectedToken = domainInfo.verificacao_token;

          const hasValidRecord = txtRecords.some(record => {
            return Array.isArray(record)
              ? record.some(r => r.includes(expectedToken))
              : record.includes(expectedToken);
          });

          if (hasValidRecord) {
            // Marcar como verificado
            await pool.query(`
              UPDATE dominios_personalizados
              SET verificado = true, verificado_em = NOW()
              WHERE id = $1
            `, [domainInfo.id]);

            return {
              verified: true,
              method: 'dns_txt',
              verified_at: new Date()
            };
          } else {
            return {
              verified: false,
              error: 'Registro TXT não encontrado ou inválido',
              expected_record: `_parceirize.${domain} TXT "${expectedToken}"`
            };
          }
        } catch (dnsError) {
          return {
            verified: false,
            error: 'Erro ao consultar DNS: ' + dnsError.message
          };
        }
      }

      return {
        verified: false,
        error: 'Método de verificação não suportado'
      };
    } catch (error) {
      console.error('Erro ao verificar configuração de domínio:', error);
      return {
        verified: false,
        error: 'Erro interno: ' + error.message
      };
    }
  }

  /**
   * Lista domínios de um provedor
   * @param {number} provedorId - ID do provedor
   * @returns {Promise<Array>} - lista de domínios
   */
  static async listProviderDomains(provedorId) {
    try {
      const result = await pool.query(`
        SELECT
          dp.*,
          CASE
            WHEN dp.ultimo_acesso IS NOT NULL
            THEN EXTRACT(EPOCH FROM (NOW() - dp.ultimo_acesso))::int
            ELSE NULL
          END as segundos_ultimo_acesso
        FROM dominios_personalizados dp
        WHERE dp.provedor_id = $1
          AND dp.ativo = true
        ORDER BY dp.verificado DESC, dp.criado_em DESC
      `, [provedorId]);

      return result.rows;
    } catch (error) {
      console.error('Erro ao listar domínios do provedor:', error);
      throw error;
    }
  }

  /**
   * Registra acesso de domínio para analytics
   * @param {string} domain - domínio acessado
   * @param {Object} requestInfo - informações da requisição
   */
  static async logDomainAccess(domain, requestInfo = {}) {
    try {
      // Buscar domínio_id
      const domainResult = await pool.query(
        'SELECT id, provedor_id FROM dominios_personalizados WHERE dominio = $1',
        [domain]
      );

      if (domainResult.rows.length === 0) return;

      const { id: domainId, provedor_id } = domainResult.rows[0];

      // Inserir log de acesso
      await pool.query(`
        INSERT INTO acessos_dominio (
          dominio_id,
          provedor_id,
          ip_address,
          user_agent,
          path,
          metodo,
          status_code,
          tempo_resposta_ms,
          user_id,
          user_tipo
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        domainId,
        provedor_id,
        requestInfo.ip || null,
        requestInfo.userAgent || null,
        requestInfo.path || null,
        requestInfo.method || null,
        requestInfo.statusCode || null,
        requestInfo.responseTime || null,
        requestInfo.userId || null,
        requestInfo.userType || null
      ]);
    } catch (error) {
      console.error('Erro ao registrar acesso de domínio:', error);
      // Não propagar erro para não afetar a funcionalidade principal
    }
  }
}

export default DomainHelper;
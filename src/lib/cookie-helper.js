/**
 * Helper para configuração dinâmica de cookies baseada no domínio
 */
export class CookieHelper {

  /**
   * Determina o domínio do cookie baseado no hostname da requisição
   * @param {Request} req - Objeto de requisição
   * @returns {string} - Domínio do cookie
   */
  static getCookieDomain(req) {
    const hostname = req?.headers?.get?.('host') || req?.headers?.host || 'localhost:3000';

    // Para localhost, não definir domínio (padrão do navegador)
    if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
      return undefined;
    }

    // Para subdomínios do parceirize.com.br, usar domínio wildcard
    if (hostname.includes('.parceirize.com.br')) {
      return '.parceirize.com.br';
    }

    // Para domínios personalizados, usar o domínio específico
    // Extrair domínio raiz (exemplo.com.br de www.exemplo.com.br)
    const parts = hostname.split('.');
    if (parts.length >= 2) {
      // Se tem 3+ partes e a última é uma extensão conhecida, usar domínio raiz
      const rootDomain = parts.slice(-2).join('.');
      return `.${rootDomain}`;
    }

    // Fallback para o hostname completo
    return hostname;
  }

  /**
   * Verifica se o domínio é permitido para cookies
   * @param {string} domain - Domínio a verificar
   * @returns {boolean}
   */
  static isAllowedDomain(domain) {
    const allowedDomains = process.env.ALLOWED_DOMAINS?.split(',') || ['parceirize.com'];

    // Verificar se é exatamente um domínio permitido
    if (allowedDomains.includes(domain)) {
      return true;
    }

    // Verificar wildcards (*.parceirize.com)
    return allowedDomains.some(allowed => {
      if (allowed.startsWith('*.')) {
        const baseDomain = allowed.substring(2);
        return domain.endsWith(baseDomain);
      }
      return false;
    });
  }

  /**
   * Configuração de cookies para NextAuth baseada no domínio
   * @param {Request} req - Objeto de requisição
   * @returns {Object} - Configuração de cookies
   */
  static getNextAuthCookieConfig(req) {
    const cookieDomain = this.getCookieDomain(req);
    const isProduction = process.env.NODE_ENV === 'production';
    const isSecure = isProduction || req?.headers?.get?.('x-forwarded-proto') === 'https';

    const baseConfig = {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: isSecure,
      domain: cookieDomain
    };

    return {
      sessionToken: {
        name: 'next-auth.session-token',
        options: {
          ...baseConfig,
          // Session token deve durar mais tempo
          maxAge: 30 * 24 * 60 * 60, // 30 dias
        }
      },
      callbackUrl: {
        name: 'next-auth.callback-url',
        options: {
          ...baseConfig,
          httpOnly: false, // Callback URL pode ser acessível via JS
          maxAge: 24 * 60 * 60, // 24 horas
        }
      },
      csrfToken: {
        name: 'next-auth.csrf-token',
        options: {
          ...baseConfig,
          httpOnly: false, // CSRF token precisa ser acessível via JS
          maxAge: 24 * 60 * 60, // 24 horas
        }
      },
      pkceCodeVerifier: {
        name: 'next-auth.pkce.code_verifier',
        options: {
          ...baseConfig,
          maxAge: 15 * 60, // 15 minutos
        }
      },
      state: {
        name: 'next-auth.state',
        options: {
          ...baseConfig,
          maxAge: 15 * 60, // 15 minutos
        }
      },
      nonce: {
        name: 'next-auth.nonce',
        options: {
          ...baseConfig,
          maxAge: 15 * 60, // 15 minutos
        }
      }
    };
  }

  /**
   * Extrai informações do domínio da requisição
   * @param {Request} req - Objeto de requisição
   * @returns {Object} - Informações do domínio
   */
  static getDomainInfo(req) {
    const hostname = req?.headers?.get?.('host') || req?.headers?.host || 'localhost:3000';
    const protocol = req?.headers?.get?.('x-forwarded-proto') ||
                    (hostname.includes('localhost') ? 'http' : 'https');

    const isLocalhost = hostname.includes('localhost') || hostname.includes('127.0.0.1');
    const isSubdomain = hostname.includes('.parceirize.com.br');
    const isCustomDomain = !isLocalhost && !isSubdomain;

    return {
      hostname,
      protocol,
      fullUrl: `${protocol}://${hostname}`,
      isLocalhost,
      isSubdomain,
      isCustomDomain,
      cookieDomain: this.getCookieDomain(req),
      isAllowed: this.isAllowedDomain(hostname)
    };
  }

  /**
   * Limpa cookies específicos para um domínio
   * @param {Response} response - Objeto de resposta
   * @param {string} domain - Domínio para limpar cookies
   */
  static clearDomainCookies(response, domain) {
    const cookieNames = [
      'next-auth.session-token',
      'next-auth.callback-url',
      'next-auth.csrf-token'
    ];

    cookieNames.forEach(name => {
      response.headers.append('Set-Cookie',
        `${name}=; Path=/; Domain=${domain}; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly`
      );
    });
  }

  /**
   * Configura cookies para logout multi-domínio
   * @param {Response} response - Objeto de resposta
   * @param {Request} req - Objeto de requisição
   */
  static setupLogoutCookies(response, req) {
    const domainInfo = this.getDomainInfo(req);

    // Limpar cookies para o domínio atual
    this.clearDomainCookies(response, domainInfo.cookieDomain);

    // Se estiver em subdomínio, também limpar para domínio principal
    if (domainInfo.isSubdomain) {
      this.clearDomainCookies(response, '.parceirize.com.br');
    }
  }
}

export default CookieHelper;
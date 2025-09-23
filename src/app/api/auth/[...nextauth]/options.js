// options.js
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { Pool } from 'pg';
import bcrypt from "bcryptjs";
import { CookieHelper } from '@/lib/cookie-helper.js';
import { TenantValidation } from '@/lib/tenant-validation.js';
import { DomainHelper } from '@/lib/domain-helper.js';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Função dinâmica para configurar NextAuth baseado na requisição
export function getAuthOptions(req) {
  const domainInfo = CookieHelper.getDomainInfo(req);
  const cookieConfig = CookieHelper.getNextAuthCookieConfig(req);

  return {
    providers: [
      CredentialsProvider({
        name: 'Credentials',
        credentials: {
          email: { label: 'Email', type: 'text' },
          password: { label: 'Senha', type: 'password' },
          cpf: { label: 'CPF', type: 'text' }
        },
      async authorize(credentials) {
        const { email, password, cpf } = credentials;

        try {
          let query;
          let queryParams;

          // Detectar o tipo de login baseado no path da requisição
          const requestPath = req?.nextUrl?.pathname || req?.url || '';
          const isAdminLogin = requestPath.includes('/admin/login');
          const isParceiroLogin = requestPath.includes('/parceiro/login');
          const isClienteLogin = !isAdminLogin && !isParceiroLogin;

          // Se CPF foi fornecido, buscar apenas clientes
          if (cpf) {
            const cpfLimpo = cpf.replace(/\D/g, '');
            const cpfComMascara = cpfLimpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
            query = `
              SELECT id,
                     nome,
                     sobrenome,
                     email,
                     cpf_cnpj,
                     id_carteirinha,
                     data_ultimo_voucher,
                     ativo,
                     tenant_id,
                     senha AS "password",
                     'cliente' AS role
              FROM clientes
              WHERE (
                cpf_cnpj = $1 OR
                cpf_cnpj = $2 OR
                REPLACE(REPLACE(REPLACE(cpf_cnpj, '.', ''), '-', ''), ' ', '') = $1
              ) AND ativo = true
            `;
            queryParams = [cpfLimpo, cpfComMascara];
          } else {
            // Busca por email baseada no tipo de login
            if (isAdminLogin) {
              // Login administrativo: apenas provedores DO DOMÍNIO CORRETO e superadmins
              // Primeiro detectar o tenant do domínio
              const hostname = req?.headers?.get?.('host') || req?.headers?.host || 'localhost:3000';
              const domainInfo = await DomainHelper.detectTenantByDomain(hostname);

              if (domainInfo && domainInfo.tenant_id) {
                // Domínio de provedor específico - só permitir esse provedor
                query = `
                  SELECT id,
                         nome_empresa AS nome,
                         NULL AS sobrenome,
                         email,
                         NULL AS cpf_cnpj,
                         NULL AS id_carteirinha,
                         NULL AS data_ultimo_voucher,
                         ativo,
                         tenant_id,
                         senha AS "password",
                         'provedor' AS role
                  FROM provedores
                  WHERE email = $1 AND ativo = true AND tenant_id = $2
                `;
                queryParams = [email, domainInfo.tenant_id];
              } else {
                // Domínio administrativo principal - permitir superadmins apenas
                query = `
                  SELECT id,
                         nome AS nome,
                         NULL AS sobrenome,
                         email,
                         NULL AS cpf_cnpj,
                         NULL AS id_carteirinha,
                         NULL AS data_ultimo_voucher,
                         ativo,
                         NULL AS tenant_id,
                         senha AS "password",
                         'superadmin' AS role
                  FROM superadmins
                  WHERE email = $1 AND ativo = true
                `;
                queryParams = [email];
              }
            } else if (isParceiroLogin) {
              // Login de parceiro: apenas parceiros
              query = `
                SELECT id,
                       nome_empresa AS nome,
                       NULL AS sobrenome,
                       email,
                       NULL AS cpf_cnpj,
                       NULL AS id_carteirinha,
                       NULL AS data_ultimo_voucher,
                       true AS ativo,
                       tenant_id,
                       senha AS "password",
                       'parceiro' AS role
                FROM parceiros
                WHERE email = $1
              `;
            } else {
              // Login padrão: clientes principalmente, mas também outros para compatibilidade
              query = `
                SELECT id,
                       nome,
                       sobrenome,
                       email,
                       NULL AS cpf_cnpj,
                       id_carteirinha,
                       data_ultimo_voucher,
                       ativo,
                       tenant_id,
                       senha AS "password",
                       'cliente' AS role
                FROM clientes
                WHERE email = $1 AND ativo = true

                UNION ALL

                SELECT id,
                       nome_empresa AS nome,
                       NULL AS sobrenome,
                       email,
                       NULL AS cpf_cnpj,
                       NULL AS id_carteirinha,
                       NULL AS data_ultimo_voucher,
                       true AS ativo,
                       tenant_id,
                       senha AS "password",
                       'parceiro' AS role
                FROM parceiros
                WHERE email = $1

                UNION ALL

                SELECT id,
                       nome_empresa AS nome,
                       NULL AS sobrenome,
                       email,
                       NULL AS cpf_cnpj,
                       NULL AS id_carteirinha,
                       NULL AS data_ultimo_voucher,
                       ativo,
                       tenant_id,
                       senha AS "password",
                       'provedor' AS role
                FROM provedores
                WHERE email = $1 AND ativo = true

                UNION ALL

                SELECT id,
                       nome AS nome,
                       NULL AS sobrenome,
                       email,
                       NULL AS cpf_cnpj,
                       NULL AS id_carteirinha,
                       NULL AS data_ultimo_voucher,
                       ativo,
                       NULL AS tenant_id,
                       senha AS "password",
                       'superadmin' AS role
                FROM superadmins
                WHERE email = $1 AND ativo = true
              `;
              queryParams = [email];
            }
          }

          const result = await pool.query(query, queryParams);

          if (result.rows.length === 0) {
            // Mensagens específicas baseadas no tipo de login
            if (isAdminLogin) {
              throw new Error("Não foi encontrado um provedor com este e-mail neste domínio.");
            } else if (isParceiroLogin) {
              throw new Error("Não foi encontrado um parceiro com este e-mail.");
            } else if (cpf) {
              throw new Error("Não foi encontrado um cliente com este CPF.");
            } else {
              throw new Error("Não foi encontrado um usuário com este e-mail.");
            }
          }

          const userRecord = result.rows[0];

          // VALIDAÇÃO ADICIONAL: Verificar se role corresponde ao tipo de login ANTES de verificar a senha
          if (isAdminLogin && userRecord.role !== 'provedor' && userRecord.role !== 'superadmin') {
            throw new Error("Não foi encontrado um provedor com este e-mail neste domínio.");
          }

          if (isParceiroLogin && userRecord.role !== 'parceiro') {
            throw new Error("Não foi encontrado um parceiro com este e-mail.");
          }

          // Bloqueia login de cliente inativo
          if (userRecord.role === 'cliente' && userRecord.ativo === false) {
            throw new Error('Conta inativa. Entre em contato com o suporte.');
          }

          const senhaCorreta = await bcrypt.compare(password, userRecord.password);
          if (!senhaCorreta) {
            throw new Error("Senha incorreta.");
          }

          const user = {
            id: userRecord.id,
            nome: userRecord.nome,
            sobrenome: userRecord.sobrenome,
            email: userRecord.email,
            cpf_cnpj: userRecord.cpf_cnpj,
            id_carteirinha: userRecord.id_carteirinha,
            data_ultimo_voucher: userRecord.data_ultimo_voucher,
            role: userRecord.role,
            ativo: userRecord.ativo,
            tenant_id: userRecord.tenant_id
          };

          // VALIDAÇÃO DE TENANT POR DOMÍNIO
          try {
            const validatedUser = await TenantValidation.validateLoginDomain(req, credentials, user);

            // Log da tentativa de login
            const hostname = req?.headers?.get?.('host') || req?.headers?.host || 'localhost:3000';
            await TenantValidation.logAccessAttempt(hostname, user, true, 'login_success');

            return validatedUser;
          } catch (validationError) {
            // Log da tentativa bloqueada
            const hostname = req?.headers?.get?.('host') || req?.headers?.host || 'localhost:3000';
            await TenantValidation.logAccessAttempt(hostname, user, false, validationError.message);

            throw new Error(validationError.message);
          }
        } catch (err) {
          throw new Error(err.message);
        }
      }
    })
  ],
    secret: process.env.NEXTAUTH_SECRET,

    // Configuração dinâmica de cookies
    cookies: cookieConfig,

    pages: {
      signIn: '/auth/login'
    },

    callbacks: {
      // Adiciona o usuário ao token JWT
      async jwt({ token, user }) {
        if (user) {
          token.user = user;
        }
        return token;
      },

      // Inclui os dados do usuário na sessão
      async session({ session, token }) {
        session.user = token.user;
        return session;
      },

      // Redireciona de acordo com a role - com suporte a domínios dinâmicos e tipos de login
      async redirect({ url, baseUrl, token }) {
        // Construir baseUrl dinâmico baseado no domínio da requisição
        const dynamicBaseUrl = domainInfo.fullUrl;

        // Verificar o tipo de login baseado na URL
        const isAdminLogin = url.includes('/admin/login');
        const isParceiroLogin = url.includes('/parceiro/login');
        const isLoginPage = url.includes('/auth/login') || isAdminLogin || isParceiroLogin;

        // Se não for página de login, permite o redirecionamento normal
        if (!isLoginPage) {
          // Se URL é relativa, usar o domínio atual
          if (url.startsWith('/')) {
            return `${dynamicBaseUrl}${url}`;
          }

          // Se URL é absoluta mas do mesmo domínio, permitir
          if (url.startsWith(dynamicBaseUrl)) {
            return url;
          }

          // Para URLs externas, validar se é permitida
          const urlDomain = new URL(url).hostname;
          if (CookieHelper.isAllowedDomain(urlDomain)) {
            return url;
          }

          // Fallback para domínio atual
          return dynamicBaseUrl;
        }

        // Para login, redirecionar baseado no tipo e role do usuário
        if (token?.user?.role) {
          const role = token.user.role;

          if (isAdminLogin) {
            // Login administrativo: validar se é no domínio correto
            if (role === 'superadmin') {
              // Superadmin só pode acessar domínio admin
              if (dynamicBaseUrl.includes('admin.')) {
                return `${dynamicBaseUrl}/superadmin/dashboard`;
              } else {
                // Superadmin tentando login em domínio de provedor
                return `${dynamicBaseUrl}/not-authorized?reason=superadmin_restricted`;
              }
            } else if (role === 'provedor') {
              // Provedor não pode acessar domínio admin
              if (dynamicBaseUrl.includes('admin.')) {
                return `${dynamicBaseUrl}/not-authorized?reason=provedor_restricted`;
              } else {
                return `${dynamicBaseUrl}/dashboard`;
              }
            }
          } else if (isParceiroLogin) {
            // Login de parceiro: redirecionar para painel
            if (role === 'parceiro') {
              return `${dynamicBaseUrl}/painel`;
            }
          } else {
            // Login padrão: redirecionar baseado na role
            switch (role) {
              case 'superadmin':
                return `${dynamicBaseUrl}/superadmin/dashboard`;
              case 'provedor':
                return `${dynamicBaseUrl}/dashboard`;
              case 'cliente':
                return `${dynamicBaseUrl}/carteirinha`;
              case 'parceiro':
                return `${dynamicBaseUrl}/painel`;
            }
          }
        }

        // Fallback: redirecionar para home e deixar o middleware decidir
        return `${dynamicBaseUrl}/`;
      }
    }
  };
}

// Opções padrão para compatibilidade (localhost)
export const options = getAuthOptions(null);

export default NextAuth(options);

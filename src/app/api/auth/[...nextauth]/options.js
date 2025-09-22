// options.js
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { Pool } from 'pg';
import bcrypt from "bcryptjs";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const options = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Senha', type: 'password' }
      },
      async authorize(credentials) {
        const { email, password, cpf } = credentials;

        try {
          let query;
          let queryParams;

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
            // Busca por email para parceiros, provedores e superadmins
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

          const result = await pool.query(query, queryParams);

          if (result.rows.length === 0) {
            throw new Error("Usuário não encontrado.");
          }

          const userRecord = result.rows[0];

          // Bloqueia login de cliente inativo
          if (userRecord.role === 'cliente' && userRecord.ativo === false) {
            throw new Error('Conta inativa. Entre em contato com o suporte.');
          }

          const senhaCorreta = await bcrypt.compare(password, userRecord.password);
          if (!senhaCorreta) {
            throw new Error("Senha incorreta.");
          }

          return {
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
        } catch (err) {
          throw new Error(err.message);
        }
      }
    })
  ],
  secret: process.env.NEXTAUTH_SECRET,
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
    // Redireciona de acordo com a role - simplificado
    async redirect({ url, baseUrl, token }) {
      // Se não for a página de login, permite o redirecionamento normal
      if (!url.includes('/auth/login')) {
        return url.startsWith('/') ? `${baseUrl}${url}` : url;
      }

      // Para login, redireciona para home e deixa o middleware decidir
      return `${baseUrl}/`;
    }
  }
};

export default NextAuth(options);

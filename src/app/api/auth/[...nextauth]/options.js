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
        const { email, password } = credentials;
      
        try {
          console.log("📡 Consultando banco de dados para:", email);
          
          const query = `
            SELECT id,
                   nome,
                   sobrenome,
                   email,
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
                   NULL AS id_carteirinha,
                   NULL AS data_ultimo_voucher,
                   ativo,
                   NULL AS tenant_id,
                   senha AS "password",
                   'superadmin' AS role
            FROM superadmins
            WHERE email = $1 AND ativo = true
          `;

          const result = await pool.query(query, [email]);

          console.log("🔍 Resultado da Query:", result.rows);

          if (result.rows.length === 0) {
            console.log("❌ Usuário não encontrado!");
            throw new Error("Usuário não encontrado.");
          }

          const userRecord = result.rows[0];

          // Bloqueia login de cliente inativo
          if (userRecord.role === 'cliente' && userRecord.ativo === false) {
            throw new Error('Conta inativa. Entre em contato com o suporte.');
          }

          // Comparação simples de senha (substitua por hash em produção)
          const senhaCorreta = await bcrypt.compare(password, userRecord.password);
          if (!senhaCorreta) {
          console.log("❌ Senha incorreta (bcrypt)");
          throw new Error("Senha incorreta.");
          }

          console.log("✅ Login bem-sucedido:", userRecord);

          return {
            id: userRecord.id,
            nome: userRecord.nome,
            sobrenome: userRecord.sobrenome,
            email: userRecord.email,
            id_carteirinha: userRecord.id_carteirinha,
            data_ultimo_voucher: userRecord.data_ultimo_voucher,
            role: userRecord.role,
            ativo: userRecord.ativo,
            tenant_id: userRecord.tenant_id
          };
        } catch (err) {
          console.error("⚠️ Erro na autenticação:", err.message);
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
    async redirect({ url, baseUrl }) {
      console.log("🔄 Redirecionando... URL original:", url);
      
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

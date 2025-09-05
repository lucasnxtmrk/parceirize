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
                   senha AS "password",
                   'cliente' AS role
            FROM clientes
            WHERE email = $1

            UNION ALL

            SELECT id,
                   nome_empresa AS nome,
                   NULL AS sobrenome,
                   email,
                   NULL AS id_carteirinha,
                   NULL AS data_ultimo_voucher,
                   NULL AS ativo,
                   senha AS "password",
                   'parceiro' AS role
            FROM parceiros
            WHERE email = $1

            UNION ALL

            SELECT id,
                   'Admin' AS nome,
                   NULL AS sobrenome,
                   email,
                   NULL AS id_carteirinha,
                   NULL AS data_ultimo_voucher,
                   NULL AS ativo,
                   senha AS "password",
                   'admin' AS role
            FROM admins
            WHERE email = $1
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
            ativo: userRecord.ativo
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
    // Redireciona de acordo com a role
    async redirect({ url, baseUrl, token }) {
      console.log("🔄 Redirecionando... URL original:", url);
      console.log("🔍 Token recebido:", token);

      // Se não houver token, provavelmente é logout, então use a URL passada
      if (!token || !token.user) {
        return url.startsWith('/') ? `${baseUrl}${url}` : url;
      }

      const role = token.user.role;
      console.log("🎯 Role detectado:", role);

      if (role === 'cliente') return `${baseUrl}/carteirinha`;
      if (role === 'parceiro') return `${baseUrl}/relatorio`;
      if (role === 'admin') return `${baseUrl}/dashboard`;

      // Caso não corresponda a nenhuma role conhecida
      return baseUrl;
    }
  }
};

export default NextAuth(options);

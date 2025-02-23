// options.js
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

// Dados de usuários simulados (JSON)
const users = [
    {
        id: 1,
        email: 'cliente@protege.com.br',
        password: '12345678',
        name: 'Cliente Teste',
        role: 'cliente'
    },
    {
        id: 2,
        email: 'parceiro@protege.com.br',
        password: '12345678',
        name: 'Parceiro Teste',
        role: 'parceiro'
    },
    {
        id: 3,
        email: 'admin@protege.com.br',
        password: '12345678',
        name: 'Admin Teste',
        role: 'admin'
    }
];

export const options = { // Exportação nomeada
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                email: { label: 'Email', type: 'text' },
                password: { label: 'Senha', type: 'password' }
            },
            async authorize(credentials) {
                const { email, password } = credentials;

                // 1. Encontrar o usuário no array JSON
                const user = users.find(user => user.email === email);

                if (!user) {
                    throw new Error('Usuário não encontrado.');
                }

                // 2. Verificar a senha (comparação simples para teste)
                if (user.password !== password) {
                    throw new Error('Senha incorreta.');
                }

                // 3. Retornar o usuário com o role
                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role
                };
            }
        })
    ],
    secret: process.env.NEXTAUTH_SECRET, // NÃO ESQUEÇA DESTA LINHA!
    pages: {
        signIn: '/auth/login'
    },
    callbacks: {
        async session({ session, token }) {
            session.user = token.user;
            return session;
        }
    },
    events: {
        async signIn({ user, account, email, callbackUrl }) { // callbackUrl aqui
            console.log("Role do usuário:", user?.role); // Verifique o role do usuário
            console.log("Callback URL:", callbackUrl); // Verifique o callbackUrl

            if (user?.role === 'cliente') {
                return '/carteirinha';
            } else if (user?.role === 'parceiro') {
                return '/relatorio';
            } else if (user?.role === 'admin') {
                return '/admin';
            }
            return callbackUrl || '/'; // Use callbackUrl ou página padrão
        }
    }
};
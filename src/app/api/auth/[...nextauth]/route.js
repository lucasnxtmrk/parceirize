import NextAuth from 'next-auth';
import { getAuthOptions, options as defaultOptions } from './options.js';

// Handler dinâmico que configura NextAuth baseado na requisição
async function handler(req, context) {
  try {
    // Obter opções específicas para a requisição atual
    const dynamicOptions = getAuthOptions(req);

    // Criar instância NextAuth com configurações dinâmicas
    const authHandler = NextAuth(dynamicOptions);

    // Chamar o handler com req e context
    return authHandler(req, context);
  } catch (error) {
    console.error('Erro no handler NextAuth dinâmico:', error);

    // Fallback para configuração padrão
    const fallbackHandler = NextAuth(defaultOptions);
    return fallbackHandler(req, context);
  }
}

export { handler as GET, handler as POST };
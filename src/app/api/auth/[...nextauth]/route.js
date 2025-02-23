import NextAuth from 'next-auth';
import { options } from './options'; // Importação nomeada

const handler = NextAuth(options);
export { handler as GET, handler as POST };
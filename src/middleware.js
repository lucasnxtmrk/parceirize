import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(req) {
  const { nextUrl } = req;
  const path = nextUrl.pathname;
  const session = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // Permitir acesso à página de erro
  if (path === '/not-authorized') return NextResponse.next();

  // Se não estiver logado, redireciona
  if (!session) {
    return NextResponse.redirect(new URL('/auth/login', nextUrl.origin));
  }

  const role = session.user.role?.toLowerCase();

  // Redirecionamento inteligente da home /
  if (path === '/') {
    switch (role) {
      case 'admin':
        return NextResponse.redirect(new URL('/dashboard', nextUrl.origin));
      case 'cliente':
        return NextResponse.redirect(new URL('/carteirinha', nextUrl.origin));
      case 'parceiro':
        return NextResponse.redirect(new URL('/relatorio', nextUrl.origin));
      default:
        return NextResponse.redirect(new URL('/auth/login', nextUrl.origin));
    }
  }

  // Protege rotas específicas por role
  if (path.startsWith('/(administrador)') && role !== 'admin') {
    return NextResponse.redirect(new URL('/not-authorized', nextUrl.origin));
  }

  if (path.startsWith('/(clientes)') && role !== 'cliente') {
    return NextResponse.redirect(new URL('/not-authorized', nextUrl.origin));
  }

  if (path.startsWith('/(parceiros)') && role !== 'parceiro') {
    return NextResponse.redirect(new URL('/not-authorized', nextUrl.origin));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',                         // Redirecionamento inteligente da home
    '/(administrador)/:path*',   // Protege rotas do admin
    '/(clientes)/:path*',        // Protege rotas de clientes
    '/(parceiros)/:path*',       // Protege rotas de parceiros
  ],
};


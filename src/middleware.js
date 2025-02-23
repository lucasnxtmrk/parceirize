import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';

export async function middleware(req) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const pathname = req.nextUrl.pathname;

    const isAuth = !!token;
    const isLoginPage = pathname === '/auth/login';

    const allowedRoutes = ['/carteirinha', '/relatorio', '/admin']; // Rotas que exigem autenticação

    const isProtectedRoute = allowedRoutes.includes(pathname);

    if (!isAuth && isProtectedRoute && !isLoginPage) {
        return NextResponse.redirect(new URL('/auth/login', req.url));
    }

    if (isAuth && isLoginPage) {
        return NextResponse.redirect(new URL('/', req.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico|auth).*)']
};
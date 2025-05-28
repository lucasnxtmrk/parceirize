import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req) {
    const { nextUrl } = req;
    const session = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    // Se estiver acessando a página principal "/"
    if (nextUrl.pathname === "/") {
        if (!session) {
            // Se não estiver logado, redireciona para a página de login
            return NextResponse.redirect(new URL("/auth/login", req.url));
        }

        // Redirecionar para a página correta conforme a role do usuário
        switch (session.user.role) {
            case "cliente":
                return NextResponse.redirect(new URL("/carteirinha", req.url));
            case "parceiro":
                return NextResponse.redirect(new URL("/relatorio", req.url));
            case "admin":
                return NextResponse.redirect(new URL("/dashboard", req.url));
            default:
                return NextResponse.redirect(new URL("/auth/login", req.url));
        }
    }

    // Permite continuar normalmente caso a URL não seja "/"
    return NextResponse.next();
}

// Define quais rotas serão interceptadas pelo middleware
export const config = {
    matcher: "/",
};

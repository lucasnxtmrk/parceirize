import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(req) {
  const { nextUrl } = req;
  const path = nextUrl.pathname;
  const hostname = req.headers.get('host') || '';
  const session = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // ==========================================
  // 1. DETECÇÃO DE TENANT (SUBDOMÍNIO)
  // ==========================================
  let tenantInfo = null;
  
  // Verifica se é subdomínio (empresa.parceirize.com)
  const subdomain = hostname.split('.')[0];
  const isSubdomain = hostname.includes('.') && 
                      subdomain !== 'www' && 
                      subdomain !== 'parceirize' &&
                      subdomain !== 'localhost';

  if (isSubdomain) {
    tenantInfo = {
      subdomain,
      isTenant: true
    };
  }

  // ==========================================
  // 2. ROTAS PÚBLICAS (SEM AUTENTICAÇÃO)
  // ==========================================
  const publicPaths = [
    '/not-authorized',
    '/auth/',
    '/_next/',
    '/api/auth/',
    '/favicon.ico'
  ];
  
  const isPublicPath = publicPaths.some(publicPath => path.startsWith(publicPath));
  if (isPublicPath) {
    const response = NextResponse.next();
    
    // Adiciona tenant info nos headers se for subdomínio
    if (tenantInfo?.isTenant) {
      response.headers.set('x-tenant-subdomain', tenantInfo.subdomain);
    }
    
    return response;
  }

  // ==========================================
  // 3. VERIFICAÇÃO DE AUTENTICAÇÃO
  // ==========================================
  if (!session) {
    console.log(`🔒 Sem sessão para ${path}, redirecionando para login`);
    return NextResponse.redirect(new URL('/auth/login', nextUrl.origin));
  }

  const role = session.user.role?.toLowerCase();
  const tenantId = session.user.tenant_id;
  console.log(`🎭 Middleware - Path: ${path}, Role: ${role}, TenantId: ${tenantId}`);

  // ==========================================
  // 4. VALIDAÇÃO DE TENANT PARA SUBDOMÍNIO
  // ==========================================
  if (tenantInfo?.isTenant) {
    // Se acessando via subdomínio, deve ter tenant_id na sessão
    if (!tenantId) {
      return NextResponse.redirect(new URL('/not-authorized', nextUrl.origin));
    }
    
    // TODO: Validar se o tenant_id corresponde ao subdomínio
    // (implementar consulta ao banco se necessário)
  }

  // ==========================================
  // 5. REDIRECIONAMENTOS POR ROLE
  // ==========================================
  if (path === '/') {
    switch (role) {
      case 'superadmin':
        return NextResponse.redirect(new URL('/superadmin/dashboard', nextUrl.origin));
      case 'provedor':
        return NextResponse.redirect(new URL('/dashboard', nextUrl.origin));
      case 'cliente':
        return NextResponse.redirect(new URL('/carteirinha', nextUrl.origin));
      case 'parceiro':
        return NextResponse.redirect(new URL('/painel', nextUrl.origin));
      default:
        return NextResponse.redirect(new URL('/auth/login', nextUrl.origin));
    }
  }

  // ==========================================
  // 6. PROTEÇÃO DE ROTAS POR ROLE
  // ==========================================
  
  // Superadmin - acesso total
  if (path.startsWith('/superadmin') && role !== 'superadmin') {
    return NextResponse.redirect(new URL('/not-authorized', nextUrl.origin));
  }

  // Provedor - acesso às rotas de gestão 
  // Rotas dentro do grupo (administrador) são acessadas diretamente
  const provedorRoutes = ['/dashboard', '/admin-cliente', '/admin-parceiro', '/admin-relatorios', '/integracoes', '/importar-clientes', '/admin-configuracoes'];
  const isProvedorRoute = provedorRoutes.some(route => path.startsWith(route));
  
  console.log(`🛡️  Verificando rota provedor: ${path} -> isProvedorRoute: ${isProvedorRoute}, role: "${role}"`);
  console.log(`🔍 Tipo da role: ${typeof role}, Includes test: ${['superadmin', 'provedor'].includes(role)}`);
  console.log(`🔍 Roles permitidas: ['superadmin', 'provedor']`);
  
  if (isProvedorRoute && !['superadmin', 'provedor'].includes(role)) {
    console.log(`❌ ACESSO NEGADO para role "${role}" na rota provedor ${path}`);
    return NextResponse.redirect(new URL('/not-authorized', nextUrl.origin));
  } else if (isProvedorRoute) {
    console.log(`✅ ACESSO PERMITIDO para role "${role}" na rota provedor ${path}`);
  }

  // Clientes - acesso às suas rotas específicas  
  if (path.startsWith('/carteirinha') && role !== 'cliente') {
    return NextResponse.redirect(new URL('/not-authorized', nextUrl.origin));
  }

  // Parceiros - acesso às suas rotas específicas
  if (path.startsWith('/painel') && role !== 'parceiro') {
    return NextResponse.redirect(new URL('/not-authorized', nextUrl.origin));
  }

  // ==========================================
  // 7. ADICIONAR TENANT INFO AOS HEADERS
  // ==========================================
  console.log(`✅ Middleware passou todas as verificações para ${path} com role ${role}`);
  
  const response = NextResponse.next();
  
  if (tenantInfo?.isTenant) {
    response.headers.set('x-tenant-subdomain', tenantInfo.subdomain);
  }
  
  if (tenantId) {
    response.headers.set('x-tenant-id', tenantId);
  }
  
  response.headers.set('x-user-role', role);
  
  return response;
}

export const config = {
  matcher: [
    '/',                         // Redirecionamento inteligente da home
    '/dashboard',                // Dashboard do provedor (página principal)
    '/dashboard/:path*',         // Dashboard do provedor (subpáginas)
    '/admin-cliente',            // Gestão de clientes (página principal)
    '/admin-cliente/:path*',     // Gestão de clientes (subpáginas)
    '/admin-parceiro',           // Gestão de parceiros (página principal)
    '/admin-parceiro/:path*',    // Gestão de parceiros (subpáginas)
    '/admin-relatorios',         // Relatórios (página principal)
    '/admin-relatorios/:path*',  // Relatórios (subpáginas)
    '/integracoes',              // Integrações (página principal)
    '/integracoes/:path*',       // Integrações (subpáginas)
    '/importar-clientes',        // Importação (página principal)
    '/importar-clientes/:path*', // Importação (subpáginas)
    '/admin-configuracoes',      // Configurações (página principal)
    '/admin-configuracoes/:path*', // Configurações (subpáginas)
    '/superadmin/:path*',        // Protege rotas do superadmin
    '/carteirinha/:path*',       // Protege rotas de clientes
    '/painel/:path*',            // Protege rotas de parceiros
    '/api/:path*',               // Adiciona tenant info nas APIs
  ],
};


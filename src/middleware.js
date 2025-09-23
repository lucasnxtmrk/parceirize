import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { CookieHelper } from '@/lib/cookie-helper.js';

// Lista estática de domínios conhecidos para Edge Runtime
const KNOWN_TENANTS = {
  'teste.localhost:3000': {
    tenant_id: '2da2a5f3-fea6-4112-9203-0f4b38097d77',
    provedor_id: 2,
    nome_empresa: 'Loja Teste Multi-Tenant'
  },
  'teste.localhost': {
    tenant_id: '2da2a5f3-fea6-4112-9203-0f4b38097d77',
    provedor_id: 2,
    nome_empresa: 'Loja Teste Multi-Tenant'
  },
  'empresa1.localhost:3000': {
    tenant_id: '2783a418-29ab-43bd-b568-88a6d4d9bf98',
    provedor_id: 3,
    nome_empresa: 'Empresa Teste 1'
  },
  'empresa1.localhost': {
    tenant_id: '2783a418-29ab-43bd-b568-88a6d4d9bf98',
    provedor_id: 3,
    nome_empresa: 'Empresa Teste 1'
  },
  'empresa2.localhost:3000': {
    tenant_id: '77542648-7bb7-481f-a5c2-b6c3e5308ba6',
    provedor_id: 4,
    nome_empresa: 'Empresa Teste 2'
  },
  'empresa2.localhost': {
    tenant_id: '77542648-7bb7-481f-a5c2-b6c3e5308ba6',
    provedor_id: 4,
    nome_empresa: 'Empresa Teste 2'
  },
  'clube.localhost:3000': {
    tenant_id: '7853095c-b20a-46cb-b42a-468fc046304c',
    provedor_id: 5,
    nome_empresa: 'Clube de Desconto Local'
  },
  'clube.localhost': {
    tenant_id: '7853095c-b20a-46cb-b42a-468fc046304c',
    provedor_id: 5,
    nome_empresa: 'Clube de Desconto Local'
  },
  // Domínios de produção
  'empresa1.parceirize.com.br': {
    tenant_id: '2783a418-29ab-43bd-b568-88a6d4d9bf98',
    provedor_id: 3,
    nome_empresa: 'Empresa Teste 1'
  },
  'empresa2.parceirize.com.br': {
    tenant_id: '77542648-7bb7-481f-a5c2-b6c3e5308ba6',
    provedor_id: 4,
    nome_empresa: 'Empresa Teste 2'
  },
  'teste.parceirize.com.br': {
    tenant_id: '2da2a5f3-fea6-4112-9203-0f4b38097d77',
    provedor_id: 2,
    nome_empresa: 'Loja Teste Multi-Tenant'
  },
  'clube.parceirize.com.br': {
    tenant_id: '7853095c-b20a-46cb-b42a-468fc046304c',
    provedor_id: 5,
    nome_empresa: 'Clube de Desconto Local'
  }
};

// Função simplificada para detectar tipo de domínio (sem fetch)
function detectDomainType(hostname) {
  if (!hostname) return { type: 'main' };

  // Domínios de superadmin (sempre estáticos)
  const adminDomains = [
    'admin.localhost',
    'admin.localhost:3000',
    'admin.parceirize.com.br',
    'admin.parceirize.com'
  ];

  if (adminDomains.includes(hostname.toLowerCase())) {
    return {
      isTenant: false,
      isSuperadmin: true,
      type: 'admin',
      domain: hostname
    };
  }

  // Verificar domínios tenant conhecidos
  const tenantInfo = KNOWN_TENANTS[hostname.toLowerCase()];
  if (tenantInfo) {
    console.log(`✅ Middleware: Tenant encontrado para ${hostname} -> ${tenantInfo.nome_empresa}`);
    return {
      isTenant: true,
      isSuperadmin: false,
      type: 'tenant',
      domain: hostname,
      tenant_id: tenantInfo.tenant_id,
      provedor_id: tenantInfo.provedor_id,
      nome_empresa: tenantInfo.nome_empresa
    };
  }

  // Fallback para padrões gerais (novos subdomínios)
  const tenantPatterns = [
    /^[\w-]+\.localhost(:\d+)?$/,
    /^[\w-]+\.parceirize\.com\.br$/
  ];

  const isTenantPattern = tenantPatterns.some(pattern =>
    pattern.test(hostname.toLowerCase())
  );

  if (isTenantPattern) {
    // Extrair subdomínio para domínios dinâmicos
    const subdomainMatch = hostname.match(/^([^.]+)\./);
    const subdomain = subdomainMatch ? subdomainMatch[1] : null;

    console.log(`🔄 Middleware: Domínio ${hostname} detectado como tenant dinâmico (subdomínio: ${subdomain})`);

    // Para subdomínios não conhecidos, permitir mas marcar como não validado
    // A validação será feita nas páginas que precisam de dados do tenant
    return {
      isTenant: true,
      isSuperadmin: false,
      type: 'tenant',
      domain: hostname,
      subdomain: subdomain,
      uncached: true, // Flag para indicar que não está na lista
      needsValidation: true // Flag para validação posterior
    };
  }

  // Domínio principal (localhost:3000)
  return {
    isTenant: false,
    isSuperadmin: false,
    type: 'main',
    domain: hostname
  };
}

export async function middleware(req) {
  const { nextUrl } = req;
  const path = nextUrl.pathname;
  const hostname = req.headers.get('host') || '';

  // Usar configuração dinâmica de cookies para o getToken
  const cookieConfig = CookieHelper.getNextAuthCookieConfig(req);
  const cookieName = cookieConfig.sessionToken.name;

  const session = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: cookieName
  });

  // ==========================================
  // 1. DETECÇÃO DE TENANT (ESTÁTICA PARA EDGE RUNTIME)
  // ==========================================
  const baseUrl = `${nextUrl.protocol}//${hostname}`;
  const tenantInfo = detectDomainType(hostname);

  console.log(`🔍 Middleware - Hostname: ${hostname}, Type: ${tenantInfo.type}, isTenant: ${tenantInfo.isTenant}`);

  // ==========================================
  // REDIRECIONAMENTOS POR TIPO DE DOMÍNIO (PRIORIDADE)
  // ==========================================

  // DOMÍNIO PRINCIPAL (localhost:3000) - Redirecionar tudo para home
  if (tenantInfo?.type === 'main') {
    // Rotas permitidas no domínio principal
    const allowedMainPaths = ['/', '/not-authorized'];
    const mainPublicAssets = ['/_next/', '/api/auth/', '/favicon.ico', '/.well-known/', '/robots.txt', '/sitemap.xml'];
    const isPublicAsset = mainPublicAssets.some(p => path.startsWith(p));

    // Se não for rota permitida nem asset público, redirecionar para home
    if (!allowedMainPaths.includes(path) && !isPublicAsset) {
      console.log(`🔄 Domínio principal: redirecionando ${path} para /`);
      return NextResponse.redirect(new URL('/', baseUrl));
    }
  }

  // DOMÍNIOS DE TENANT - Redirecionar /login para /auth/login
  if (tenantInfo?.isTenant && path === '/login') {
    console.log(`🔄 Domínio tenant: redirecionando /login para /auth/login`);
    return NextResponse.redirect(new URL('/auth/login', baseUrl));
  }

  // DOMÍNIO ADMIN - Redirecionar /login para /auth/login
  if (tenantInfo?.type === 'admin' && path === '/login') {
    console.log(`🔄 Domínio admin: redirecionando /login para /auth/login`);
    return NextResponse.redirect(new URL('/auth/login', baseUrl));
  }

  // ==========================================
  // 2. ROTAS PÚBLICAS (SEM AUTENTICAÇÃO)
  // ==========================================
  const publicPaths = [
    '/not-authorized',
    '/auth/',
    '/_next/',
    '/api/auth/',
    '/api/domain/', // APIs de domínio personalizadas
    '/favicon.ico',
    '/.well-known/', // Para verificação de domínio
    '/robots.txt',
    '/sitemap.xml'
  ];

  // Permitir acesso público à landing page no domínio principal
  const isMainDomainHomePage = (tenantInfo?.type === 'main' && path === '/');

  const isTenantLoginRoute = tenantInfo?.type === 'tenant' &&
    (path === '/auth/login' || path.startsWith('/auth/login/') ||
     path === '/parceiro/login' || path === '/admin/login');

  const isPublicPath = publicPaths.some(publicPath => path.startsWith(publicPath)) ||
                      isTenantLoginRoute ||
                      isMainDomainHomePage;

  if (isPublicPath) {
    const response = NextResponse.next();

    // Adicionar headers de tenant se detectado
    if (tenantInfo?.type === 'tenant') {
      response.headers.set('x-tenant-domain', tenantInfo.domain);
      response.headers.set('x-tenant-type', tenantInfo.type);

      // Adicionar subdomínio para validação dinâmica
      if (tenantInfo.subdomain) {
        response.headers.set('x-tenant-subdomain', tenantInfo.subdomain);
      }

      // Adicionar tenant_id do middleware se disponível (para APIs)
      if (tenantInfo.tenant_id) {
        response.headers.set('x-tenant-id', tenantInfo.tenant_id);
      }

      // Flag se precisa de validação
      if (tenantInfo.needsValidation) {
        response.headers.set('x-tenant-needs-validation', 'true');
      }
    }

    return response;
  }

  // ==========================================
  // 3. VERIFICAÇÃO DE AUTENTICAÇÃO
  // ==========================================
  if (!session) {
    console.log(`🔒 Sem sessão para ${path}, redirecionando para login`);

    // DOMÍNIO PRINCIPAL - sempre redireciona para home
    if (tenantInfo?.type === 'main') {
      console.log(`🏠 Domínio principal sem sessão: redirecionando para /`);
      return NextResponse.redirect(new URL('/', baseUrl));
    }

    // DOMÍNIO DE SUPERADMIN - redireciona para login admin
    if (tenantInfo?.type === 'admin') {
      console.log(`👑 Domínio admin sem sessão: redirecionando para /auth/login`);
      return NextResponse.redirect(new URL('/auth/login', baseUrl));
    }

    // DOMÍNIOS DE TENANT - redirecionamento baseado na rota
    if (tenantInfo?.type === 'tenant') {
      if (path.startsWith('/painel')) {
        console.log(`👥 Rota parceiro sem sessão: redirecionando para /parceiro/login`);
        return NextResponse.redirect(new URL('/parceiro/login', baseUrl));
      } else if (path.startsWith('/dashboard') || path.startsWith('/admin-')) {
        console.log(`🏢 Rota admin sem sessão: redirecionando para /admin/login`);
        return NextResponse.redirect(new URL('/admin/login', baseUrl));
      } else {
        console.log(`🎫 Rota cliente sem sessão: redirecionando para /auth/login`);
        return NextResponse.redirect(new URL('/auth/login', baseUrl));
      }
    }

    // Fallback: redirecionar para home
    console.log(`❓ Domínio desconhecido sem sessão: redirecionando para /`);
    return NextResponse.redirect(new URL('/', baseUrl));
  }

  const role = session.user.role?.toLowerCase();
  const sessionTenantId = session.user.tenant_id;
  console.log(`🎭 Middleware - Path: ${path}, Role: ${role}, Domain: ${hostname}, Type: ${tenantInfo?.type}`);

  // ==========================================
  // 4. VALIDAÇÃO DE DOMÍNIO DE SUPERADMIN
  // ==========================================
  if (tenantInfo?.type === 'admin') {
    // DOMÍNIO DE SUPERADMIN - ACESSO RESTRITO
    if (role !== 'superadmin') {
      console.log(`❌ Usuário não-superadmin (${role}) tentando acessar domínio de admin: ${hostname}`);
      return NextResponse.redirect(new URL('/not-authorized?reason=admin_domain_restricted', nextUrl.origin));
    }
    console.log(`👑 Superadmin acessando domínio administrativo: ${hostname}`);
  }

  // ==========================================
  // 5. VALIDAÇÃO DE TENANT PARA DOMÍNIO
  // ==========================================
  else if (tenantInfo?.type === 'tenant') {
    // Para domínios de tenant, aplicar validações básicas

    // Superadmin NÃO pode acessar domínios de tenant (isolamento de segurança)
    if (role === 'superadmin') {
      console.log(`❌ Superadmin tentando acessar domínio de tenant: ${hostname}`);
      return NextResponse.redirect(new URL('/not-authorized?reason=superadmin_restricted', nextUrl.origin));
    }

    // Para outros usuários, verificar se têm tenant_id (validação será feita no NextAuth)
    if (sessionTenantId) {
      console.log(`✅ Usuário com tenant ${sessionTenantId} acessando domínio ${hostname}`);
    } else {
      console.log(`⚠️ Usuário sem tenant acessando domínio ${hostname} - validação será feita no login`);
    }
  }

  // ==========================================
  // 6. REDIRECIONAMENTOS POR ROLE E DOMÍNIO (apenas para usuários logados)
  // ==========================================
  if (path === '/' && session) {
    const baseUrl = `${nextUrl.protocol}//${hostname}`;

    // Domínio principal (landing page) - permitir acesso mesmo logado
    if (tenantInfo?.type === 'main') {
      return NextResponse.next();
    }

    // Domínios específicos - redirecionamento baseado na role
    switch (role) {
      case 'superadmin':
        if (tenantInfo?.type === 'admin') {
          return NextResponse.redirect(new URL('/superadmin/dashboard', baseUrl));
        } else {
          // Superadmin tentando acessar domínio de provedor
          return NextResponse.redirect(new URL('/not-authorized?reason=superadmin_restricted', baseUrl));
        }
      case 'provedor':
        return NextResponse.redirect(new URL('/dashboard', baseUrl));
      case 'cliente':
        return NextResponse.redirect(new URL('/carteirinha', baseUrl));
      case 'parceiro':
        return NextResponse.redirect(new URL('/painel', baseUrl));
      default:
        return NextResponse.redirect(new URL('/auth/login', baseUrl));
    }
  }

  // ==========================================
  // 7. PROTEÇÃO DE ROTAS POR ROLE
  // ==========================================

  // Superadmin - acesso total
  if (path.startsWith('/superadmin') && role !== 'superadmin') {
    return NextResponse.redirect(new URL('/not-authorized', nextUrl.origin));
  }

  // Provedor - acesso às rotas de gestão
  const provedorRoutes = ['/dashboard', '/admin-cliente', '/admin-parceiro', '/admin-relatorios', '/integracoes', '/importar-clientes', '/admin-configuracoes'];
  const isProvedorRoute = provedorRoutes.some(route => path.startsWith(route));

  console.log(`🛡️  Verificando rota provedor: ${path} -> isProvedorRoute: ${isProvedorRoute}, role: "${role}"`);

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
  // 8. ADICIONAR TENANT INFO AOS HEADERS
  // ==========================================
  console.log(`✅ Middleware passou todas as verificações para ${path} com role ${role}`);

  const response = NextResponse.next();

  // Headers de tenant do domínio
  if (tenantInfo?.type === 'tenant') {
    response.headers.set('x-tenant-domain', tenantInfo.domain);
    response.headers.set('x-tenant-type', tenantInfo.type);

    // Adicionar subdomínio para validação dinâmica
    if (tenantInfo.subdomain) {
      response.headers.set('x-tenant-subdomain', tenantInfo.subdomain);
    }

    // Adicionar tenant_id do middleware se disponível
    if (tenantInfo.tenant_id) {
      response.headers.set('x-tenant-id', tenantInfo.tenant_id);
    }

    // Flag se precisa de validação
    if (tenantInfo.needsValidation) {
      response.headers.set('x-tenant-needs-validation', 'true');
    }
  }

  // Headers de sessão
  if (sessionTenantId) {
    response.headers.set('x-session-tenant-id', sessionTenantId);
  }

  response.headers.set('x-user-role', role);
  response.headers.set('x-hostname', hostname);

  return response;
}

export const config = {
  matcher: [
    '/',                         // Redirecionamento inteligente da home
    '/login',                    // Rota de login que precisa redirecionamento
    '/auth/login',               // Login funcional
    '/auth/:path*',              // Todas as rotas de auth
    '/admin/login',              // Login do admin
    '/parceiro/login',           // Login do parceiro
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
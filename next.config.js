require('dotenv').config({ path: '.env.local' });

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Variáveis de ambiente expostas ao cliente
  env: {
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    ENABLE_CUSTOM_DOMAINS: process.env.ENABLE_CUSTOM_DOMAINS,
    PRIMARY_DOMAIN: process.env.PRIMARY_DOMAIN,
  },

  // Configurações para domínios personalizados
  async headers() {
    return [
      {
        // Aplicar a todos os routes
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Headers personalizados serão adicionados pelo middleware
        ],
      },
    ];
  },

  // Rewrites para domínios personalizados (se necessário)
  async rewrites() {
    return [
      // Rewrite para verificação de domínio via well-known
      {
        source: '/.well-known/parceirize-domain-verification/:token',
        destination: '/api/domain/verify/:token',
      },
    ];
  },

  eslint: {
    ignoreDuringBuilds: true,
  },

  // Configurações experimentais para melhor performance
  experimental: {
    // Otimizações para multi-tenancy
    // optimizeCss: true, // Temporariamente desabilitado para resolver erro critters
    optimizePackageImports: ['react-bootstrap', '@fortawesome/react-fontawesome'],
  },

  // Configurações de imagem para domínios personalizados
  images: {
    domains: [
      'localhost',
      'parceirize.com',
      '*.parceirize.com',
      // Adicionar domínios personalizados dinamicamente seria ideal
    ],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

module.exports = nextConfig;
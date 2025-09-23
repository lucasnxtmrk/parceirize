// Cache simples em memória para tenants validados
const tenantCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

export async function validateTenantDynamic(subdomain, hostname) {
  // Verificar cache primeiro
  const cacheKey = subdomain.toLowerCase();
  const cached = tenantCache.get(cacheKey);

  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    console.log(`📦 Cache hit para tenant: ${subdomain}`);
    return cached.data;
  }

  try {
    // Fazer requisição para API de validação
    const baseUrl = process.env.NEXTAUTH_URL || `https://${hostname}`;
    const response = await fetch(`${baseUrl}/api/tenant/validate?subdomain=${subdomain}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.log(`❌ Tenant não encontrado: ${subdomain}`);
      return null;
    }

    const data = await response.json();

    if (data.valid) {
      // Adicionar ao cache
      tenantCache.set(cacheKey, {
        data: {
          tenant_id: data.tenant_id,
          provedor_id: data.provedor_id,
          nome_empresa: data.nome_empresa,
          subdomain: data.subdomain
        },
        timestamp: Date.now()
      });

      console.log(`✅ Tenant validado dinamicamente: ${subdomain} -> ${data.nome_empresa}`);
      return tenantCache.get(cacheKey).data;
    }

    return null;

  } catch (error) {
    console.error(`Erro ao validar tenant ${subdomain}:`, error);
    return null;
  }
}

// Limpar cache periodicamente
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of tenantCache.entries()) {
    if ((now - value.timestamp) > CACHE_TTL) {
      tenantCache.delete(key);
    }
  }
}, CACHE_TTL);
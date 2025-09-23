import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { DomainHelper } from '@/lib/domain-helper';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function POST(request) {
  try {
    const { documento } = await request.json();

    if (!documento) {
      return NextResponse.json(
        { exists: false, error: 'CPF ou CNPJ é obrigatório' },
        { status: 400 }
      );
    }

    // ==========================================
    // DETECÇÃO DE TENANT BASEADA NO DOMÍNIO OU HEADER
    // ==========================================
    const hostname = request.headers.get('host') || '';

    // Primeiro tenta usar DomainHelper
    let tenantInfo = await DomainHelper.detectTenantByDomain(hostname);

    // Se falhar, usar informações do middleware via headers
    if (!tenantInfo || !tenantInfo.tenant_id) {
      const tenantIdFromHeader = request.headers.get('x-session-tenant-id') || request.headers.get('x-tenant-id');

      if (tenantIdFromHeader) {
        console.log(`📡 Usando tenant_id do header: ${tenantIdFromHeader}`);
        tenantInfo = {
          tenant_id: tenantIdFromHeader,
          isSuperadmin: false,
          type: 'tenant'
        };
      }
    }

    // Verificar se é domínio de superadmin
    if (tenantInfo?.isSuperadmin) {
      return NextResponse.json(
        { exists: false, error: 'Acesso não permitido no domínio administrativo' },
        { status: 403 }
      );
    }

    // Para domínios de tenant, verificar se tenant existe e está ativo
    if (!tenantInfo || !tenantInfo.tenant_id) {
      return NextResponse.json(
        { exists: false, error: 'Domínio não configurado ou inativo' },
        { status: 400 }
      );
    }

    const tenantId = tenantInfo.tenant_id;

    // Remove máscara do documento
    const documentoLimpo = documento.replace(/\D/g, '');

    // Detectar tipo de documento
    let tipoDocumento;
    let documentoFormatado;

    if (documentoLimpo.length === 11) {
      // CPF
      tipoDocumento = 'CPF';
      documentoFormatado = documentoLimpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else if (documentoLimpo.length === 14) {
      // CNPJ
      tipoDocumento = 'CNPJ';
      documentoFormatado = documentoLimpo.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    } else {
      return NextResponse.json(
        { exists: false, error: 'Documento deve ter 11 dígitos (CPF) ou 14 dígitos (CNPJ)' },
        { status: 400 }
      );
    }

    // Busca cliente pelo documento com isolamento de tenant
    const query = `
      SELECT
        id,
        nome,
        sobrenome,
        email,
        ativo,
        cpf_cnpj,
        tenant_id
      FROM clientes
      WHERE (
        cpf_cnpj = $1 OR
        cpf_cnpj = $2 OR
        REPLACE(REPLACE(REPLACE(REPLACE(cpf_cnpj, '.', ''), '-', ''), '/', ''), ' ', '') = $1
      ) AND ativo = true
        AND tenant_id = $3
    `;

    // Log para depuração
    console.log(`🔍 Verificando documento: ${documento} no domínio: ${hostname}`);
    console.log(`🏢 Tenant detectado: ${tenantInfo.nome_empresa} (Tenant ID: ${tenantId})`);
    console.log(`🔎 Documento formatado: ${documentoFormatado}, limpo: ${documentoLimpo}`);

    // Consulta com isolamento de tenant
    const result = await pool.query(query, [documentoLimpo, documentoFormatado, tenantId]);

    console.log(`📊 Resultados encontrados: ${result.rows.length} no tenant ${tenantId}`);

    if (result.rows.length === 0) {
      return NextResponse.json({
        exists: false,
        message: `${tipoDocumento} não encontrado neste provedor ou conta inativa`
      });
    }

    const cliente = result.rows[0];

    return NextResponse.json({
      exists: true,
      tipoDocumento,
      cliente: {
        id: cliente.id,
        nome: cliente.nome,
        sobrenome: cliente.sobrenome,
        email: cliente.email,
        cpf_cnpj: cliente.cpf_cnpj
      }
    });

  } catch (error) {
    console.error('Erro ao verificar documento:', error);
    return NextResponse.json(
      { exists: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
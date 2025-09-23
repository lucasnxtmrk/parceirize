import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { DomainHelper } from '@/lib/domain-helper';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'E-mail e senha são obrigatórios' },
        { status: 400 }
      );
    }

    // ==========================================
    // DETECÇÃO DE TENANT BASEADA NO DOMÍNIO
    // ==========================================
    const hostname = request.headers.get('host') || '';
    const tenantInfo = await DomainHelper.detectTenantByDomain(hostname);

    // Verificar se é domínio de superadmin
    if (tenantInfo?.isSuperadmin) {
      return NextResponse.json(
        { success: false, message: 'Acesso não permitido no domínio administrativo' },
        { status: 403 }
      );
    }

    // Para domínios de tenant, verificar se tenant existe e está ativo
    if (!tenantInfo || !tenantInfo.tenant_id) {
      return NextResponse.json(
        { success: false, message: 'Domínio não configurado ou inativo' },
        { status: 400 }
      );
    }

    const tenantId = tenantInfo.tenant_id;

    // Log para depuração
    console.log(`🔍 Login parceiro: ${email} no domínio: ${hostname}`);
    console.log(`🏢 Tenant detectado: ${tenantInfo.nome_empresa} (Tenant ID: ${tenantId})`);

    // CONSULTA ESPECÍFICA: Apenas parceiros com isolamento de tenant
    const query = `
      SELECT id,
             nome_empresa AS nome,
             NULL AS sobrenome,
             email,
             NULL AS cpf_cnpj,
             NULL AS id_carteirinha,
             NULL AS data_ultimo_voucher,
             true AS ativo,
             tenant_id,
             senha AS "password",
             'parceiro' AS role
      FROM parceiros
      WHERE email = $1 AND tenant_id = $2
    `;

    const result = await pool.query(query, [email, tenantId]);

    console.log(`📊 Resultados encontrados: ${result.rows.length} no tenant ${tenantId}`);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'E-mail não encontrado neste provedor ou não é uma conta de parceiro' },
        { status: 401 }
      );
    }

    const userRecord = result.rows[0];

    // Verificar senha
    const senhaCorreta = await bcrypt.compare(password, userRecord.password);
    if (!senhaCorreta) {
      return NextResponse.json(
        { success: false, message: 'Senha incorreta' },
        { status: 401 }
      );
    }

    // Retornar dados do usuário (sem senha)
    const { password: _, ...userData } = userRecord;

    return NextResponse.json({
      success: true,
      user: userData,
      message: 'Autenticação de parceiro realizada com sucesso'
    });

  } catch (error) {
    console.error('Erro na autenticação de parceiro:', error);
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
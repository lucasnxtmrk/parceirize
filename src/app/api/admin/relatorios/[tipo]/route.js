import { Pool } from "pg";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";
import { withTenantIsolation } from "@/lib/tenant-helper";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const GET = withTenantIsolation(async (request, { params, tenant }) => {
  try {
    console.log("📊 Gerando relatório:", params.tipo);

    const { searchParams } = new URL(request.url);
    const periodo = searchParams.get('periodo') || '30';

    let query = '';
    let queryParams = [];

    switch (params.tipo) {
      case 'clientes':
        if (tenant.isGlobalAccess) {
          query = `
            SELECT 
              nome,
              sobrenome,
              email,
              id_carteirinha,
              ativo,
              data_criacao::date as data_cadastro
            FROM clientes 
            WHERE data_criacao >= NOW() - INTERVAL '${periodo} days'
            ORDER BY data_criacao DESC
          `;
        } else {
          query = `
            SELECT 
              nome,
              sobrenome,
              email,
              id_carteirinha,
              ativo,
              data_criacao::date as data_cadastro
            FROM clientes 
            WHERE tenant_id = $1 AND data_criacao >= NOW() - INTERVAL '${periodo} days'
            ORDER BY data_criacao DESC
          `;
          queryParams.push(tenant.tenant_id);
        }
        break;

      case 'parceiros':
        if (tenant.isGlobalAccess) {
          query = `
            SELECT 
              nome_empresa,
              email,
              nicho,
              ativo,
              data_criacao::date as data_cadastro
            FROM parceiros 
            WHERE data_criacao >= NOW() - INTERVAL '${periodo} days'
            ORDER BY data_criacao DESC
          `;
        } else {
          query = `
            SELECT 
              nome_empresa,
              email,
              nicho,
              ativo,
              data_criacao::date as data_cadastro
            FROM parceiros 
            WHERE tenant_id = $1 AND data_criacao >= NOW() - INTERVAL '${periodo} days'
            ORDER BY data_criacao DESC
          `;
          queryParams.push(tenant.tenant_id);
        }
        break;

      case 'vouchers-utilizados':
        if (tenant.isGlobalAccess) {
          query = `
            SELECT 
              v.codigo as voucher_codigo,
              p.nome_empresa as parceiro,
              c.nome as cliente_nome,
              c.email as cliente_email,
              vu.data_utilizacao::date as data_uso,
              vu.desconto
            FROM voucher_utilizados vu
            JOIN vouchers v ON vu.voucher_id = v.id
            JOIN parceiros p ON v.parceiro_id = p.id
            JOIN clientes c ON vu.cliente_id = c.id
            WHERE vu.data_utilizacao >= NOW() - INTERVAL '${periodo} days'
            ORDER BY vu.data_utilizacao DESC
          `;
        } else {
          query = `
            SELECT 
              v.codigo as voucher_codigo,
              p.nome_empresa as parceiro,
              c.nome as cliente_nome,
              c.email as cliente_email,
              vu.data_utilizacao::date as data_uso,
              vu.desconto
            FROM voucher_utilizados vu
            JOIN vouchers v ON vu.voucher_id = v.id
            JOIN parceiros p ON v.parceiro_id = p.id
            JOIN clientes c ON vu.cliente_id = c.id
            WHERE c.tenant_id = $1 AND vu.data_utilizacao >= NOW() - INTERVAL '${periodo} days'
            ORDER BY vu.data_utilizacao DESC
          `;
          queryParams.push(tenant.tenant_id);
        }
        break;

      case 'resumo-geral':
        if (tenant.isGlobalAccess) {
          query = `
            SELECT 
              'Total Clientes' as metrica,
              COUNT(*) as valor
            FROM clientes 
            WHERE ativo = true
            UNION ALL
            SELECT 
              'Total Parceiros' as metrica,
              COUNT(*) as valor
            FROM parceiros 
            WHERE ativo = true
            UNION ALL
            SELECT 
              'Vouchers Utilizados (${periodo}d)' as metrica,
              COUNT(*) as valor
            FROM voucher_utilizados 
            WHERE data_utilizacao >= NOW() - INTERVAL '${periodo} days'
          `;
        } else {
          query = `
            SELECT 
              'Total Clientes' as metrica,
              COUNT(*) as valor
            FROM clientes 
            WHERE tenant_id = $1 AND ativo = true
            UNION ALL
            SELECT 
              'Total Parceiros' as metrica,
              COUNT(*) as valor
            FROM parceiros 
            WHERE tenant_id = $2 AND ativo = true
            UNION ALL
            SELECT 
              'Vouchers Utilizados (${periodo}d)' as metrica,
              COUNT(*) as valor
            FROM voucher_utilizados vu
            JOIN clientes c ON vu.cliente_id = c.id
            WHERE c.tenant_id = $3 AND vu.data_utilizacao >= NOW() - INTERVAL '${periodo} days'
          `;
          queryParams = [tenant.tenant_id, tenant.tenant_id, tenant.tenant_id];
        }
        break;

      default:
        return new Response(
          JSON.stringify({ error: "Tipo de relatório inválido" }), 
          { status: 400 }
        );
    }

    const result = await pool.query(query, queryParams);

    return new Response(JSON.stringify({
      tipo: params.tipo,
      periodo: `${periodo} dias`,
      total: result.rows.length,
      dados: result.rows,
      gerado_em: new Date().toISOString(),
      tenant_info: {
        tenant_id: tenant.tenant_id,
        is_global: tenant.isGlobalAccess,
        role: tenant.role
      }
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ Erro ao gerar relatório:", error);
    return new Response(
      JSON.stringify({ error: "Erro ao gerar relatório" }), 
      { status: 500 }
    );
  }
});
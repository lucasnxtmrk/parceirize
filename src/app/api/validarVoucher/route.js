import { Pool } from "pg";
import { withTenantIsolation, logTenantAction } from "@/lib/tenant-helper";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const POST = withTenantIsolation(async (request, { tenant }) => {
  try {
    if (tenant.role !== "parceiro") {
      return new Response(JSON.stringify({ error: "Acesso negado. Apenas parceiros podem validar vouchers." }), { status: 403 });
    }

    const { clientId, couponCode } = await request.json();

    console.log(`📡 Validando voucher ${couponCode} para cliente ${clientId} no tenant ${tenant.tenant_id}...`);

    // 1️⃣ Verificar se o cliente existe no mesmo tenant
    const clienteQuery = `
      SELECT id, data_ultimo_voucher, tenant_id
      FROM clientes
      WHERE id_carteirinha = $1 AND tenant_id = $2 AND ativo = true
    `;
    const clienteResult = await pool.query(clienteQuery, [clientId, tenant.tenant_id]);

    if (clienteResult.rows.length === 0) {
      return new Response(JSON.stringify({ error: "Cliente não encontrado ou inativo neste provedor." }), { status: 404 });
    }

    const cliente = clienteResult.rows[0];

    // 2️⃣ Verificar se o voucher existe, pertence ao parceiro logado E está no mesmo tenant
    const voucherQuery = `
      SELECT
        v.id AS voucher_id,
        v.desconto,
        v.data_criacao,
        v.limite_uso,
        v.parceiro_id,
        v.tenant_id,
        p.email AS parceiro_email,
        p.nome_empresa AS parceiro_nome
      FROM vouchers v
      INNER JOIN parceiros p ON v.parceiro_id = p.id
      WHERE v.codigo = $1 AND p.id = $2 AND p.tenant_id = $3 AND p.ativo = true
    `;
    const voucherResult = await pool.query(voucherQuery, [couponCode, tenant.user.id, tenant.tenant_id]);

    if (voucherResult.rows.length === 0) {
      return new Response(JSON.stringify({ error: "Voucher inválido, inexistente ou você não tem permissão para validá-lo." }), { status: 404 });
    }

    const voucher = voucherResult.rows[0];

    // 4️⃣ Verificar se o cliente já utilizou este voucher nos últimos 30 dias (se houver limite)
    if (voucher.limite_uso !== null) {
      const usoQuery = `
        SELECT COUNT(*) AS total_uso
        FROM voucher_utilizados vu
        INNER JOIN vouchers v ON vu.voucher_id = v.id
        WHERE vu.cliente_id = $1 AND vu.voucher_id = $2
        AND vu.data_utilizacao >= NOW() - INTERVAL '30 days'
        AND v.tenant_id = $3
      `;
      const usoResult = await pool.query(usoQuery, [cliente.id, voucher.voucher_id, tenant.tenant_id]);
      const totalUsos = parseInt(usoResult.rows[0].total_uso, 10);

      console.log(`🎯 O cliente já utilizou este voucher ${totalUsos} vezes. Limite: ${voucher.limite_uso}`);

      if (totalUsos >= voucher.limite_uso) {
        return new Response(JSON.stringify({ error: "Limite de uso do voucher atingido nos últimos 30 dias." }), { status: 403 });
      }
    }

    // 5️⃣ Registrar o uso do voucher (isolamento feito via relações)
    const registrarUsoQuery = `
      INSERT INTO voucher_utilizados (cliente_id, voucher_id, data_utilizacao, desconto)
      VALUES ($1, $2, NOW(), $3)
    `;
    await pool.query(registrarUsoQuery, [cliente.id, voucher.voucher_id, voucher.desconto]);

    // 6️⃣ Atualizar a data do último uso do cliente
    const atualizarClienteQuery = `
      UPDATE clientes
      SET data_ultimo_voucher = NOW()
      WHERE id = $1 AND tenant_id = $2
    `;
    await pool.query(atualizarClienteQuery, [cliente.id, tenant.tenant_id]);

    // 7️⃣ Log da ação para auditoria
    await logTenantAction(
      tenant.tenant_id,
      tenant.user.id,
      'parceiro',
      'voucher_validado',
      {
        voucher_codigo: couponCode,
        cliente_id: clientId,
        parceiro_nome: voucher.parceiro_nome,
        desconto: voucher.desconto
      }
    );

    console.log(`✅ Voucher ${couponCode} validado para cliente ${clientId} no tenant ${tenant.tenant_id}`);

    return new Response(JSON.stringify({
      success: true,
      message: "Voucher validado com sucesso!",
      desconto: voucher.desconto,
      parceiro: voucher.parceiro_nome
    }), { status: 200 });

  } catch (error) {
    console.error("❌ Erro na validação do voucher:", error);
    return new Response(JSON.stringify({ error: "Erro interno ao validar voucher." }), { status: 500 });
  }
});

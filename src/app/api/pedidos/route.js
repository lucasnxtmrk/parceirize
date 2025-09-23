import { Pool } from "pg";
import { withTenantIsolation } from "@/lib/tenant-helper";
import { v4 as uuidv4 } from 'uuid';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// ✅ GET - BUSCAR PEDIDOS COM ISOLAMENTO MULTI-TENANT
export const GET = withTenantIsolation(async (request, { tenant }) => {
  try {
    if (!['cliente'].includes(tenant.role)) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), { status: 403 });
    }

    console.log("📦 Buscando pedidos para cliente:", tenant.user.id, "no tenant:", tenant.tenant_id);

    const clienteId = tenant.user.id;

    const query = `
      SELECT
        p.id,
        p.qr_code,
        p.status,
        p.total,
        p.created_at,
        p.validated_at,
        COUNT(pi.id) AS total_itens
      FROM pedidos p
      LEFT JOIN pedido_itens pi ON p.id = pi.pedido_id
      INNER JOIN clientes c ON p.cliente_id = c.id
      WHERE p.cliente_id = $1 AND c.tenant_id = $2
      GROUP BY p.id, p.qr_code, p.status, p.total, p.created_at, p.validated_at
      ORDER BY p.created_at DESC
    `;

    const result = await pool.query(query, [clienteId, tenant.tenant_id]);

    return new Response(JSON.stringify(result.rows), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Erro ao buscar pedidos:", error);
    return new Response(JSON.stringify({ error: "Erro interno ao buscar pedidos" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

// ✅ POST - FINALIZAR PEDIDO COM ISOLAMENTO MULTI-TENANT
export const POST = withTenantIsolation(async (request, { tenant }) => {
  const client = await pool.connect();

  try {
    if (!['cliente'].includes(tenant.role)) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), { status: 403 });
    }

    console.log("📦 Finalizando pedido para cliente:", tenant.user.id, "no tenant:", tenant.tenant_id);

    const clienteId = tenant.user.id;

    await client.query('BEGIN');

    // Buscar itens do carrinho COM ISOLAMENTO DE TENANT
    const carrinhoQuery = `
      SELECT
        c.produto_id,
        c.quantidade,
        c.preco_unitario,
        p.parceiro_id,
        (c.quantidade * c.preco_unitario) AS subtotal
      FROM carrinho c
      INNER JOIN produtos p ON c.produto_id = p.id
      INNER JOIN parceiros parc ON p.parceiro_id = parc.id
      WHERE c.cliente_id = $1 AND parc.tenant_id = $2
    `;

    const carrinhoResult = await client.query(carrinhoQuery, [clienteId, tenant.tenant_id]);

    if (carrinhoResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return new Response(JSON.stringify({ error: "Carrinho vazio" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Calcular total
    const total = carrinhoResult.rows.reduce((acc, item) => acc + parseFloat(item.subtotal), 0);

    // Gerar QR code único
    const qrCode = `PED-${Date.now()}-${uuidv4().substring(0, 8)}`;

    // Criar pedido COM TENANT_ID
    const pedidoQuery = `
      INSERT INTO pedidos (cliente_id, qr_code, total, tenant_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const pedidoResult = await client.query(pedidoQuery, [clienteId, qrCode, total, tenant.tenant_id]);
    const pedidoId = pedidoResult.rows[0].id;

    // Criar itens do pedido
    const itensQuery = `
      INSERT INTO pedido_itens (pedido_id, produto_id, parceiro_id, quantidade, preco_unitario, subtotal)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;

    for (const item of carrinhoResult.rows) {
      await client.query(itensQuery, [
        pedidoId,
        item.produto_id,
        item.parceiro_id,
        item.quantidade,
        item.preco_unitario,
        item.subtotal
      ]);
    }

    // Limpar carrinho
    const limparCarrinhoQuery = `DELETE FROM carrinho WHERE cliente_id = $1`;
    await client.query(limparCarrinhoQuery, [clienteId]);

    await client.query('COMMIT');

    return new Response(JSON.stringify({
      pedido: pedidoResult.rows[0],
      qr_code: qrCode,
      total: total.toFixed(2)
    }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("❌ Erro ao finalizar pedido:", error);
    return new Response(JSON.stringify({ error: "Erro interno ao finalizar pedido" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  } finally {
    client.release();
  }
});
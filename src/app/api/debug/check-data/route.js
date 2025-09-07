import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET() {
  try {
    console.log("🔍 Verificando dados no banco...");

    // Verificar clientes
    const clientesQuery = "SELECT COUNT(*) as total, COUNT(CASE WHEN ativo = true THEN 1 END) as ativos FROM clientes";
    const clientesResult = await pool.query(clientesQuery);

    // Verificar parceiros
    const parceirosQuery = "SELECT COUNT(*) as total, COUNT(CASE WHEN ativo = true THEN 1 END) as ativos FROM parceiros";
    const parceirosResult = await pool.query(parceirosQuery);

    // Verificar vouchers
    const vouchersQuery = "SELECT COUNT(*) as total, COUNT(CASE WHEN ativo = true THEN 1 END) as ativos FROM vouchers";
    const vouchersResult = await pool.query(vouchersQuery);

    // Verificar produtos
    const produtosQuery = "SELECT COUNT(*) as total, COUNT(CASE WHEN ativo = true THEN 1 END) as ativos FROM produtos";
    const produtosResult = await pool.query(produtosQuery);

    // Verificar pedidos
    const pedidosQuery = "SELECT COUNT(*) as total FROM pedidos";
    const pedidosResult = await pool.query(pedidosQuery);

    // Verificar pedido_itens
    const pedidoItensQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN validado_at IS NOT NULL THEN 1 END) as validados,
        COALESCE(SUM(subtotal), 0) as receita_total
      FROM pedido_itens
    `;
    const pedidoItensResult = await pool.query(pedidoItensQuery);

    // Verificar voucher_utilizados
    const voucherUtilizadosQuery = "SELECT COUNT(*) as total FROM voucher_utilizados";
    const voucherUtilizadosResult = await pool.query(voucherUtilizadosQuery);

    // Verificar estrutura das tabelas
    const tabelasQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    const tabelasResult = await pool.query(tabelasQuery);

    const debugData = {
      tabelas: tabelasResult.rows.map(row => row.table_name),
      clientes: clientesResult.rows[0],
      parceiros: parceirosResult.rows[0],
      vouchers: vouchersResult.rows[0],
      produtos: produtosResult.rows[0],
      pedidos: pedidosResult.rows[0],
      pedidoItens: pedidoItensResult.rows[0],
      voucherUtilizados: voucherUtilizadosResult.rows[0],
      timestamp: new Date().toISOString()
    };

    console.log("📊 Dados encontrados:", debugData);

    return new Response(JSON.stringify(debugData, null, 2), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error('❌ Erro ao verificar dados:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack
    }, null, 2), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
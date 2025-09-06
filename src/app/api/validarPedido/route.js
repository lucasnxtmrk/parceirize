import { Pool } from "pg";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function POST(req) {
  const client = await pool.connect();
  
  try {
    const session = await getServerSession(options);

    if (!session || session.user.role !== "parceiro") {
      return new Response(JSON.stringify({ error: "Acesso negado" }), { status: 403 });
    }

    const { qrCode } = await req.json();

    console.log(`📡 Validando pedido com QR Code: ${qrCode}...`);

    await client.query('BEGIN');

    // 1️⃣ Buscar pedido pelo QR Code
    const pedidoQuery = `
      SELECT 
        p.id,
        p.cliente_id,
        p.qr_code,
        p.status,
        p.total,
        p.created_at,
        c.nome AS cliente_nome,
        c.sobrenome AS cliente_sobrenome,
        c.id_carteirinha
      FROM pedidos p
      INNER JOIN clientes c ON p.cliente_id = c.id
      WHERE p.qr_code = $1
    `;
    
    const pedidoResult = await client.query(pedidoQuery, [qrCode]);

    if (pedidoResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return new Response(JSON.stringify({ error: "QR Code inválido ou pedido não encontrado." }), { status: 404 });
    }

    const pedido = pedidoResult.rows[0];

    if (pedido.status !== 'pendente') {
      await client.query('ROLLBACK');
      return new Response(JSON.stringify({ error: "Este pedido já foi validado." }), { status: 403 });
    }

    // 2️⃣ Buscar itens do pedido que pertencem ao parceiro logado
    const itensQuery = `
      SELECT 
        pi.id,
        pi.produto_id,
        pi.quantidade,
        pi.preco_unitario,
        pi.subtotal,
        p.nome AS produto_nome,
        p.descricao AS produto_descricao,
        parc.nome_empresa AS parceiro_nome
      FROM pedido_itens pi
      INNER JOIN produtos p ON pi.produto_id = p.id
      INNER JOIN parceiros parc ON pi.parceiro_id = parc.id
      WHERE pi.pedido_id = $1 AND pi.parceiro_id = $2
    `;

    const itensResult = await client.query(itensQuery, [pedido.id, session.user.id]);

    if (itensResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return new Response(JSON.stringify({ error: "Nenhum item deste pedido pertence ao seu estabelecimento." }), { status: 403 });
    }

    // 3️⃣ Calcular total dos itens do parceiro
    const totalParceiro = itensResult.rows.reduce((acc, item) => acc + parseFloat(item.subtotal), 0);

    // 4️⃣ Verificar se todos os itens do pedido foram validados por seus respectivos parceiros
    const todosItensQuery = `
      SELECT pi.parceiro_id, parc.nome_empresa,
             COUNT(*) as total_itens,
             COUNT(pi.validado_por) as itens_validados
      FROM pedido_itens pi
      INNER JOIN parceiros parc ON pi.parceiro_id = parc.id
      WHERE pi.pedido_id = $1
      GROUP BY pi.parceiro_id, parc.nome_empresa
    `;
    
    const todosItensResult = await client.query(todosItensQuery, [pedido.id]);
    
    // 5️⃣ Marcar itens do parceiro atual como validados
    const validarItensQuery = `
      UPDATE pedido_itens 
      SET validado_por = $1, validado_at = NOW()
      WHERE pedido_id = $2 AND parceiro_id = $1 AND validado_por IS NULL
    `;
    
    await client.query(validarItensQuery, [session.user.id, pedido.id]);

    // 6️⃣ Verificar se todos os itens do pedido foram validados
    const verificarCompletudePedidoQuery = `
      SELECT COUNT(*) as total_itens,
             COUNT(validado_por) as itens_validados
      FROM pedido_itens
      WHERE pedido_id = $1
    `;
    
    const completudeResult = await client.query(verificarCompletudePedidoQuery, [pedido.id]);
    const { total_itens, itens_validados } = completudeResult.rows[0];

    // 7️⃣ Se todos os itens foram validados, marcar pedido como validado
    if (parseInt(total_itens) === parseInt(itens_validados)) {
      const validarPedidoQuery = `
        UPDATE pedidos 
        SET status = 'validado', validated_at = NOW()
        WHERE id = $1
      `;
      
      await client.query(validarPedidoQuery, [pedido.id]);

      // 8️⃣ Atualizar data último voucher do cliente
      const atualizarClienteQuery = `
        UPDATE clientes SET data_ultimo_voucher = NOW() WHERE id = $1
      `;
      await client.query(atualizarClienteQuery, [pedido.cliente_id]);
    }

    await client.query('COMMIT');

    console.log(`✅ Itens do pedido ${qrCode} validados pelo parceiro ${session.user.id}`);

    return new Response(JSON.stringify({
      success: true,
      message: "Itens validados com sucesso!",
      pedido: {
        id: pedido.id,
        qr_code: pedido.qr_code,
        cliente_nome: `${pedido.cliente_nome} ${pedido.cliente_sobrenome}`,
        id_carteirinha: pedido.id_carteirinha,
        total_pedido: pedido.total,
        total_parceiro: totalParceiro.toFixed(2),
        status: parseInt(total_itens) === parseInt(itens_validados) + itensResult.rows.length ? 'validado' : 'pendente'
      },
      itens: itensResult.rows
    }), { 
      status: 200 
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("❌ Erro na validação do pedido:", error);
    return new Response(JSON.stringify({ error: "Erro interno ao validar pedido." }), { status: 500 });
  } finally {
    client.release();
  }
}
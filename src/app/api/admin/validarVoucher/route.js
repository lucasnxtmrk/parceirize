import { Pool } from "pg";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function POST(req) {
  try {
    const session = await getServerSession(options);
    
    console.log("🔍 Sessão recebida:", session);

    if (!session) {
      console.log("❌ Nenhuma sessão encontrada.");
      return new Response(JSON.stringify({ error: "Acesso negado - Usuário não autenticado" }), { status: 403 });
    }

    if (!["provedor", "superadmin"].includes(session.user.role)) {
      console.log("❌ Acesso negado - Apenas admins podem validar vouchers.");
      return new Response(JSON.stringify({ error: "Acesso negado - Apenas admins podem validar vouchers" }), { status: 403 });
    }

    const { clientId, couponCode } = await req.json();
    console.log(`📡 [ADMIN] Validando voucher ${couponCode} para cliente ${clientId}...`);

    // 1️⃣ Verificar se o cliente existe
    const clienteQuery = `SELECT id, data_ultimo_voucher FROM clientes WHERE id_carteirinha = $1`;
    const clienteResult = await pool.query(clienteQuery, [clientId]);

    if (clienteResult.rows.length === 0) {
      console.log("❌ Cliente não encontrado.");
      return new Response(JSON.stringify({ error: "Cliente não encontrado." }), { status: 404 });
    }

    const cliente = clienteResult.rows[0];

    // 2️⃣ Verificar se o voucher existe
    const voucherQuery = `
      SELECT v.id AS voucher_id, v.desconto, v.data_criacao, v.limite_uso, v.parceiro_id, p.nome_empresa AS parceiro
      FROM vouchers v
      INNER JOIN parceiros p ON v.parceiro_id = p.id
      WHERE v.codigo = $1
    `;
    const voucherResult = await pool.query(voucherQuery, [couponCode]);

    if (voucherResult.rows.length === 0) {
      console.log("❌ Voucher inválido ou inexistente.");
      return new Response(JSON.stringify({ error: "Voucher inválido ou inexistente." }), { status: 404 });
    }

    const voucher = voucherResult.rows[0];

    console.log(`✅ Voucher encontrado! Pertence ao parceiro: ${voucher.parceiro}`);

    // 3️⃣ Verificar se o cliente já utilizou este voucher nos últimos 30 dias (se houver limite)
    if (voucher.limite_uso !== null) {
      const usoQuery = `
        SELECT COUNT(*) AS total_uso
        FROM voucher_utilizados
        WHERE cliente_id = $1 AND voucher_id = $2 AND data_utilizacao >= NOW() - INTERVAL '30 days'
      `;
      const usoResult = await pool.query(usoQuery, [cliente.id, voucher.voucher_id]);
      const totalUsos = parseInt(usoResult.rows[0].total_uso, 10);

      console.log(`🎯 O cliente já utilizou este voucher ${totalUsos} vezes. Limite: ${voucher.limite_uso}`);

      if (totalUsos >= voucher.limite_uso) {
        return new Response(JSON.stringify({ error: "Limite de uso do voucher atingido nos últimos 30 dias." }), { status: 403 });
      }
    }

    // 4️⃣ Registrar o uso do voucher
    const registrarUsoQuery = `
      INSERT INTO voucher_utilizados (cliente_id, voucher_id, data_utilizacao, desconto)
      VALUES ($1, $2, NOW(), $3)
    `;
    await pool.query(registrarUsoQuery, [cliente.id, voucher.voucher_id, voucher.desconto]);

    // 5️⃣ Atualizar a data do último uso do cliente
    const atualizarClienteQuery = `
      UPDATE clientes SET data_ultimo_voucher = NOW() WHERE id = $1
    `;
    await pool.query(atualizarClienteQuery, [cliente.id]);

    console.log(`✅ [ADMIN] Voucher ${couponCode} validado com sucesso para cliente ${clientId}`);

    return new Response(JSON.stringify({ success: true, message: "Voucher validado com sucesso!" }), { status: 200 });

  } catch (error) {
    console.error("❌ Erro na validação do voucher:", error);
    return new Response(JSON.stringify({ error: "Erro interno ao validar voucher." }), { status: 500 });
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const codigoVoucher = searchParams.get("voucher");

    if (!codigoVoucher) {
      return new Response(JSON.stringify({ error: "Código do voucher não fornecido" }), { status: 400 });
    }

    console.log(`🔍 Verificando existência do voucher: ${codigoVoucher}`);

    const result = await pool.query(
      `SELECT v.codigo, v.desconto, v.limite_uso, p.nome_empresa AS parceiro
       FROM vouchers v
       INNER JOIN parceiros p ON v.parceiro_id = p.id
       WHERE v.codigo = $1`,
      [codigoVoucher]
    );

    if (result.rows.length === 0) {
      console.log("❌ Voucher não encontrado");
      return new Response(JSON.stringify({ exists: false }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const voucher = result.rows[0];
    console.log("✅ Voucher encontrado:", voucher);

    return new Response(JSON.stringify({ exists: true, voucher }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ Erro ao verificar voucher:", error);
    return new Response(JSON.stringify({ error: "Erro ao verificar voucher" }), { status: 500 });
  }
}

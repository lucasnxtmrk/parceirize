import { Pool } from "pg";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(req) {
  try {
    const session = await getServerSession(options);
    
    if (!session || session.user.role !== 'cliente') {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const clienteId = session.user.id;

    const query = `
      SELECT
        c.id,
        c.quantidade,
        c.preco_unitario,
        c.created_at,
        p.id AS produto_id,
        p.nome AS produto_nome,
        p.descricao AS produto_descricao,
        CASE
          WHEN p.desconto IS NULL OR p.desconto = 0 THEN
            COALESCE(parc.desconto_padrao, 0)
          ELSE
            p.desconto
        END AS desconto,
        p.imagem_url AS produto_imagem,
        parc.nome_empresa AS parceiro_nome,
        parc.id AS parceiro_id,
        (c.quantidade * c.preco_unitario) AS subtotal_original,
        (c.quantidade * c.preco_unitario * (1 - COALESCE(
          CASE
            WHEN p.desconto IS NULL OR p.desconto = 0 THEN
              parc.desconto_padrao
            ELSE
              p.desconto
          END, 0) / 100)) AS subtotal,
        (c.quantidade * c.preco_unitario * COALESCE(
          CASE
            WHEN p.desconto IS NULL OR p.desconto = 0 THEN
              parc.desconto_padrao
            ELSE
              p.desconto
          END, 0) / 100) AS economia
      FROM carrinho c
      INNER JOIN produtos p ON c.produto_id = p.id
      INNER JOIN parceiros parc ON p.parceiro_id = parc.id
      WHERE c.cliente_id = $1
      ORDER BY c.created_at DESC
    `;

    const result = await pool.query(query, [clienteId]);
    
    const total = result.rows.reduce((acc, item) => acc + parseFloat(item.subtotal), 0);
    const totalOriginal = result.rows.reduce((acc, item) => acc + parseFloat(item.subtotal_original), 0);
    const economiaTotal = result.rows.reduce((acc, item) => acc + parseFloat(item.economia), 0);
    
    return new Response(JSON.stringify({
      itens: result.rows,
      total: total.toFixed(2),
      total_original: totalOriginal.toFixed(2),
      economia_total: economiaTotal.toFixed(2)
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Erro ao buscar carrinho:", error);
    return new Response(JSON.stringify({ error: "Erro interno ao buscar carrinho" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function POST(req) {
  try {
    const session = await getServerSession(options);
    
    if (!session || session.user.role !== 'cliente') {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const clienteId = session.user.id;
    const { produto_id, quantidade = 1 } = await req.json();

    if (!produto_id) {
      return new Response(JSON.stringify({ error: "ID do produto é obrigatório" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Buscar preço atual do produto e parceiro
    const produtoQuery = `SELECT preco, parceiro_id FROM produtos WHERE id = $1 AND ativo = true`;
    const produtoResult = await pool.query(produtoQuery, [produto_id]);

    if (produtoResult.rows.length === 0) {
      return new Response(JSON.stringify({ error: "Produto não encontrado ou inativo" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const precoUnitario = produtoResult.rows[0].preco;
    const parceiroIdNovo = produtoResult.rows[0].parceiro_id;

    // Verificar se já existem produtos de outro parceiro no carrinho
    const carrinhoExistenteQuery = `
      SELECT DISTINCT p.parceiro_id, parc.nome_empresa
      FROM carrinho c
      INNER JOIN produtos p ON c.produto_id = p.id
      INNER JOIN parceiros parc ON p.parceiro_id = parc.id
      WHERE c.cliente_id = $1 AND p.parceiro_id != $2
    `;
    const carrinhoExistente = await pool.query(carrinhoExistenteQuery, [clienteId, parceiroIdNovo]);

    if (carrinhoExistente.rows.length > 0) {
      const parceiroDiferente = carrinhoExistente.rows[0];
      return new Response(JSON.stringify({
        error: "PARCEIRO_DIFERENTE",
        message: `Seu carrinho já contém produtos de ${parceiroDiferente.nome_empresa}. Para adicionar produtos de outro parceiro, você precisa limpar o carrinho primeiro.`,
        parceiro_atual: parceiroDiferente.nome_empresa
      }), {
        status: 409, // Conflict
        headers: { "Content-Type": "application/json" },
      });
    }

    // Verificar se já existe no carrinho
    const existeQuery = `SELECT id, quantidade FROM carrinho WHERE cliente_id = $1 AND produto_id = $2`;
    const existeResult = await pool.query(existeQuery, [clienteId, produto_id]);

    let result;
    if (existeResult.rows.length > 0) {
      // Atualizar quantidade
      const novaQuantidade = existeResult.rows[0].quantidade + quantidade;
      const updateQuery = `
        UPDATE carrinho 
        SET quantidade = $1, preco_unitario = $2
        WHERE cliente_id = $3 AND produto_id = $4
        RETURNING *
      `;
      result = await pool.query(updateQuery, [novaQuantidade, precoUnitario, clienteId, produto_id]);
    } else {
      // Adicionar novo item
      const insertQuery = `
        INSERT INTO carrinho (cliente_id, produto_id, quantidade, preco_unitario)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;
      result = await pool.query(insertQuery, [clienteId, produto_id, quantidade, precoUnitario]);
    }
    
    return new Response(JSON.stringify(result.rows[0]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Erro ao adicionar ao carrinho:", error);
    return new Response(JSON.stringify({ error: "Erro interno ao adicionar ao carrinho" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function PUT(req) {
  try {
    const session = await getServerSession(options);
    
    if (!session || session.user.role !== 'cliente') {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const clienteId = session.user.id;
    const { produto_id, quantidade } = await req.json();

    if (!produto_id || !quantidade || quantidade < 1) {
      return new Response(JSON.stringify({ error: "ID do produto e quantidade válida são obrigatórios" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const query = `
      UPDATE carrinho 
      SET quantidade = $1
      WHERE cliente_id = $2 AND produto_id = $3
      RETURNING *
    `;

    const result = await pool.query(query, [quantidade, clienteId, produto_id]);
    
    if (result.rows.length === 0) {
      return new Response(JSON.stringify({ error: "Item não encontrado no carrinho" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    
    return new Response(JSON.stringify(result.rows[0]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Erro ao atualizar carrinho:", error);
    return new Response(JSON.stringify({ error: "Erro interno ao atualizar carrinho" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function DELETE(req) {
  try {
    const session = await getServerSession(options);

    if (!session || session.user.role !== 'cliente') {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const clienteId = session.user.id;
    const { searchParams } = new URL(req.url);
    const produtoId = searchParams.get('produto_id');
    const limparTudo = searchParams.get('limpar_tudo'); // Para limpar carrinho completo

    if (limparTudo === 'true') {
      // Limpar carrinho completo
      const query = `DELETE FROM carrinho WHERE cliente_id = $1`;
      const result = await pool.query(query, [clienteId]);

      return new Response(JSON.stringify({
        message: "Carrinho limpo com sucesso",
        itens_removidos: result.rowCount
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!produtoId) {
      return new Response(JSON.stringify({ error: "ID do produto é obrigatório" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const query = `
      DELETE FROM carrinho
      WHERE cliente_id = $1 AND produto_id = $2
      RETURNING *
    `;

    const result = await pool.query(query, [clienteId, produtoId]);

    if (result.rows.length === 0) {
      return new Response(JSON.stringify({ error: "Item não encontrado no carrinho" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ message: "Item removido do carrinho com sucesso" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Erro ao remover do carrinho:", error);
    return new Response(JSON.stringify({ error: "Erro interno ao remover do carrinho" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
import { Pool } from 'pg';
import { getServerSession } from 'next-auth';
import { options } from '@/app/api/auth/[...nextauth]/options';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function getProvedor(email) {
  const r = await pool.query('SELECT id, email, tenant_id FROM provedores WHERE email = $1', [email]);
  return r.rows[0] || null;
}

async function getIntegracao(provedorId) {
  const r = await pool.query(
    `SELECT * FROM integracoes WHERE provedor_id = $1 AND tipo = 'SGP'`,
    [provedorId]
  );
  return r.rows[0] || null;
}

// Função para sincronizar automaticamente (será chamada pelo cron)
async function sincronizarAutomatico(provedorId) {
  const integracao = await getIntegracao(provedorId);
  if (!integracao || (integracao.modo_ativacao || 'manual') !== 'integracao') {
    return { skipped: true, motivo: 'Modo de ativação não é integração' };
  }

  return await executarSincronizacao(integracao, provedorId);
}

async function executarSincronizacao(integracao, provedorId) {
  const url = `https://${integracao.subdominio}.sgp.net.br/api/ura/clientes/`;

  if (!integracao.token || !integracao.app_name) {
    throw new Error('Configuração incompleta: é necessário Token + App para listar clientes');
  }

  // Usar filtros salvos da última importação, se existirem
  const filtrosImportacao = integracao.filtros_importacao || {};
  const {
    apenas_ativos = true,
    dias_atividade = 90
  } = filtrosImportacao;

  // Para sincronização incremental, buscar apenas clientes que já existem no sistema
  const clientesExistentes = await pool.query(`
    SELECT DISTINCT cpf_cnpj, sgp_id, email
    FROM clientes
    WHERE origem_sgp = TRUE
    AND (cpf_cnpj IS NOT NULL OR sgp_id IS NOT NULL)
  `);

  const authBody = {
    token: integracao.token,
    app: integracao.app_name,
    omitir_contratos: false,
    limit: 100 // API SGP permite max 100 por requisição
  };

  // Se apenas_ativos, filtrar por situação do contrato
  if (apenas_ativos) {
    authBody.contrato_status = 1; // 1 = Ativo no SGP
  }

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(authBody),
    cache: 'no-store',
  });
  
  if (!resp.ok) {
    throw new Error(`Falha ao consultar SGP: ${resp.status} ${resp.statusText}`);
  }
  
  const data = await resp.json();
  const clientesSGP = data?.clientes || [];

  // Criar mapa de clientes existentes para busca rápida
  const clientesExistentesMap = new Map();
  clientesExistentes.rows.forEach(cliente => {
    if (cliente.cpf_cnpj) clientesExistentesMap.set(cliente.cpf_cnpj, cliente);
    if (cliente.sgp_id) clientesExistentesMap.set(`sgp_${cliente.sgp_id}`, cliente);
    if (cliente.email) clientesExistentesMap.set(cliente.email, cliente);
  });

  let ativados = 0;
  let desativados = 0;
  let atualizados = 0;
  let naoEncontrados = 0;
  const errosDetalhados = [];

  for (const clienteSGP of clientesSGP) {
    const contratos = clienteSGP?.contratos || [];
    const cpfcnpj = clienteSGP?.cpfcnpj;
    const email = clienteSGP?.email;
    const sgpId = clienteSGP?.id;
    const loginEmail = email || (cpfcnpj ? `${cpfcnpj}@sgp.local` : null);

    if (!loginEmail) continue;

    // Verificar se este cliente existe no nosso sistema
    const clienteExistente = clientesExistentesMap.get(cpfcnpj) ||
                            clientesExistentesMap.get(`sgp_${sgpId}`) ||
                            clientesExistentesMap.get(loginEmail);

    if (!clienteExistente) {
      naoEncontrados++;
      continue; // Skip clientes que não existem no sistema
    }

    // Verificar status dos contratos
    const temContratoAtivo = contratos.some(c =>
      (c?.status || '').toString().toUpperCase() === 'ATIVO'
    );

    // Encontrar data do último contrato ativo
    const ultimoContratoAtivo = contratos
      .filter(c => (c?.status || '').toString().toUpperCase() === 'ATIVO')
      .sort((a, b) => new Date(b?.dataCadastro || 0) - new Date(a?.dataCadastro || 0))[0];

    const dataUltimoContratoAtivo = ultimoContratoAtivo?.dataCadastro || null;

    // Data da última atividade
    const dataUltimaAtividade = contratos.reduce((ultima, contrato) => {
      const dataContrato = new Date(contrato?.dataCadastro || '1970-01-01');
      return dataContrato > ultima ? dataContrato : ultima;
    }, new Date('1970-01-01'));

    // Dados atualizados do SGP
    const sgpDados = {
      id: sgpId,
      nome: clienteSGP?.nome,
      cpfcnpj: cpfcnpj,
      email: email,
      dataCadastro: clienteSGP?.dataCadastro,
      endereco: clienteSGP?.endereco || null,
      contratos: contratos.map(c => ({
        contrato: c?.contrato,
        status: c?.status,
        dataCadastro: c?.dataCadastro,
        servicos: c?.servicos || []
      })),
      ultima_sincronizacao: new Date().toISOString()
    };

    try {
      // Atualizar cliente com informações mais completas
      const novoStatus = temContratoAtivo;

      const result = await pool.query(
        `UPDATE clientes SET
          ativo = $1,
          cpf_cnpj = COALESCE($2, cpf_cnpj),
          sgp_id = COALESCE($3, sgp_id),
          ultimo_contrato_ativo = COALESCE($4, ultimo_contrato_ativo),
          data_ultima_atividade = COALESCE($5, data_ultima_atividade),
          sgp_dados = $6
        WHERE email = $7`,
        [
          novoStatus,
          cpfcnpj,
          sgpId,
          dataUltimoContratoAtivo,
          dataUltimaAtividade > new Date('1970-01-01') ? dataUltimaAtividade : null,
          JSON.stringify(sgpDados),
          loginEmail
        ]
      );

      if (result.rowCount > 0) {
        atualizados++;
        if (novoStatus) {
          ativados++;
        } else {
          desativados++;
        }

        // Se cliente foi transformado em parceiro, sincronizar também a tabela parceiros
        const clienteInfo = await pool.query(
          'SELECT tipo_cliente FROM clientes WHERE email = $1',
          [loginEmail]
        );

        if (clienteInfo.rows[0]?.tipo_cliente === 'parceiro') {
          await pool.query(
            'UPDATE parceiros SET ativo = $1 WHERE email = $2',
            [novoStatus, loginEmail]
          );
        }
      }
    } catch (dbError) {
      errosDetalhados.push(`Erro ao atualizar ${loginEmail}: ${dbError.message}`);
    }
  }

  // Salvar estatísticas da sincronização
  const statsSincronizacao = {
    data_sincronizacao: new Date().toISOString(),
    total_sgp: clientesSGP.length,
    clientes_sistema: clientesExistentes.rows.length,
    atualizados,
    ativados,
    desativados,
    nao_encontrados: naoEncontrados,
    erros: errosDetalhados.length,
    modo: 'incremental'
  };

  // Atualiza timestamp da última sincronização
  await pool.query(
    `UPDATE integracoes SET
      last_sync = NOW(),
      stats_ultima_importacao = $1
    WHERE provedor_id = $2 AND tipo = 'SGP'`,
    [JSON.stringify(statsSincronizacao), provedorId]
  );

  return {
    success: true,
    modo: 'sincronizacao_incremental',
    totalSGP: clientesSGP.length,
    clientesSistema: clientesExistentes.rows.length,
    atualizados,
    ativados,
    desativados,
    naoEncontrados,
    erros: errosDetalhados.length > 0 ? errosDetalhados : null
  };
}

// GET: sincronização manual pelo provedor
export async function GET() {
  const session = await getServerSession(options);
  if (!session || !['provedor', 'superadmin'].includes(session.user.role)) {
    return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403 });
  }

  let provedor = null;
  if (session.user.role === 'provedor') {
    provedor = await getProvedor(session.user.email);
    if (!provedor) return new Response(JSON.stringify({ error: 'Provedor não encontrado' }), { status: 404 });
  } else {
    // SuperAdmin sincroniza para o primeiro provedor ativo
    const provedorResult = await pool.query('SELECT id FROM provedores WHERE ativo = true LIMIT 1');
    if (provedorResult.rows.length === 0) {
      return new Response(JSON.stringify({ error: 'Nenhum provedor ativo encontrado' }), { status: 404 });
    }
    provedor = provedorResult.rows[0];
  }

  const integracao = await getIntegracao(provedor.id);
  if (!integracao) return new Response(JSON.stringify({ error: 'Integração SGP não configurada' }), { status: 400 });

  try {
    const resultado = await executarSincronizacao(integracao, provedor.id);
    return new Response(JSON.stringify(resultado), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message,
      details: 'Falha na sincronização manual'
    }), { status: 502 });
  }
}

// POST: endpoint para cron automático (será usado pelo sistema)
export async function POST(req) {
  try {
    const { provedor_id } = await req.json();

    if (!provedor_id) {
      // Se não informou provedor_id, sincroniza todas as integrações ativas
      const integracoes = await pool.query(
        `SELECT provedor_id FROM integracoes WHERE tipo = 'SGP' AND modo_ativacao = 'integracao'`
      );

      const resultados = [];
      for (const integracao of integracoes.rows) {
        try {
          const resultado = await sincronizarAutomatico(integracao.provedor_id);
          resultados.push({ provedor_id: integracao.provedor_id, resultado });
        } catch (error) {
          resultados.push({
            provedor_id: integracao.provedor_id,
            erro: error.message
          });
        }
      }

      return new Response(JSON.stringify({
        success: true,
        sincronizacoes: resultados
      }), { status: 200 });
    }

    // Sincronização específica de um provedor
    const resultado = await sincronizarAutomatico(provedor_id);
    return new Response(JSON.stringify(resultado), { status: 200 });

  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message,
      details: 'Falha na sincronização automática'
    }), { status: 500 });
  }
}
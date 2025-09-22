import { Pool } from 'pg';
import { getServerSession } from 'next-auth';
import { options } from '@/app/api/auth/[...nextauth]/options';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Função para buscar todos os clientes SGP com paginação
async function buscarTodosClientesSGP(url, authBody) {
  let todosClientes = [];
  let offset = 0;
  const limit = 100; // Máximo da API
  let hasMore = true;

  while (hasMore) {
    const bodyComOffset = {
      ...authBody,
      limit,
      offset
    };

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bodyComOffset),
      cache: 'no-store',
    });

    if (!resp.ok) {
      const errorText = await resp.text();
      throw new Error(`Falha ao consultar SGP (offset ${offset}): ${resp.status} ${resp.statusText} - ${errorText}`);
    }

    const data = await resp.json();
    const clientesBatch = data?.clientes || [];

    if (clientesBatch.length === 0) {
      hasMore = false;
    } else {
      todosClientes = todosClientes.concat(clientesBatch);
      offset += limit;

      // Se retornou menos que o limite, não há mais registros
      if (clientesBatch.length < limit) {
        hasMore = false;
      }
    }
  }

  return todosClientes;
}

async function getProvedor(email) {
  const r = await pool.query('SELECT id, email FROM provedores WHERE email = $1', [email]);
  return r.rows[0] || null;
}

async function getIntegracao(provedorId) {
  const r = await pool.query(
    `SELECT * FROM integracoes WHERE provedor_id = $1 AND tipo = 'SGP'`,
    [provedorId]
  );
  return r.rows[0] || null;
}

export async function POST(req) {
  const session = await getServerSession(options);
  if (!session || !['provedor', 'superadmin'].includes(session.user.role)) {
    return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403 });
  }

  const provedor = await getProvedor(session.user.email);
  if (!provedor) return new Response(JSON.stringify({ error: 'Provedor não encontrado' }), { status: 404 });

  const integracao = await getIntegracao(provedor.id);
  if (!integracao) return new Response(JSON.stringify({ error: 'Integração SGP não configurada' }), { status: 400 });

  const { filtros = {} } = await req.json();

  // Filtros de importação
  const {
    apenas_ativos = true,
    dias_atividade = 90,
    data_cadastro_inicio = null,
    data_cadastro_fim = null
  } = filtros;

  try {
    // Busca clientes no SGP usando endpoint correto
    const url = `https://${integracao.subdominio}.sgp.net.br/api/ura/clientes/`;

    if (!integracao.token || !integracao.app_name) {
      return new Response(JSON.stringify({
        error: 'Configuração incompleta: é necessário Token + App para listar clientes'
      }), { status: 400 });
    }

    // Calcular data limite para atividade
    const dataLimiteAtividade = new Date();
    dataLimiteAtividade.setDate(dataLimiteAtividade.getDate() - dias_atividade);

    const authBody = {
      token: integracao.token,
      app: integracao.app_name,
      omitir_contratos: false
    };

    // Adicionar filtros de data se especificados
    if (data_cadastro_inicio) {
      authBody.data_cadastro_inicio = data_cadastro_inicio;
    }
    if (data_cadastro_fim) {
      authBody.data_cadastro_fim = data_cadastro_fim;
    }

    // Se apenas_ativos, filtrar por situação do contrato
    if (apenas_ativos) {
      authBody.contrato_status = 1; // 1 = Ativo no SGP
    }

    // Buscar todos os clientes usando paginação
    let clientesSGP = [];
    try {
      clientesSGP = await buscarTodosClientesSGP(url, authBody);
    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Falha ao consultar SGP para preview',
        details: error.message
      }), { status: 500 });
    }

    // Contar clientes existentes no sistema
    const clientesExistentesResult = await pool.query(`
      SELECT COUNT(*) as total
      FROM clientes
      WHERE origem_sgp = TRUE
      AND tenant_id = $1
    `, [session.user.tenant_id]);

    const clientesExistentes = parseInt(clientesExistentesResult.rows[0]?.total || 0);

    // Estatísticas de previsão
    let totalQualificados = 0;
    let novosClientes = 0;
    let clientesExistentesParaAtualizar = 0;
    let filtradosAtividade = 0;
    let filtradosData = 0;
    let semEmailValido = 0;

    for (const clienteSGP of clientesSGP) {
      const contratos = clienteSGP?.contratos || [];
      const cpfcnpj = clienteSGP?.cpfcnpj;
      const email = clienteSGP?.email;
      const loginEmail = email || (cpfcnpj ? `${cpfcnpj}@sgp.local` : null);

      if (!loginEmail) {
        semEmailValido++;
        continue;
      }

      // Verifica se tem pelo menos um contrato ativo
      const temContratoAtivo = contratos.some(c =>
        (c?.status || '').toString().toUpperCase() === 'ATIVO'
      );

      // Aplicar filtro de apenas ativos se especificado
      if (apenas_ativos && !temContratoAtivo) {
        continue;
      }

      // Filtro por data de cadastro do cliente
      if (data_cadastro_inicio || data_cadastro_fim) {
        const dataCadastroCliente = new Date(clienteSGP?.dataCadastro || '1970-01-01');

        if (data_cadastro_inicio && dataCadastroCliente < new Date(data_cadastro_inicio)) {
          filtradosData++;
          continue;
        }

        if (data_cadastro_fim && dataCadastroCliente > new Date(data_cadastro_fim)) {
          filtradosData++;
          continue;
        }
      }

      // Filtro de atividade recente (agora sempre aplicado)
      if (true) {
        const ultimaAtividadeContrato = contratos.reduce((ultima, contrato) => {
          const dataContrato = new Date(contrato?.dataCadastro || '1970-01-01');
          return dataContrato > ultima ? dataContrato : ultima;
        }, new Date('1970-01-01'));

        if (ultimaAtividadeContrato < dataLimiteAtividade && !temContratoAtivo) {
          filtradosAtividade++;
          continue;
        }
      }

      totalQualificados++;

      // Verificar se cliente já existe
      const existeResult = await pool.query(
        'SELECT id FROM clientes WHERE email = $1 AND tenant_id = $2',
        [loginEmail, session.user.tenant_id]
      );

      if (existeResult.rows.length === 0) {
        novosClientes++;
      } else {
        clientesExistentesParaAtualizar++;
      }
    }

    // Análise por categoria
    const analise = {
      total_sgp: clientesSGP.length,
      total_qualificados: totalQualificados,
      novos_clientes: novosClientes,
      clientes_para_atualizar: clientesExistentesParaAtualizar,
      filtrados: {
        atividade: filtradosAtividade,
        data: filtradosData,
        sem_email: semEmailValido
      },
      clientes_existentes_sistema: clientesExistentes,
      filtros_aplicados: {
        apenas_ativos,
        dias_atividade,
        data_cadastro_inicio,
        data_cadastro_fim
      }
    };

    return new Response(JSON.stringify({
      success: true,
      preview: analise,
      recomendacao: {
        deve_importar: totalQualificados > 0,
        estimativa_tempo: Math.ceil(totalQualificados / 10) + ' segundos',
        impacto_limite: novosClientes > 0 ?
          `Criará ${novosClientes} novos clientes` :
          'Apenas atualizará clientes existentes'
      }
    }), { status: 200 });

  } catch (error) {
    console.error('Erro no preview SGP:', error);
    return new Response(JSON.stringify({
      error: 'Erro ao consultar SGP para preview',
      details: error.message
    }), { status: 500 });
  }
}
import { Pool } from 'pg';
import { getServerSession } from 'next-auth';
import { options } from '@/app/api/auth/[...nextauth]/options';
import { validatePlanLimits } from '@/lib/tenant-helper';
import bcrypt from 'bcryptjs';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Função para buscar todos os clientes SGP com paginação automática
async function buscarTodosClientesSGP(url, authBody) {
  let todosClientes = [];
  let offset = 0;
  const limit = 100; // Máximo da API
  let hasMore = true;
  let requisicoes = 0;

  console.log('🔄 Iniciando busca de clientes SGP com paginação automática...');

  while (hasMore) {
    requisicoes++;
    const bodyComOffset = {
      ...authBody,
      limit,
      offset
    };

    console.log(`📡 Requisição ${requisicoes}: offset=${offset}, limit=${limit}`);

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bodyComOffset),
      cache: 'no-store',
      signal: AbortSignal.timeout(30000) // 30 segundos timeout
    });

    if (!resp.ok) {
      const errorText = await resp.text();
      throw new Error(`Falha ao consultar SGP (offset ${offset}): ${resp.status} ${resp.statusText} - ${errorText}`);
    }

    let data;
    try {
      data = await resp.json();
    } catch (jsonError) {
      const text = await resp.text();
      console.error(`❌ Erro ao parsear JSON da requisição ${requisicoes}:`, jsonError.message);
      console.error(`📄 Resposta em texto:`, text.substring(0, 500));
      throw new Error(`Erro ao parsear resposta JSON: ${jsonError.message}`);
    }
    const clientesBatch = data?.clientes || [];

    console.log(`📦 Requisição ${requisicoes}: retornou ${clientesBatch.length} clientes`);

    if (clientesBatch.length === 0) {
      console.log('✅ Fim da paginação: nenhum cliente retornado');
      hasMore = false;
    } else {
      todosClientes = todosClientes.concat(clientesBatch);
      offset += limit;

      // Se retornou menos que o limite, não há mais registros
      if (clientesBatch.length < limit) {
        console.log(`✅ Fim da paginação: retornou ${clientesBatch.length} < ${limit}`);
        hasMore = false;
      }
    }
  }

  console.log(`🎯 Total de clientes obtidos: ${todosClientes.length} em ${requisicoes} requisições`);
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
  console.log('🚀 Iniciando importação SGP...');

  try {
    const session = await getServerSession(options);
    if (!session || !['provedor', 'superadmin'].includes(session.user.role)) {
      console.log('❌ Acesso negado - role:', session?.user?.role);
      return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403 });
    }

    console.log('✅ Usuário autenticado:', session.user.email, 'role:', session.user.role);

  const provedor = await getProvedor(session.user.email);
  if (!provedor) return new Response(JSON.stringify({ error: 'Provedor não encontrado' }), { status: 404 });

  const integracao = await getIntegracao(provedor.id);
  if (!integracao) return new Response(JSON.stringify({ error: 'Integração SGP não configurada' }), { status: 400 });

  let requestData;
  try {
    requestData = await req.json();
    console.log('📥 Dados da requisição recebidos:', Object.keys(requestData));
  } catch (parseError) {
    console.error('❌ Erro ao parsear requisição:', parseError);
    return new Response(JSON.stringify({ error: 'Dados da requisição inválidos' }), { status: 400 });
  }

  const {
    senha_padrao,
    filtros = {}
  } = requestData;

  console.log('🔒 Senha padrão recebida:', senha_padrao ? 'presente' : 'ausente');
  console.log('🎛️ Filtros recebidos:', filtros);

  if (!senha_padrao || senha_padrao.length < 6) {
    console.log('❌ Senha padrão inválida');
    return new Response(JSON.stringify({ error: 'Senha padrão inválida (mín. 6 caracteres)' }), { status: 400 });
  }

  // Filtros de importação
  const {
    apenas_ativos = true,
    dias_atividade = 90, // últimos 90 dias
    data_cadastro_inicio = null,
    data_cadastro_fim = null
  } = filtros;

  // Busca clientes no SGP usando endpoint correto
  const url = `https://${integracao.subdominio}.sgp.net.br/api/ura/clientes/`;
  
  // Para listar todos os clientes, usar apenas autenticação por Token + App
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

  // Buscar todos os clientes usando paginação automática (sem limite)
  let clientesSGP = [];
  try {
    clientesSGP = await buscarTodosClientesSGP(url, authBody);
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Falha ao consultar SGP',
      details: error.message,
      url: url
    }), { status: 502 });
  }

  const senhaHash = await bcrypt.hash(senha_padrao, 10);

  let criados = 0;
  let atualizados = 0;
  let totalProcessados = 0;
  let limitesAtingidos = 0;
  let filtradosAtividade = 0;
  let filtradosData = 0;
  const errosDetalhados = [];

  for (const clienteSGP of clientesSGP) {
    const contratos = clienteSGP?.contratos || [];

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

    // Filtro de atividade recente (baseado na data do último contrato)
    // Sempre aplicado após remoção do checkbox incluir_inativos_recentes
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
    
    totalProcessados++;

    const cpfcnpj = clienteSGP?.cpfcnpj;
    const email = clienteSGP?.email;
    const loginEmail = email || (cpfcnpj ? `${cpfcnpj}@sgp.local` : null);
    
    if (!loginEmail) {
      errosDetalhados.push(`Cliente ${clienteSGP?.nome || 'sem nome'} não possui email nem CPF válido`);
      continue;
    }

    const nomeCompleto = clienteSGP?.nome || 'Cliente SGP';
    let nome = nomeCompleto;
    let sobrenome = '';
    if (nomeCompleto && typeof nomeCompleto === 'string' && nomeCompleto.includes(' ')) {
      const parts = nomeCompleto.split(' ');
      nome = parts.shift();
      sobrenome = parts.join(' ');
    }

    // Extrair informações adicionais do SGP
    const sgpId = clienteSGP?.id || null;
    const dataCadastroSGP = clienteSGP?.dataCadastro || null;

    // Encontrar data do último contrato ativo
    const ultimoContratoAtivo = contratos
      .filter(c => (c?.status || '').toString().toUpperCase() === 'ATIVO')
      .sort((a, b) => new Date(b?.dataCadastro || 0) - new Date(a?.dataCadastro || 0))[0];

    const dataUltimoContratoAtivo = ultimoContratoAtivo?.dataCadastro || null;

    // Data da última atividade (mais recente entre contratos)
    const dataUltimaAtividade = contratos.reduce((ultima, contrato) => {
      const dataContrato = new Date(contrato?.dataCadastro || '1970-01-01');
      return dataContrato > ultima ? dataContrato : ultima;
    }, new Date('1970-01-01'));

    // Se modo integracao, respeita status do contrato; se manual, ativa por padrão
    const ativo = (integracao.modo_ativacao === 'integracao') ? temContratoAtivo : true;

    // Dados completos do SGP para referência
    const sgpDados = {
      id: sgpId,
      nome: clienteSGP?.nome,
      cpfcnpj: cpfcnpj,
      email: email,
      dataCadastro: dataCadastroSGP,
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
      const sel = await pool.query('SELECT id, tipo_cliente FROM clientes WHERE email = $1', [loginEmail]);
      if (sel.rows.length === 0) {
        // Verificar limite do plano antes de criar novo cliente (apenas para provedores)
        if (session.user.role === 'provedor') {
          try {
            await validatePlanLimits(session.user.tenant_id, 'clientes');
          } catch (limitError) {
            limitesAtingidos++;
            errosDetalhados.push(`Limite atingido: ${limitError.message}`);
            // Para na primeira vez que atingir o limite para evitar spam de erros
            if (limitesAtingidos === 1) {
              errosDetalhados.push('Importação interrompida devido ao limite do plano');
              break;
            }
            continue;
          }
        }
        
        // Criar novo cliente
        const idCarteirinha = (Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 4)).toUpperCase().slice(0, 6);
        await pool.query(
          `INSERT INTO clientes (
            nome, sobrenome, email, senha, id_carteirinha, ativo, tipo_cliente, data_criacao, tenant_id,
            cpf_cnpj, sgp_id, ultimo_contrato_ativo, data_ultima_atividade, sgp_dados, origem_sgp
          ) VALUES ($1, $2, $3, $4, $5, $6, 'cliente', NOW(), $7, $8, $9, $10, $11, $12, TRUE)`,
          [
            nome || 'Cliente',
            sobrenome || '',
            loginEmail,
            senhaHash,
            idCarteirinha,
            ativo,
            session.user.tenant_id || null,
            cpfcnpj,
            sgpId,
            dataUltimoContratoAtivo,
            dataUltimaAtividade > new Date('1970-01-01') ? dataUltimaAtividade : null,
            JSON.stringify(sgpDados)
          ]
        );
        criados++;
      } else {
        const clienteExistente = sel.rows[0];
        // Verifica se já não é parceiro para evitar sobrescrever
        if (clienteExistente.tipo_cliente === 'parceiro') {
          errosDetalhados.push(`Cliente ${loginEmail} já é parceiro - não atualizado`);
          continue;
        }
        
        await pool.query(
          `UPDATE clientes SET
            ativo = $1,
            cpf_cnpj = COALESCE($2, cpf_cnpj),
            sgp_id = COALESCE($3, sgp_id),
            ultimo_contrato_ativo = COALESCE($4, ultimo_contrato_ativo),
            data_ultima_atividade = COALESCE($5, data_ultima_atividade),
            sgp_dados = $6,
            origem_sgp = TRUE
          WHERE email = $7`,
          [
            ativo,
            cpfcnpj,
            sgpId,
            dataUltimoContratoAtivo,
            dataUltimaAtividade > new Date('1970-01-01') ? dataUltimaAtividade : null,
            JSON.stringify(sgpDados),
            loginEmail
          ]
        );
        atualizados++;
      }
    } catch (dbError) {
      errosDetalhados.push(`Erro ao processar ${loginEmail}: ${dbError.message}`);
    }
  }

  // Salvar estatísticas e filtros usados na integração
  const statsImportacao = {
    data_importacao: new Date().toISOString(),
    total_sgp: clientesSGP.length,
    criados,
    atualizados,
    totalProcessados,
    limitesAtingidos,
    filtradosAtividade,
    filtradosData,
    filtros_aplicados: {
      apenas_ativos,
      dias_atividade,
      data_cadastro_inicio,
      data_cadastro_fim
    },
    erros: errosDetalhados.length
  };

  // Atualiza timestamp da última sincronização e salva configurações
  await pool.query(
    `UPDATE integracoes SET
      last_sync = NOW(),
      filtros_importacao = $1,
      stats_ultima_importacao = $2,
      ultima_importacao_completa = NOW()
    WHERE provedor_id = $3 AND tipo = 'SGP'`,
    [JSON.stringify(filtros), JSON.stringify(statsImportacao), provedor.id]
  );

  const resposta = {
    success: true,
    criados,
    atualizados,
    totalProcessados,
    limitesAtingidos,
    filtradosAtividade,
    filtradosData,
    totalSGP: clientesSGP.length,
    filtrosAplicados: {
      apenas_ativos,
      dias_atividade,
      data_cadastro_inicio,
      data_cadastro_fim
    },
    erros: errosDetalhados.length > 0 ? errosDetalhados : null
  };

  console.log('🎯 Resposta final da importação:', {
    success: resposta.success,
    criados: resposta.criados,
    atualizados: resposta.atualizados,
    totalSGP: resposta.totalSGP,
    totalProcessados: resposta.totalProcessados
  });

  try {
    const jsonString = JSON.stringify(resposta);
    console.log(`📏 Tamanho da resposta JSON: ${jsonString.length} caracteres`);

    return new Response(jsonString, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': jsonString.length.toString()
      }
    });
  } catch (jsonError) {
    console.error('❌ Erro ao serializar resposta:', jsonError);
    return new Response(JSON.stringify({
      error: 'Erro interno ao gerar resposta',
      details: jsonError.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  } catch (globalError) {
    console.error('💥 Erro global na importação SGP:', globalError);
    console.error('📊 Stack trace completo:', globalError.stack);

    return new Response(JSON.stringify({
      error: 'Erro interno do servidor durante importação',
      details: globalError.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}
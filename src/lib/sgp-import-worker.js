import { Pool } from 'pg';
import { validatePlanLimits } from '@/lib/tenant-helper';
import bcrypt from 'bcryptjs';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Função para buscar clientes SGP com callback de progresso
async function buscarClientesSGPComProgresso(url, authBody, onProgress) {
  let todosClientes = [];
  let offset = 0;
  const limit = 100;
  let hasMore = true;
  let requisicoes = 0;

  while (hasMore) {
    requisicoes++;
    const bodyComOffset = {
      ...authBody,
      limit,
      offset
    };

    onProgress({
      fase: 'buscando',
      mensagem: `Buscando lote ${requisicoes} (offset ${offset})...`,
      requisicoes
    });

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyComOffset),
      cache: 'no-store',
      signal: AbortSignal.timeout(30000)
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

      onProgress({
        fase: 'buscando',
        mensagem: `${todosClientes.length} clientes obtidos em ${requisicoes} requisições`,
        total_obtido: todosClientes.length,
        requisicoes
      });

      if (clientesBatch.length < limit) {
        hasMore = false;
      }
    }
  }

  return todosClientes;
}

// Função para processar clientes em chunks
async function processarClientesEmChunks(clientes, config, onProgress) {
  const chunkSize = 10; // Processar 10 clientes por vez
  const totalClientes = clientes.length;
  let processados = 0;
  let criados = 0;
  let atualizados = 0;
  let erros = 0;
  const errosDetalhados = [];

  const startTime = Date.now();

  for (let i = 0; i < clientes.length; i += chunkSize) {
    const chunk = clientes.slice(i, i + chunkSize);
    const chunkNum = Math.floor(i / chunkSize) + 1;
    const totalChunks = Math.ceil(clientes.length / chunkSize);

    onProgress({
      fase: 'processando',
      mensagem: `Processando lote ${chunkNum} de ${totalChunks} (${chunk.length} clientes)`,
      processados,
      total: totalClientes,
      progresso_percent: (processados / totalClientes) * 100,
      criados,
      atualizados,
      erros
    });

    // Processar chunk em paralelo
    const promisesChunk = chunk.map(async (clienteSGP) => {
      try {
        const result = await processarCliente(clienteSGP, config);
        return result;
      } catch (error) {
        errosDetalhados.push(`Cliente ${clienteSGP?.nome || 'sem nome'}: ${error.message}`);
        return { erro: true, mensagem: error.message };
      }
    });

    const resultados = await Promise.allSettled(promisesChunk);

    // Contar resultados
    resultados.forEach(result => {
      processados++;
      if (result.status === 'fulfilled' && result.value) {
        if (result.value.erro) {
          erros++;
        } else if (result.value.criado) {
          criados++;
        } else if (result.value.atualizado) {
          atualizados++;
        }
      } else {
        erros++;
      }
    });

    // Calcular ETA
    const elapsedTime = Date.now() - startTime;
    const avgTimePerCliente = elapsedTime / processados;
    const remainingClientes = totalClientes - processados;
    const etaMs = remainingClientes * avgTimePerCliente;
    const etaSegundos = Math.ceil(etaMs / 1000);

    onProgress({
      fase: 'processando',
      mensagem: `Lote ${chunkNum} concluído - ${processados}/${totalClientes} processados`,
      processados,
      total: totalClientes,
      progresso_percent: (processados / totalClientes) * 100,
      criados,
      atualizados,
      erros,
      eta_segundos: etaSegundos > 0 ? etaSegundos : null
    });

    // Pequena pausa para não sobrecarregar o banco
    if (i + chunkSize < clientes.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return {
    processados,
    criados,
    atualizados,
    erros,
    errosDetalhados
  };
}

async function processarCliente(clienteSGP, config) {
  const { senhaHash, session, tenantId } = config;

  // Lógica similar à API original mas simplificada para um cliente
  const cpfcnpj = clienteSGP?.cpfcnpj;
  const email = clienteSGP?.email;
  const loginEmail = email || (cpfcnpj ? `${cpfcnpj}@sgp.local` : null);

  if (!loginEmail) {
    throw new Error('Cliente não possui email nem CPF válido');
  }

  const nomeCompleto = clienteSGP?.nome || 'Cliente SGP';
  let nome = nomeCompleto;
  let sobrenome = '';
  if (nomeCompleto && typeof nomeCompleto === 'string' && nomeCompleto.includes(' ')) {
    const parts = nomeCompleto.split(' ');
    nome = parts.shift();
    sobrenome = parts.join(' ');
  }

  // Verificar se cliente existe
  const sel = await pool.query('SELECT id, tipo_cliente FROM clientes WHERE email = $1', [loginEmail]);

  if (sel.rows.length === 0) {
    // Verificar limite do plano
    if (session.user.role === 'provedor') {
      await validatePlanLimits(tenantId, 'clientes');
    }

    // Criar novo cliente
    const idCarteirinha = (Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 4)).toUpperCase().slice(0, 6);
    await pool.query(
      `INSERT INTO clientes (
        nome, sobrenome, email, senha, id_carteirinha, ativo, tipo_cliente, data_criacao, tenant_id,
        cpf_cnpj, origem_sgp
      ) VALUES ($1, $2, $3, $4, $5, $6, 'cliente', NOW(), $7, $8, TRUE)`,
      [
        nome || 'Cliente',
        sobrenome || '',
        loginEmail,
        senhaHash,
        idCarteirinha,
        true,
        tenantId,
        cpfcnpj
      ]
    );

    return { criado: true };
  } else {
    const clienteExistente = sel.rows[0];
    if (clienteExistente.tipo_cliente === 'parceiro') {
      throw new Error('Cliente já é parceiro - não atualizado');
    }

    await pool.query(
      `UPDATE clientes SET
        ativo = $1,
        cpf_cnpj = COALESCE($2, cpf_cnpj),
        origem_sgp = TRUE
      WHERE email = $3`,
      [true, cpfcnpj, loginEmail]
    );

    return { atualizado: true };
  }
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

// Função principal para executar importação SGP
export async function executarImportacaoSGP(job, config, onProgress) {
  try {
    console.log(`🚀 Executando importação SGP para job ${job.id}`);

    const { senha_padrao, filtros, modo, provedor_email } = config;

    // Obter provedor
    const provedor = await getProvedor(provedor_email);
    if (!provedor) {
      throw new Error('Provedor não encontrado');
    }

    // Obter integração
    const integracao = await getIntegracao(provedor.id);
    if (!integracao) {
      throw new Error('Integração SGP não configurada');
    }

    if (!integracao.token || !integracao.app_name) {
      throw new Error('Configuração incompleta: é necessário Token + Nome da Aplicação');
    }

    console.log('🔧 Configuração SGP:', {
      subdominio: integracao.subdominio,
      app_name: integracao.app_name,
      tem_token: !!integracao.token
    });

    // Preparar autenticação SGP
    const url = `https://${integracao.subdominio}.sgp.net.br/api/ura/clientes/`;
    const authBody = {
      token: integracao.token,
      app: integracao.app_name,
      omitir_contratos: false,
      ...filtros
    };

    onProgress({
      fase: 'buscando',
      mensagem: 'Buscando clientes do SGP...'
    });

    // Buscar clientes
    const clientesSGP = await buscarClientesSGPComProgresso(url, authBody, onProgress);

    onProgress({
      fase: 'preparando',
      mensagem: `${clientesSGP.length} clientes encontrados, iniciando processamento...`,
      total: clientesSGP.length
    });

    // Preparar configuração para processamento
    const senhaHash = await bcrypt.hash(senha_padrao, 10);
    const processingConfig = {
      senhaHash,
      session: { user: { role: 'provedor' } }, // Simulado para validatePlanLimits
      tenantId: provedor.id
    };

    // Processar clientes
    const resultado = await processarClientesEmChunks(clientesSGP, processingConfig, onProgress);

    console.log(`✅ Importação SGP concluída para job ${job.id}:`, resultado);
    return resultado;

  } catch (error) {
    console.error(`❌ Erro na importação SGP do job ${job.id}:`, error);
    throw error;
  }
}
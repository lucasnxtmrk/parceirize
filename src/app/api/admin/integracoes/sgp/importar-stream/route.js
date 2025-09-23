import { Pool } from 'pg';
import { getServerSession } from 'next-auth';
import { options } from '@/app/api/auth/[...nextauth]/options';
import { validatePlanLimits } from '@/lib/tenant-helper';
import bcrypt from 'bcryptjs';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Função para enviar evento SSE
function sendSSE(controller, data) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  controller.enqueue(new TextEncoder().encode(message));
}

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
  const { senhaHash, integracao, session } = config;

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
      await validatePlanLimits(session.user.tenant_id, 'clientes');
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
        session.user.tenant_id || null,
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

export async function GET(req) {
  const session = await getServerSession(options);
  if (!session || !['provedor', 'superadmin'].includes(session.user.role)) {
    return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403 });
  }

  const url = new URL(req.url);
  const senha_padrao = url.searchParams.get('senha_padrao');
  const modo = url.searchParams.get('modo') || 'completo';
  const filtrosParam = url.searchParams.get('filtros');
  const filtros = filtrosParam ? JSON.parse(filtrosParam) : {};

  // Configurar SSE
  const stream = new ReadableStream({
    async start(controller) {
      try {
        sendSSE(controller, {
          tipo: 'inicio',
          mensagem: 'Iniciando importação SGP...',
          timestamp: new Date().toISOString()
        });

        console.log('🚀 Configuração de importação:', {
          senha_padrao: senha_padrao ? '***' : 'não definida',
          modo,
          filtros: filtrosFinais
        });

        // Obter configurações
        const provedor = await getProvedor(session.user.email);
        if (!provedor) {
          throw new Error('Provedor não encontrado');
        }

        console.log('📋 Provedor encontrado:', { id: provedor.id, email: provedor.email });

        const integracao = await getIntegracao(provedor.id);
        if (!integracao) {
          throw new Error('Integração SGP não configurada');
        }

        console.log('🔧 Integração SGP encontrada:', {
          subdominio: integracao.subdominio,
          app_name: integracao.app_name,
          tem_token: !!integracao.token,
          tem_cpf_central: !!integracao.cpf_central
        });

        // Criar job de importação
        const jobResult = await pool.query(
          `INSERT INTO import_jobs (provedor_id, status, configuracao, mensagem_atual)
           VALUES ($1, 'running', $2, 'Iniciando importação...')
           RETURNING id`,
          [provedor.id, JSON.stringify({ filtros, modo })]
        );
        const jobId = jobResult.rows[0].id;

        sendSSE(controller, {
          tipo: 'job_criado',
          job_id: jobId,
          mensagem: 'Job de importação criado'
        });

        // Configurar filtros baseado no modo
        let filtrosFinais = filtros;
        if (modo === 'completo') {
          filtrosFinais = {
            apenas_ativos: true,
            dias_atividade: 365, // 1 ano
            data_cadastro_inicio: '',
            data_cadastro_fim: ''
          };
        }

        // Preparar autenticação SGP
        const url = `https://${integracao.subdominio}.sgp.net.br/api/consulta/clientes`;
        const authBody = {
          token: integracao.token,
          app_name: integracao.app_name,
          cpf_central: integracao.cpf_central,
          senha_central: integracao.senha_central,
          ...filtrosFinais // Incluir filtros na requisição base
        };

        console.log('🌐 URL SGP construída:', url);
        console.log('🔑 AuthBody:', {
          token: integracao.token ? 'DEFINIDO' : 'VAZIO',
          app_name: integracao.app_name,
          cpf_central: integracao.cpf_central ? 'DEFINIDO' : 'VAZIO',
          senha_central: integracao.senha_central ? 'DEFINIDO' : 'VAZIO',
          filtros: filtrosFinais
        });

        const senhaHash = await bcrypt.hash(senha_padrao, 10);

        // Buscar clientes com progresso
        sendSSE(controller, {
          tipo: 'progresso',
          fase: 'buscando',
          mensagem: 'Buscando clientes do SGP...'
        });

        const clientesSGP = await buscarClientesSGPComProgresso(url, authBody, (progress) => {
          pool.query(
            'UPDATE import_jobs SET mensagem_atual = $1, updated_at = NOW() WHERE id = $2',
            [progress.mensagem, jobId]
          );
          sendSSE(controller, { tipo: 'progresso', ...progress });
        });

        // Atualizar job com total estimado
        await pool.query(
          'UPDATE import_jobs SET total_estimado = $1, mensagem_atual = $2 WHERE id = $3',
          [clientesSGP.length, `${clientesSGP.length} clientes encontrados, iniciando processamento...`, jobId]
        );

        sendSSE(controller, {
          tipo: 'progresso',
          fase: 'preparando',
          mensagem: `${clientesSGP.length} clientes encontrados, iniciando processamento...`,
          total: clientesSGP.length
        });

        // Processar clientes em chunks
        const config = { senhaHash, integracao, session };
        const resultado = await processarClientesEmChunks(clientesSGP, config, async (progress) => {
          // Atualizar job no banco
          await pool.query(
            `UPDATE import_jobs SET
              processados = $1,
              criados = $2,
              atualizados = $3,
              erros = $4,
              progresso_percent = $5,
              eta_segundos = $6,
              mensagem_atual = $7
             WHERE id = $8`,
            [
              progress.processados,
              progress.criados,
              progress.atualizados,
              progress.erros,
              progress.progresso_percent,
              progress.eta_segundos,
              progress.mensagem,
              jobId
            ]
          );

          sendSSE(controller, { tipo: 'progresso', ...progress });
        });

        // Finalizar job
        await pool.query(
          `UPDATE import_jobs SET
            status = 'completed',
            finalizado_em = NOW(),
            resultados = $1,
            mensagem_atual = 'Importação concluída com sucesso'
           WHERE id = $2`,
          [JSON.stringify(resultado), jobId]
        );

        sendSSE(controller, {
          tipo: 'concluido',
          mensagem: 'Importação concluída com sucesso!',
          ...resultado,
          job_id: jobId
        });

      } catch (error) {
        console.error('Erro na importação:', error);

        sendSSE(controller, {
          tipo: 'erro',
          mensagem: error.message,
          timestamp: new Date().toISOString()
        });
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
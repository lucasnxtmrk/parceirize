import { Pool } from 'pg';
import { getServerSession } from 'next-auth';
import { options } from '@/app/api/auth/[...nextauth]/options';
import { validatePlanLimits } from '@/lib/tenant-helper';
import { getQueueService } from '@/lib/queue-service';
import '@/lib/init-queue'; // Inicializar sistema de filas
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

// Função para aguardar job iniciar processamento
async function waitForJobToStart(jobId, controller) {
  const maxWait = 300000; // 5 minutos
  const checkInterval = 2000; // 2 segundos
  const startTime = Date.now();

  return new Promise((resolve) => {
    const checkStatus = async () => {
      try {
        const result = await pool.query(
          `SELECT status, queue_position, mensagem_atual FROM import_jobs WHERE id = $1`,
          [jobId]
        );

        if (result.rows.length === 0) {
          resolve(false);
          return;
        }

        const job = result.rows[0];

        if (job.status === 'running') {
          sendSSE(controller, {
            tipo: 'progresso',
            fase: 'processando',
            mensagem: 'Importação iniciada!'
          });
          resolve(true);
          return;
        }

        if (job.status === 'failed') {
          sendSSE(controller, {
            tipo: 'erro',
            mensagem: job.mensagem_atual || 'Job falhou na fila'
          });
          resolve(false);
          return;
        }

        // Verificar timeout
        if (Date.now() - startTime > maxWait) {
          sendSSE(controller, {
            tipo: 'erro',
            mensagem: 'Timeout: Job não iniciou no tempo esperado'
          });
          resolve(false);
          return;
        }

        // Continuar aguardando
        setTimeout(checkStatus, checkInterval);

      } catch (error) {
        console.error('Erro ao verificar status do job:', error);
        resolve(false);
      }
    };

    checkStatus();
  });
}

// Função para monitorar progresso do job
async function monitorJobProgress(jobId, controller) {
  const maxMonitor = 1800000; // 30 minutos
  const checkInterval = 1000; // 1 segundo
  const startTime = Date.now();

  return new Promise((resolve) => {
    const checkProgress = async () => {
      try {
        const result = await pool.query(
          `SELECT
            status,
            total_estimado,
            processados,
            criados,
            atualizados,
            erros,
            progresso_percent,
            eta_segundos,
            mensagem_atual,
            resultados
          FROM import_jobs WHERE id = $1`,
          [jobId]
        );

        if (result.rows.length === 0) {
          sendSSE(controller, {
            tipo: 'erro',
            mensagem: 'Job não encontrado'
          });
          resolve(false);
          return;
        }

        const job = result.rows[0];

        // Enviar progresso atual
        sendSSE(controller, {
          tipo: 'progresso',
          fase: job.status === 'running' ? 'processando' : job.status,
          mensagem: job.mensagem_atual,
          total: job.total_estimado || 0,
          processados: job.processados || 0,
          criados: job.criados || 0,
          atualizados: job.atualizados || 0,
          erros: job.erros || 0,
          progresso_percent: job.progresso_percent || 0,
          eta_segundos: job.eta_segundos
        });

        // Verificar se completou
        if (job.status === 'completed') {
          const resultados = job.resultados ? JSON.parse(job.resultados) : {};
          sendSSE(controller, {
            tipo: 'concluido',
            mensagem: 'Importação concluída com sucesso!',
            ...resultados,
            job_id: jobId
          });
          resolve(true);
          return;
        }

        // Verificar se falhou
        if (job.status === 'failed') {
          sendSSE(controller, {
            tipo: 'erro',
            mensagem: job.mensagem_atual || 'Importação falhou'
          });
          resolve(false);
          return;
        }

        // Verificar timeout
        if (Date.now() - startTime > maxMonitor) {
          sendSSE(controller, {
            tipo: 'erro',
            mensagem: 'Timeout: Monitoramento excedeu tempo limite'
          });
          resolve(false);
          return;
        }

        // Continuar monitorando
        setTimeout(checkProgress, checkInterval);

      } catch (error) {
        console.error('Erro ao monitorar progresso:', error);
        sendSSE(controller, {
          tipo: 'erro',
          mensagem: 'Erro ao monitorar progresso: ' + error.message
        });
        resolve(false);
      }
    };

    checkProgress();
  });
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

        // Validar configuração obrigatória
        if (!integracao.token || !integracao.app_name) {
          throw new Error('Configuração incompleta: é necessário Token + Nome da Aplicação para importar clientes');
        }

        // Adicionar job à fila
        const queueService = getQueueService();
        const jobConfig = {
          senha_padrao,
          filtros: filtrosFinais,
          modo,
          integracao_id: integracao.id,
          provedor_email: session.user.email
        };

        const jobId = await queueService.enqueueJob(provedor.id, jobConfig);

        sendSSE(controller, {
          tipo: 'job_criado',
          job_id: jobId,
          mensagem: 'Job adicionado à fila de processamento',
          redirect_url: `/dashboard/importacoes?highlight=${jobId}`
        });

        // Verificar posição na fila
        const queuePosition = await queueService.getQueuePosition(provedor.id);

        sendSSE(controller, {
          tipo: 'progresso',
          fase: queuePosition > 0 ? 'na_fila' : 'iniciando',
          mensagem: queuePosition > 0
            ? `Na fila de processamento (posição ${queuePosition})`
            : 'Iniciando processamento...',
          queue_position: queuePosition,
          job_id: jobId
        });

        // Enviar mensagem de redirecionamento após 2 segundos
        setTimeout(() => {
          sendSSE(controller, {
            tipo: 'redirect',
            job_id: jobId,
            mensagem: 'Redirecionando para página de acompanhamento...',
            redirect_url: `/dashboard/importacoes?highlight=${jobId}`
          });
        }, 2000);

        // Monitorar apenas por um tempo limitado (30 segundos) antes de redirecionar
        const monitorStart = Date.now();
        const maxMonitorTime = 30000; // 30 segundos

        const quickMonitor = setInterval(async () => {
          try {
            if (Date.now() - monitorStart > maxMonitorTime) {
              clearInterval(quickMonitor);
              sendSSE(controller, {
                tipo: 'timeout_redirect',
                job_id: jobId,
                mensagem: 'Importação continua em background. Redirecionando...',
                redirect_url: `/dashboard/importacoes?highlight=${jobId}`
              });
              return;
            }

            // Verificar status atual
            const statusResult = await pool.query(
              'SELECT status, progresso_percent, mensagem_atual FROM import_jobs WHERE id = $1',
              [jobId]
            );

            if (statusResult.rows.length > 0) {
              const job = statusResult.rows[0];

              sendSSE(controller, {
                tipo: 'quick_update',
                job_id: jobId,
                status: job.status,
                progresso_percent: job.progresso_percent || 0,
                mensagem: job.mensagem_atual
              });

              // Se o job foi completado ou falhou, parar o monitoramento
              if (['completed', 'failed'].includes(job.status)) {
                clearInterval(quickMonitor);
                sendSSE(controller, {
                  tipo: job.status === 'completed' ? 'concluido_rapido' : 'erro_rapido',
                  job_id: jobId,
                  mensagem: job.status === 'completed'
                    ? 'Importação concluída rapidamente!'
                    : 'Importação falhou',
                  redirect_url: `/dashboard/importacoes?highlight=${jobId}`
                });
              }
            }
          } catch (error) {
            console.error('Erro no monitoramento rápido:', error);
          }
        }, 3000); // Verificar a cada 3 segundos

        // Limpar intervalo após 30 segundos
        setTimeout(() => {
          clearInterval(quickMonitor);
        }, maxMonitorTime);

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
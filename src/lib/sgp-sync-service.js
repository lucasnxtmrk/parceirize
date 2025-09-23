/**
 * SERVIÇO DE SINCRONIZAÇÃO SGP INTELIGENTE
 *
 * Este serviço implementa uma sincronização otimizada e inteligente
 * que busca apenas clientes com contratos ativos e mudanças recentes.
 */

import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { validatePlanLimits, logTenantAction } from '@/lib/tenant-helper';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export class SGPSyncService {
  constructor() {
    this.defaultFilters = {
      apenas_ativos: true,
      max_clientes_por_sync: 500,
      horas_busca_alteracao: 24
    };
  }

  /**
   * Busca integração SGP de um provedor
   */
  async getIntegracao(provedorId) {
    const result = await pool.query(
      `SELECT i.*, p.tenant_id
       FROM integracoes i
       JOIN provedores p ON i.provedor_id = p.id
       WHERE i.provedor_id = $1 AND i.tipo = 'SGP'`,
      [provedorId]
    );
    return result.rows[0] || null;
  }

  /**
   * Busca clientes SGP com filtros inteligentes
   */
  async buscarClientesSGP(integracao, opcoes = {}) {
    const {
      buscar_apenas_alteracoes = true,
      horas_alteracao = 24,
      apenas_ativos = true,
      max_clientes = 500
    } = opcoes;

    const url = `https://${integracao.subdominio}.sgp.net.br/api/ura/clientes/`;

    const authBody = {
      token: integracao.token,
      app: integracao.app_name,
      omitir_contratos: false,
      limit: Math.min(100, max_clientes) // API SGP permite max 100 por request
    };

    // Filtrar apenas contratos ativos
    if (apenas_ativos) {
      authBody.contrato_status = 1; // 1 = Ativo no SGP
    }

    // Filtrar por alterações recentes para sincronização incremental
    if (buscar_apenas_alteracoes) {
      const dataLimite = new Date();
      dataLimite.setHours(dataLimite.getHours() - horas_alteracao);
      authBody.data_alteracao_inicio = dataLimite.toISOString().split('T')[0];
    }

    console.log('📡 Buscando clientes SGP com filtros:', {
      apenas_ativos,
      buscar_apenas_alteracoes,
      horas_alteracao,
      url
    });

    let todosClientes = [];
    let offset = 0;
    let hasMore = true;
    let requisicoes = 0;

    while (hasMore && todosClientes.length < max_clientes) {
      requisicoes++;
      const bodyComOffset = {
        ...authBody,
        offset
      };

      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyComOffset),
        cache: 'no-store',
        signal: AbortSignal.timeout(30000)
      });

      if (!resp.ok) {
        throw new Error(`Falha SGP (offset ${offset}): ${resp.status} ${resp.statusText}`);
      }

      const data = await resp.json();
      const clientesBatch = data?.clientes || [];

      console.log(`📦 Requisição ${requisicoes}: ${clientesBatch.length} clientes (offset: ${offset})`);

      if (clientesBatch.length === 0 || clientesBatch.length < authBody.limit) {
        hasMore = false;
      }

      todosClientes = todosClientes.concat(clientesBatch);
      offset += authBody.limit;

      // Limite de segurança para não sobrecarregar
      if (requisicoes >= 10) {
        console.log('🛑 Limite de requisições atingido (10), parando busca');
        break;
      }
    }

    console.log(`🎯 Total obtido: ${todosClientes.length} clientes em ${requisicoes} requisições`);
    return todosClientes;
  }

  /**
   * Verifica se cliente já existe no sistema
   */
  async verificarClienteExistente(clienteSGP) {
    const cpfcnpj = clienteSGP?.cpfcnpj;
    const email = clienteSGP?.email;
    const sgpId = clienteSGP?.id;

    if (!cpfcnpj && !email && !sgpId) {
      return null;
    }

    let query = 'SELECT id, email, ativo, tipo_cliente, tenant_id FROM clientes WHERE ';
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (cpfcnpj) {
      conditions.push(`cpf_cnpj = $${paramIndex}`);
      params.push(cpfcnpj);
      paramIndex++;
    }

    if (email) {
      conditions.push(`email = $${paramIndex}`);
      params.push(email);
      paramIndex++;
    }

    if (sgpId) {
      conditions.push(`sgp_id = $${paramIndex}`);
      params.push(sgpId);
      paramIndex++;
    }

    query += conditions.join(' OR ');

    const result = await pool.query(query, params);
    return result.rows[0] || null;
  }

  /**
   * Cria novo cliente do SGP
   */
  async criarNovoCliente(clienteSGP, tenantId, senhaHash = null) {
    const contratos = clienteSGP?.contratos || [];
    const cpfcnpj = clienteSGP?.cpfcnpj;
    const email = clienteSGP?.email;
    const loginEmail = email || (cpfcnpj ? `${cpfcnpj}@sgp.local` : null);

    if (!loginEmail) {
      throw new Error('Cliente sem email ou CPF válido');
    }

    // Verificar se tem contrato ativo
    const temContratoAtivo = contratos.some(c =>
      (c?.status || '').toString().toUpperCase() === 'ATIVO'
    );

    const nomeCompleto = clienteSGP?.nome || 'Cliente SGP';
    let nome = nomeCompleto;
    let sobrenome = '';
    if (nomeCompleto && typeof nomeCompleto === 'string' && nomeCompleto.includes(' ')) {
      const parts = nomeCompleto.split(' ');
      nome = parts.shift();
      sobrenome = parts.join(' ');
    }

    // Dados completos do SGP
    const sgpDados = {
      id: clienteSGP?.id,
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

    // Gerar senha padrão se não informada
    if (!senhaHash) {
      const senhaDefault = '123456'; // Senha padrão para novos clientes
      senhaHash = await bcrypt.hash(senhaDefault, 10);
    }

    // ID de carteirinha único
    const idCarteirinha = (Math.random().toString(36).slice(2, 8) +
                          Math.random().toString(36).slice(2, 4)).toUpperCase().slice(0, 6);

    // Datas importantes
    const ultimoContratoAtivo = contratos
      .filter(c => (c?.status || '').toString().toUpperCase() === 'ATIVO')
      .sort((a, b) => new Date(b?.dataCadastro || 0) - new Date(a?.dataCadastro || 0))[0];

    const dataUltimoContratoAtivo = ultimoContratoAtivo?.dataCadastro || null;

    const dataUltimaAtividade = contratos.reduce((ultima, contrato) => {
      const dataContrato = new Date(contrato?.dataCadastro || '1970-01-01');
      return dataContrato > ultima ? dataContrato : ultima;
    }, new Date('1970-01-01'));

    const result = await pool.query(
      `INSERT INTO clientes (
        nome, sobrenome, email, senha, id_carteirinha, ativo, tipo_cliente,
        data_criacao, tenant_id, cpf_cnpj, sgp_id, ultimo_contrato_ativo,
        data_ultima_atividade, sgp_dados, origem_sgp
      ) VALUES ($1, $2, $3, $4, $5, $6, 'cliente', NOW(), $7, $8, $9, $10, $11, $12, TRUE)
      RETURNING id, nome, sobrenome, email, id_carteirinha`,
      [
        nome || 'Cliente',
        sobrenome || '',
        loginEmail,
        senhaHash,
        idCarteirinha,
        temContratoAtivo,
        tenantId,
        cpfcnpj,
        clienteSGP?.id,
        dataUltimoContratoAtivo,
        dataUltimaAtividade > new Date('1970-01-01') ? dataUltimaAtividade : null,
        JSON.stringify(sgpDados)
      ]
    );

    return result.rows[0];
  }

  /**
   * Atualiza cliente existente
   */
  async atualizarClienteExistente(clienteExistente, clienteSGP) {
    const contratos = clienteSGP?.contratos || [];
    const temContratoAtivo = contratos.some(c =>
      (c?.status || '').toString().toUpperCase() === 'ATIVO'
    );

    // Dados atualizados do SGP
    const sgpDados = {
      id: clienteSGP?.id,
      nome: clienteSGP?.nome,
      cpfcnpj: clienteSGP?.cpfcnpj,
      email: clienteSGP?.email,
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

    // Datas importantes
    const ultimoContratoAtivo = contratos
      .filter(c => (c?.status || '').toString().toUpperCase() === 'ATIVO')
      .sort((a, b) => new Date(b?.dataCadastro || 0) - new Date(a?.dataCadastro || 0))[0];

    const dataUltimoContratoAtivo = ultimoContratoAtivo?.dataCadastro || null;

    const dataUltimaAtividade = contratos.reduce((ultima, contrato) => {
      const dataContrato = new Date(contrato?.dataCadastro || '1970-01-01');
      return dataContrato > ultima ? dataContrato : ultima;
    }, new Date('1970-01-01'));

    const result = await pool.query(
      `UPDATE clientes SET
        ativo = $1,
        cpf_cnpj = COALESCE($2, cpf_cnpj),
        sgp_id = COALESCE($3, sgp_id),
        ultimo_contrato_ativo = COALESCE($4, ultimo_contrato_ativo),
        data_ultima_atividade = COALESCE($5, data_ultima_atividade),
        sgp_dados = $6,
        origem_sgp = TRUE
      WHERE id = $7`,
      [
        temContratoAtivo,
        clienteSGP?.cpfcnpj,
        clienteSGP?.id,
        dataUltimoContratoAtivo,
        dataUltimaAtividade > new Date('1970-01-01') ? dataUltimaAtividade : null,
        JSON.stringify(sgpDados),
        clienteExistente.id
      ]
    );

    // Se cliente foi transformado em parceiro, sincronizar também
    if (clienteExistente.tipo_cliente === 'parceiro') {
      await pool.query(
        'UPDATE parceiros SET ativo = $1 WHERE email = $2',
        [temContratoAtivo, clienteExistente.email]
      );
    }

    return result.rowCount > 0;
  }

  /**
   * Executa sincronização completa para um provedor
   */
  async sincronizarProvedor(provedorId, opcoes = {}) {
    console.log(`🔄 Iniciando sincronização SGP para provedor ${provedorId}...`);

    const integracao = await this.getIntegracao(provedorId);
    if (!integracao) {
      throw new Error('Integração SGP não configurada');
    }

    if ((integracao.modo_ativacao || 'manual') !== 'integracao') {
      return { skipped: true, motivo: 'Modo de ativação não é integração' };
    }

    const {
      buscar_apenas_alteracoes = true,
      incluir_novos_clientes = true,
      senha_padrao_novos = '123456'
    } = opcoes;

    // Buscar clientes do SGP
    const clientesSGP = await this.buscarClientesSGP(integracao, {
      buscar_apenas_alteracoes,
      apenas_ativos: true,
      max_clientes: 500
    });

    if (clientesSGP.length === 0) {
      console.log('✅ Nenhum cliente encontrado para sincronização');
      return {
        success: true,
        totalSGP: 0,
        novos: 0,
        atualizados: 0,
        erros: 0
      };
    }

    let novos = 0;
    let atualizados = 0;
    let limitesAtingidos = 0;
    const errosDetalhados = [];

    const senhaHash = await bcrypt.hash(senha_padrao_novos, 10);

    for (const clienteSGP of clientesSGP) {
      try {
        const clienteExistente = await this.verificarClienteExistente(clienteSGP);

        if (!clienteExistente && incluir_novos_clientes) {
          // Verificar limite do plano antes de criar
          try {
            await validatePlanLimits(integracao.tenant_id, 'clientes');
          } catch (limitError) {
            limitesAtingidos++;
            errosDetalhados.push(`Limite do plano atingido: ${limitError.message}`);
            break; // Para na primeira vez que atingir o limite
          }

          // Criar novo cliente
          const novoCliente = await this.criarNovoCliente(clienteSGP, integracao.provedor_id, senhaHash);
          novos++;

          // Log de auditoria
          await logTenantAction(
            integracao.provedor_id,
            0, // Sistema automático
            'sistema',
            'cliente_sgp_criado',
            { cliente_email: novoCliente.email, sgp_id: clienteSGP?.id }
          );

        } else if (clienteExistente) {
          // Atualizar cliente existente
          const atualizado = await this.atualizarClienteExistente(clienteExistente, clienteSGP);
          if (atualizado) {
            atualizados++;

            // Log de auditoria
            await logTenantAction(
              integracao.provedor_id,
              0, // Sistema automático
              'sistema',
              'cliente_sgp_atualizado',
              { cliente_email: clienteExistente.email, sgp_id: clienteSGP?.id }
            );
          }
        }

      } catch (error) {
        errosDetalhados.push(`Erro ao processar cliente ${clienteSGP?.email || clienteSGP?.cpfcnpj}: ${error.message}`);
      }
    }

    // Atualizar estatísticas da sincronização
    const statsSincronizacao = {
      data_sincronizacao: new Date().toISOString(),
      total_sgp: clientesSGP.length,
      novos,
      atualizados,
      limitesAtingidos,
      erros: errosDetalhados.length,
      modo: buscar_apenas_alteracoes ? 'incremental' : 'completa',
      filtros_aplicados: {
        apenas_ativos: true,
        buscar_apenas_alteracoes,
        horas_alteracao: opcoes.horas_alteracao || 24
      }
    };

    await pool.query(
      `UPDATE integracoes SET
        last_sync = NOW(),
        stats_ultima_importacao = $1
      WHERE provedor_id = $2 AND tipo = 'SGP'`,
      [JSON.stringify(statsSincronizacao), provedorId]
    );

    console.log(`✅ Sincronização concluída: ${novos} novos, ${atualizados} atualizados, ${errosDetalhados.length} erros`);

    return {
      success: true,
      totalSGP: clientesSGP.length,
      novos,
      atualizados,
      limitesAtingidos,
      erros: errosDetalhados.length,
      detalhesErros: errosDetalhados.length > 0 ? errosDetalhados : null
    };
  }

  /**
   * Executa sincronização automática para todos os provedores ativos
   */
  async sincronizarTodos() {
    console.log('🚀 Iniciando sincronização automática para todos os provedores...');

    const integracoes = await pool.query(
      `SELECT provedor_id, subdominio, token, app_name
       FROM integracoes
       WHERE tipo = 'SGP'
       AND modo_ativacao = 'integracao'
       AND provedor_id IS NOT NULL`
    );

    const resultados = [];

    for (const integracao of integracoes.rows) {
      try {
        const resultado = await this.sincronizarProvedor(integracao.provedor_id, {
          buscar_apenas_alteracoes: true,
          incluir_novos_clientes: true
        });
        resultados.push({ provedor_id: integracao.provedor_id, resultado });
      } catch (error) {
        resultados.push({
          provedor_id: integracao.provedor_id,
          erro: error.message
        });
      }
    }

    console.log(`✅ Sincronização automática concluída: ${resultados.length} provedores processados`);
    return resultados;
  }
}

export default SGPSyncService;
const { Pool } = require('pg');
const fetch = require('node-fetch');

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL 
});

async function sincronizarSGPAutomatico() {
  console.log('🔄 Iniciando sincronização automática SGP...');
  
  try {
    // Buscar todas as integrações SGP dos admins com modo_ativacao = 'integracao'
    const integracoes = await pool.query(
      `SELECT admin_id, subdominio, token, app_name 
       FROM integracoes 
       WHERE tipo = 'SGP' 
       AND modo_ativacao = 'integracao' 
       AND admin_id IS NOT NULL`
    );
    
    if (integracoes.rows.length === 0) {
      console.log('📋 Nenhuma integração SGP configurada para sincronização automática');
      return;
    }
    
    console.log(`📊 Encontradas ${integracoes.rows.length} integração(ões) para sincronizar`);
    
    for (const integracao of integracoes.rows) {
      try {
        console.log(`🔄 Sincronizando admin_id: ${integracao.admin_id}`);
        
        const url = `https://${integracao.subdominio}.sgp.net.br/api/clientes`;
        const authBody = {
          token: integracao.token,
          app: integracao.app_name,
          omitir_contratos: false,
          limit: 500
        };

        const resp = await fetch(url, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(authBody),
          timeout: 30000 // 30s timeout
        });
        
        if (!resp.ok) {
          throw new Error(`SGP responded with ${resp.status}: ${resp.statusText}`);
        }
        
        const data = await resp.json();
        const clientes = data?.clientes || [];
        
        let ativados = 0;
        let desativados = 0;
        
        for (const cliente of clientes) {
          const contratos = cliente?.contratos || [];
          
          for (const contrato of contratos) {
            const status = (contrato?.status || '').toString().toUpperCase();
            const cpfcnpj = cliente?.cpfcnpj;
            const email = cliente?.email;
            const loginEmail = email || (cpfcnpj ? `${cpfcnpj}@sgp.local` : null);
            
            if (!loginEmail) continue;

            try {
              // Verificar se cliente existe e não é parceiro
              const clienteCheck = await pool.query(
                'SELECT id, tipo_cliente FROM clientes WHERE email = $1', 
                [loginEmail]
              );
              
              if (clienteCheck.rows.length === 0) continue; // Cliente não existe, pula
              
              const clienteExistente = clienteCheck.rows[0];
              if (clienteExistente.tipo_cliente === 'parceiro') continue; // Não alterar parceiros

              if (status === 'ATIVO') {
                const r = await pool.query('UPDATE clientes SET ativo = TRUE WHERE email = $1', [loginEmail]);
                if (r.rowCount > 0) ativados += r.rowCount;
              } else if (['SUSPENSO', 'CANCELADO', 'INATIVO'].includes(status)) {
                const r = await pool.query('UPDATE clientes SET ativo = FALSE WHERE email = $1', [loginEmail]);
                if (r.rowCount > 0) desativados += r.rowCount;
              }
            } catch (dbError) {
              console.error(`❌ Erro ao atualizar cliente ${loginEmail}:`, dbError.message);
            }
          }
        }

        // Atualizar timestamp da última sincronização
        await pool.query(
          `UPDATE integracoes SET last_sync = NOW() WHERE admin_id = $1 AND tipo = 'SGP'`,
          [integracao.admin_id]
        );

        console.log(`✅ Admin ${integracao.admin_id}: ${ativados} ativados, ${desativados} desativados`);
        
      } catch (error) {
        console.error(`❌ Erro na sincronização admin_id ${integracao.admin_id}:`, error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro geral na sincronização automática:', error);
  }
}

// Função para executar a cada 8 horas
function iniciarCronSGP() {
  const OITO_HORAS_MS = 8 * 60 * 60 * 1000; // 8 horas em millisegundos
  
  console.log('🚀 Cron SGP iniciado - sincronizações a cada 8 horas');
  console.log('⏰ Próxima sincronização:', new Date(Date.now() + OITO_HORAS_MS).toLocaleString('pt-BR'));
  
  // Primeira execução imediata (opcional)
  // sincronizarSGPAutomatico();
  
  // Agendar execuções a cada 8 horas
  setInterval(async () => {
    await sincronizarSGPAutomatico();
    console.log('⏰ Próxima sincronização:', new Date(Date.now() + OITO_HORAS_MS).toLocaleString('pt-BR'));
  }, OITO_HORAS_MS);
}

// Se executado diretamente
if (require.main === module) {
  iniciarCronSGP();
}

module.exports = {
  sincronizarSGPAutomatico,
  iniciarCronSGP
};
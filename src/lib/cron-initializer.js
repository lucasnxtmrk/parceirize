/**
 * INICIALIZADOR DO SISTEMA DE CRON PERSISTENTE
 *
 * Este módulo garante que o sistema de cron persistente seja iniciado
 * automaticamente quando a aplicação carregar.
 */

import { getPersistentCronService } from '@/lib/persistent-cron-service';

let cronServiceInitialized = false;

/**
 * Inicializa o serviço de cron persistente (apenas uma vez)
 */
export function initializePersistentCron() {
  if (cronServiceInitialized) {
    return;
  }

  try {
    console.log('🚀 Inicializando sistema de cron persistente...');

    // Obter instância do serviço (isso já inicia o cron automaticamente)
    const cronService = getPersistentCronService();

    cronServiceInitialized = true;
    console.log('✅ Sistema de cron persistente inicializado com sucesso');

    return cronService;
  } catch (error) {
    console.error('❌ Erro ao inicializar sistema de cron persistente:', error.message);
    throw error;
  }
}

/**
 * Middleware para Next.js que garante que o cron seja inicializado
 */
export function ensureCronInitialized() {
  if (!cronServiceInitialized) {
    initializePersistentCron();
  }
}

// Auto-inicializar quando o módulo for carregado
if (typeof window === 'undefined') { // Apenas no servidor
  // Delay para garantir que o banco esteja disponível
  setTimeout(() => {
    initializePersistentCron();
  }, 2000);
}

export default { initializePersistentCron, ensureCronInitialized };
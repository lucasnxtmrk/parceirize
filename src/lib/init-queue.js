import { getQueueService } from './queue-service.js';

let queueInitialized = false;

console.log('📦 Módulo init-queue carregado, window:', typeof window);

export function initializeQueue() {
  if (queueInitialized) {
    console.log('⚠️ Sistema de filas já inicializado');
    return;
  }

  try {
    console.log('🚀 Inicializando sistema de filas...');

    const queueService = getQueueService();
    console.log('📋 QueueService criado:', !!queueService);

    // Iniciar processamento da fila
    queueService.startProcessing();
    console.log('⚙️ Processamento da fila iniciado');

    // Limpeza de jobs antigos a cada hora
    setInterval(() => {
      queueService.cleanupOldJobs().catch(error => {
        console.error('Erro na limpeza de jobs antigos:', error);
      });
    }, 3600000); // 1 hora

    queueInitialized = true;
    console.log('✅ Sistema de filas inicializado com sucesso');

  } catch (error) {
    console.error('❌ Erro ao inicializar sistema de filas:', error);
  }
}

// Auto-inicializar quando o módulo for importado
if (typeof window === 'undefined') { // Só no servidor
  initializeQueue();
}
import { useState, useEffect, useRef, useCallback } from 'react';

export const useImportProgress = () => {
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState({
    fase: null,
    mensagem: '',
    processados: 0,
    total: 0,
    criados: 0,
    atualizados: 0,
    erros: 0,
    progresso_percent: 0,
    eta_segundos: null,
    job_id: null
  });
  const [error, setError] = useState(null);
  const [isCompleted, setIsCompleted] = useState(false);

  const eventSourceRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const retryCount = useRef(0);
  const maxRetries = 3;

  // Função para formatar ETA
  const formatETA = useCallback((seconds) => {
    if (!seconds || seconds <= 0) return null;

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}min ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  }, []);

  // Função para limpar recursos
  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  // Função para conectar ao SSE
  const connectSSE = useCallback((url) => {
    cleanup();

    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('🔗 Conexão SSE estabelecida');
      retryCount.current = 0;
      setError(null);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📨 Evento SSE recebido:', data);

        switch (data.tipo) {
          case 'inicio':
            setIsImporting(true);
            setIsCompleted(false);
            setError(null);
            setProgress(prev => ({
              ...prev,
              fase: 'iniciando',
              mensagem: data.mensagem,
              progresso_percent: 0
            }));
            break;

          case 'job_criado':
            setProgress(prev => ({
              ...prev,
              job_id: data.job_id,
              mensagem: data.mensagem
            }));
            break;

          case 'progresso':
            setProgress(prev => ({
              ...prev,
              fase: data.fase,
              mensagem: data.mensagem,
              processados: data.processados || prev.processados,
              total: data.total || prev.total,
              criados: data.criados || prev.criados,
              atualizados: data.atualizados || prev.atualizados,
              erros: data.erros || prev.erros,
              progresso_percent: data.progresso_percent || prev.progresso_percent,
              eta_segundos: data.eta_segundos
            }));
            break;

          case 'concluido':
            setProgress(prev => ({
              ...prev,
              fase: 'concluido',
              mensagem: data.mensagem,
              processados: data.processados,
              criados: data.criados,
              atualizados: data.atualizados,
              erros: data.erros,
              progresso_percent: 100,
              eta_segundos: null
            }));
            setIsImporting(false);
            setIsCompleted(true);
            cleanup();
            break;

          case 'erro':
            console.error('❌ Erro na importação:', data.mensagem);
            setError(data.mensagem);
            setIsImporting(false);
            cleanup();
            break;

          default:
            console.log('📋 Evento desconhecido:', data);
        }
      } catch (parseError) {
        console.error('❌ Erro ao parsear evento SSE:', parseError);
      }
    };

    eventSource.onerror = (error) => {
      console.error('❌ Erro na conexão SSE:', error);

      // Tentar reconectar se não excedeu o máximo de tentativas
      if (retryCount.current < maxRetries && isImporting) {
        retryCount.current++;
        const retryDelay = Math.min(1000 * Math.pow(2, retryCount.current), 10000);

        console.log(`🔄 Tentando reconectar em ${retryDelay}ms (tentativa ${retryCount.current}/${maxRetries})`);

        retryTimeoutRef.current = setTimeout(() => {
          if (isImporting) {
            connectSSE(url);
          }
        }, retryDelay);
      } else {
        setError('Conexão perdida. Recarregue a página para verificar o status.');
        setIsImporting(false);
        cleanup();
      }
    };
  }, [isImporting, cleanup]);

  // Função para iniciar importação
  const startImport = useCallback(async (config = {}) => {
    const { senha_padrao, filtros, modo = 'filtrado' } = config;

    if (!senha_padrao) {
      setError('Senha padrão é obrigatória');
      return false;
    }

    try {
      setIsImporting(true);
      setIsCompleted(false);
      setError(null);

      // Reset do progresso
      setProgress({
        fase: 'preparando',
        mensagem: 'Preparando importação...',
        processados: 0,
        total: 0,
        criados: 0,
        atualizados: 0,
        erros: 0,
        progresso_percent: 0,
        eta_segundos: null,
        job_id: null
      });

      // Configurar URL do SSE
      const params = new URLSearchParams({
        senha_padrao,
        modo,
        filtros: JSON.stringify(filtros || {})
      });

      const sseUrl = `/api/admin/integracoes/sgp/importar-stream?${params}`;

      // Conectar ao SSE
      connectSSE(sseUrl);

      return true;
    } catch (error) {
      console.error('❌ Erro ao iniciar importação:', error);
      setError(error.message);
      setIsImporting(false);
      return false;
    }
  }, [connectSSE]);

  // Função para parar importação
  const stopImport = useCallback(() => {
    cleanup();
    setIsImporting(false);
    setProgress(prev => ({
      ...prev,
      fase: 'cancelado',
      mensagem: 'Importação cancelada pelo usuário'
    }));
  }, [cleanup]);

  // Cleanup quando o componente é desmontado
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // Função para resetar estado
  const reset = useCallback(() => {
    cleanup();
    setIsImporting(false);
    setIsCompleted(false);
    setError(null);
    setProgress({
      fase: null,
      mensagem: '',
      processados: 0,
      total: 0,
      criados: 0,
      atualizados: 0,
      erros: 0,
      progresso_percent: 0,
      eta_segundos: null,
      job_id: null
    });
  }, [cleanup]);

  return {
    // Estado
    isImporting,
    progress,
    error,
    isCompleted,

    // Funções
    startImport,
    stopImport,
    reset,

    // Utilitários
    formatETA: formatETA(progress.eta_segundos),
    progressPercent: Math.round(progress.progresso_percent || 0),
    hasProgress: progress.total > 0,

    // Status descritivo
    statusText: progress.mensagem || (isImporting ? 'Importando...' : 'Pronto')
  };
};
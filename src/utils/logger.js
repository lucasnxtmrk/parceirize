/**
 * Sistema centralizado de logging que funciona tanto em dev quanto em produção
 */

const isDevelopment = process.env.NODE_ENV === 'development';

class Logger {
  constructor() {
    this.isDevelopment = isDevelopment;
  }

  _formatMessage(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    
    if (data) {
      return { message: formattedMessage, data };
    }
    return formattedMessage;
  }

  _log(level, message, data = null) {
    if (this.isDevelopment) {
      const formatted = this._formatMessage(level, message, data);
      
      if (data) {
        console[level](formatted.message, data);
      } else {
        console[level](formatted);
      }
    } else {
      // Em produção, você pode enviar para serviços de monitoramento
      // como Sentry, LogRocket, etc.
      this._logToService(level, message, data);
    }
  }

  _logToService(level, message, data = null) {
    // TODO: Integrar com serviço de logging em produção
    // Por enquanto, apenas armazena localmente para casos críticos
    if (level === 'error') {
      try {
        const errorLog = this._formatMessage(level, message, data);
        localStorage.setItem('lastError', JSON.stringify({
          timestamp: Date.now(),
          log: errorLog
        }));
      } catch (e) {
        // Se falhar ao salvar no localStorage, não faz nada
      }
    }
  }

  debug(message, data = null) {
    this._log('debug', message, data);
  }

  info(message, data = null) {
    this._log('info', message, data);
  }

  warn(message, data = null) {
    this._log('warn', message, data);
  }

  error(message, data = null) {
    this._log('error', message, data);
  }

  // Método especial para erros de API
  apiError(endpoint, error, requestData = null) {
    const message = `API Error on ${endpoint}`;
    const data = {
      error: error.message || error,
      status: error.status || 'unknown',
      requestData
    };
    this.error(message, data);
  }

  // Método para performance tracking
  performance(operation, duration) {
    this.info(`Performance: ${operation} took ${duration}ms`);
  }
}

// Singleton instance
const logger = new Logger();

export default logger;

// Export individual methods for convenience
export const { debug, info, warn, error, apiError, performance } = logger;
/**
 * Formata preço em reais brasileiro
 */
export const formatPrice = (price) => {
  const numericPrice = typeof price === 'string' ? parseFloat(price) : price;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(numericPrice || 0);
};

/**
 * Formata data e hora em formato brasileiro
 */
export const formatDateTime = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleString('pt-BR');
};

/**
 * Formata apenas data em formato brasileiro
 */
export const formatDate = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('pt-BR');
};

/**
 * Normaliza dados da API convertendo strings para números apropriados
 */
export const normalizeApiData = (data) => {
  if (!data) return data;
  
  if (Array.isArray(data)) {
    return data.map(normalizeApiData);
  }
  
  if (typeof data === 'object') {
    const normalized = { ...data };
    
    // Converter campos comuns que vêm como string mas devem ser números
    const numericFields = [
      'total_produtos', 'menor_preco', 'maior_preco', 'preco', 
      'subtotal', 'total', 'quantidade', 'desconto', 'limite_uso'
    ];
    
    numericFields.forEach(field => {
      if (normalized[field] !== undefined) {
        const value = normalized[field];
        if (typeof value === 'string' && !isNaN(value) && value !== '') {
          normalized[field] = parseFloat(value);
        }
      }
    });
    
    return normalized;
  }
  
  return data;
};

/**
 * Trunca texto com ellipsis
 */
export const truncateText = (text, maxLength = 100) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
};

/**
 * Gera ID único baseado em timestamp
 */
export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

/**
 * Debounce para evitar múltiplas chamadas
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};
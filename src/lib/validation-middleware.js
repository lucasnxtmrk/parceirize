import { validateId, validateEmail, sanitizeString } from '@/lib/tenant-helper';

// Função para validar CPF
function validateCPF(cpf) {
  // Elimina CPFs conhecidos que são inválidos
  if (cpf === "00000000000" || cpf === "11111111111" || cpf === "22222222222" ||
      cpf === "33333333333" || cpf === "44444444444" || cpf === "55555555555" ||
      cpf === "66666666666" || cpf === "77777777777" || cpf === "88888888888" ||
      cpf === "99999999999") {
    return false;
  }

  // Valida 1º dígito
  let add = 0;
  for (let i = 0; i < 9; i++) {
    add += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let rev = 11 - (add % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cpf.charAt(9))) return false;

  // Valida 2º dígito
  add = 0;
  for (let i = 0; i < 10; i++) {
    add += parseInt(cpf.charAt(i)) * (11 - i);
  }
  rev = 11 - (add % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cpf.charAt(10))) return false;

  return true;
}

// Schemas de validação para diferentes entidades
export const ValidationSchemas = {
  cliente: {
    nome: { required: true, type: 'string', maxLength: 100 },
    sobrenome: { required: true, type: 'string', maxLength: 100 },
    email: { required: true, type: 'email' },
    cpf_cnpj: { required: true, type: 'cpf_cnpj' },
    senha: { required: true, type: 'string', minLength: 6 },
    id: { required: false, type: 'id' }
  },

  parceiro: {
    nome_empresa: { required: true, type: 'string', maxLength: 255 },
    email: { required: true, type: 'email' },
    senha: { required: true, type: 'string', minLength: 6 },
    desconto: { required: true, type: 'number', min: 0, max: 100 },
    nicho: { required: false, type: 'string', maxLength: 100 },
    limitar_voucher: { required: false, type: 'boolean' },
    limite_uso: { required: false, type: 'number', min: 1 },
    id: { required: false, type: 'id' }
  },

  voucher: {
    codigo: { required: false, type: 'string', maxLength: 20 },
    desconto: { required: true, type: 'number', min: 0, max: 100 },
    titulo: { required: false, type: 'string', maxLength: 255 },
    descricao: { required: false, type: 'string', maxLength: 1000 },
    parceiro_id: { required: true, type: 'id' }
  },

  produto: {
    nome: { required: true, type: 'string', maxLength: 255 },
    descricao: { required: false, type: 'string', maxLength: 1000 },
    preco: { required: true, type: 'number', min: 0 },
    desconto: { required: false, type: 'number', min: 0, max: 100 },
    parceiro_id: { required: true, type: 'id' }
  }
};

// Validar um campo específico
function validateField(value, fieldName, rules) {
  const errors = [];

  // Verificar se é obrigatório
  if (rules.required && (value === undefined || value === null || value === '')) {
    errors.push(`${fieldName} é obrigatório`);
    return errors; // Se for obrigatório e vazio, não precisa validar mais nada
  }

  // Se não é obrigatório e está vazio, pode pular outras validações
  if (!rules.required && (value === undefined || value === null || value === '')) {
    return errors;
  }

  // Validações por tipo
  switch (rules.type) {
    case 'string':
      if (typeof value !== 'string') {
        errors.push(`${fieldName} deve ser uma string`);
      } else {
        if (rules.maxLength && value.length > rules.maxLength) {
          errors.push(`${fieldName} deve ter no máximo ${rules.maxLength} caracteres`);
        }
        if (rules.minLength && value.length < rules.minLength) {
          errors.push(`${fieldName} deve ter no mínimo ${rules.minLength} caracteres`);
        }
      }
      break;

    case 'email':
      try {
        validateEmail(value);
      } catch (error) {
        errors.push(error.message);
      }
      break;

    case 'number':
      const num = parseFloat(value);
      if (isNaN(num)) {
        errors.push(`${fieldName} deve ser um número válido`);
      } else {
        if (rules.min !== undefined && num < rules.min) {
          errors.push(`${fieldName} deve ser no mínimo ${rules.min}`);
        }
        if (rules.max !== undefined && num > rules.max) {
          errors.push(`${fieldName} deve ser no máximo ${rules.max}`);
        }
      }
      break;

    case 'id':
      try {
        validateId(value, fieldName);
      } catch (error) {
        errors.push(error.message);
      }
      break;

    case 'boolean':
      if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
        errors.push(`${fieldName} deve ser um valor booleano`);
      }
      break;

    case 'cpf_cnpj':
      if (typeof value !== 'string') {
        errors.push(`${fieldName} deve ser uma string`);
      } else {
        // Remove máscara e valida formato
        const cleaned = value.replace(/\D/g, '');
        if (cleaned.length !== 11 && cleaned.length !== 14) {
          errors.push(`${fieldName} deve ter 11 dígitos (CPF) ou 14 dígitos (CNPJ)`);
        }
        // Validação básica - pode ser expandida com validação de dígitos verificadores
        if (cleaned.length === 11 && !validateCPF(cleaned)) {
          errors.push(`${fieldName} (CPF) é inválido`);
        }
      }
      break;
  }

  return errors;
}

// Validar objeto completo
export function validateData(data, schemaName) {
  const schema = ValidationSchemas[schemaName];
  if (!schema) {
    throw new Error(`Schema ${schemaName} não encontrado`);
  }

  const errors = [];
  const sanitizedData = {};

  // Validar campos do schema
  for (const [fieldName, rules] of Object.entries(schema)) {
    const fieldErrors = validateField(data[fieldName], fieldName, rules);
    errors.push(...fieldErrors);

    // Sanitizar dados válidos
    if (fieldErrors.length === 0 && data[fieldName] !== undefined) {
      if (rules.type === 'string' || rules.type === 'email') {
        sanitizedData[fieldName] = sanitizeString(data[fieldName], rules.maxLength);
      } else if (rules.type === 'number') {
        sanitizedData[fieldName] = parseFloat(data[fieldName]);
      } else if (rules.type === 'id') {
        sanitizedData[fieldName] = validateId(data[fieldName], fieldName);
      } else if (rules.type === 'boolean') {
        sanitizedData[fieldName] = data[fieldName] === true || data[fieldName] === 'true';
      } else if (rules.type === 'cpf_cnpj') {
        // Formatar CPF/CNPJ
        const cleaned = data[fieldName].replace(/\D/g, '');
        if (cleaned.length === 11) {
          sanitizedData[fieldName] = cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        } else if (cleaned.length === 14) {
          sanitizedData[fieldName] = cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
        } else {
          sanitizedData[fieldName] = data[fieldName];
        }
      } else {
        sanitizedData[fieldName] = data[fieldName];
      }
    }
  }

  if (errors.length > 0) {
    const error = new Error('Dados inválidos');
    error.validationErrors = errors;
    throw error;
  }

  return sanitizedData;
}

// Middleware para validação automática em APIs
export function withValidation(handler, schemaName) {
  return async (request, context = {}) => {
    try {
      // Extrair dados do body (para POST/PUT)
      let data = {};
      if (request.method === 'POST' || request.method === 'PUT') {
        const bodyText = await request.text();
        if (bodyText) {
          try {
            data = JSON.parse(bodyText);
          } catch (error) {
            return new Response(
              JSON.stringify({ error: 'JSON inválido no body da requisição' }),
              { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
          }
        }
      }

      // Validar e sanitizar dados
      const validatedData = validateData(data, schemaName);

      // Adicionar dados validados ao contexto
      context.validatedData = validatedData;

      // Chamar handler original
      return await handler(request, context);

    } catch (error) {
      if (error.validationErrors) {
        return new Response(
          JSON.stringify({
            error: 'Dados inválidos',
            details: error.validationErrors
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Erro interno
      console.error('Erro no middleware de validação:', error.message);
      return new Response(
        JSON.stringify({ error: 'Erro interno do servidor' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  };
}

// Rate limiting simples por IP
const rateLimitMap = new Map();

export function withRateLimit(handler, requestsPerMinute = 60) {
  return async (request, context = {}) => {
    try {
      // Extrair IP (simplified - em produção usar headers corretos)
      const clientIP = request.headers.get('x-forwarded-for') ||
                      request.headers.get('x-real-ip') ||
                      'unknown';

      const now = Date.now();
      const windowStart = now - (60 * 1000); // 1 minuto

      // Limpar entradas antigas
      for (const [ip, requests] of rateLimitMap.entries()) {
        rateLimitMap.set(ip, requests.filter(time => time > windowStart));
        if (rateLimitMap.get(ip).length === 0) {
          rateLimitMap.delete(ip);
        }
      }

      // Verificar limite para o IP atual
      const clientRequests = rateLimitMap.get(clientIP) || [];

      if (clientRequests.length >= requestsPerMinute) {
        return new Response(
          JSON.stringify({ error: 'Rate limit excedido. Tente novamente em alguns segundos.' }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': '60'
            }
          }
        );
      }

      // Adicionar requisição atual
      clientRequests.push(now);
      rateLimitMap.set(clientIP, clientRequests);

      // Chamar handler
      return await handler(request, context);

    } catch (error) {
      console.error('Erro no middleware de rate limiting:', error.message);
      return await handler(request, context); // Continuar mesmo com erro no rate limiting
    }
  };
}

// Combinar múltiplos middlewares
export function combineMiddlewares(...middlewares) {
  return (handler) => {
    return middlewares.reduceRight((acc, middleware) => middleware(acc), handler);
  };
}

export default {
  validateData,
  withValidation,
  withRateLimit,
  combineMiddlewares,
  ValidationSchemas
};
/**
 * Helper para geocodificação de CEPs
 * Integra com a API interna de geocodificação
 */

/**
 * Busca dados de endereço e coordenadas por CEP
 * @param {string} cep - CEP para buscar (com ou sem formatação)
 * @returns {Promise<Object>} Dados do endereço e coordenadas
 */
export async function geocodeByCep(cep) {
  try {
    if (!cep) {
      throw new Error('CEP é obrigatório')
    }

    // Limpar CEP
    const cleanCep = cep.replace(/\D/g, '')
    
    if (cleanCep.length !== 8) {
      throw new Error('CEP deve conter 8 dígitos')
    }

    const response = await fetch(`/api/geocoding/cep?cep=${cleanCep}`)
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Erro ao buscar CEP')
    }

    const data = await response.json()
    return data

  } catch (error) {
    console.error('Erro ao geocodificar CEP:', error)
    throw error
  }
}

/**
 * Geocodifica múltiplos CEPs
 * @param {string[]} ceps - Array de CEPs
 * @returns {Promise<Object>} Resultado do batch
 */
export async function geocodeBatch(ceps) {
  try {
    if (!Array.isArray(ceps) || ceps.length === 0) {
      throw new Error('Lista de CEPs é obrigatória')
    }

    const response = await fetch('/api/geocoding/cep', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ceps })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Erro no batch de geocodificação')
    }

    return await response.json()

  } catch (error) {
    console.error('Erro no batch de geocodificação:', error)
    throw error
  }
}

/**
 * Formata CEP para exibição (00000-000)
 * @param {string} cep - CEP sem formatação
 * @returns {string} CEP formatado
 */
export function formatCep(cep) {
  if (!cep) return ''
  
  const clean = cep.replace(/\D/g, '')
  
  if (clean.length !== 8) return cep
  
  return `${clean.slice(0, 5)}-${clean.slice(5)}`
}

/**
 * Remove formatação do CEP
 * @param {string} cep - CEP formatado
 * @returns {string} CEP sem formatação
 */
export function cleanCep(cep) {
  if (!cep) return ''
  return cep.replace(/\D/g, '')
}

/**
 * Valida formato de CEP
 * @param {string} cep - CEP para validar
 * @returns {boolean} True se válido
 */
export function isValidCep(cep) {
  if (!cep) return false
  
  const clean = cep.replace(/\D/g, '')
  return clean.length === 8 && /^\d{8}$/.test(clean)
}

/**
 * Hook React para busca de CEP com estado
 */
export function useCepLookup() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)

  const lookupCep = async (cep) => {
    setLoading(true)
    setError(null)
    setData(null)

    try {
      const result = await geocodeByCep(cep)
      setData(result)
      return result
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setLoading(false)
    setError(null)
    setData(null)
  }

  return {
    loading,
    error,
    data,
    lookupCep,
    reset
  }
}

/**
 * Componente de input CEP com autocomplete
 */
export function CepInput({ 
  value, 
  onChange, 
  onAddressFound,
  disabled = false,
  placeholder = "00000-000",
  className = "",
  ...props 
}) {
  const [isLooking, setIsLooking] = useState(false)
  const [lookupError, setLookupError] = useState(null)

  const handleCepChange = (e) => {
    const inputValue = e.target.value
    const formatted = formatCep(inputValue)
    
    onChange?.(formatted)

    // Auto buscar quando CEP estiver completo
    const clean = cleanCep(inputValue)
    if (clean.length === 8) {
      handleCepLookup(clean)
    } else {
      setLookupError(null)
    }
  }

  const handleCepLookup = async (cep) => {
    if (!isValidCep(cep)) return

    setIsLooking(true)
    setLookupError(null)

    try {
      const addressData = await geocodeByCep(cep)
      onAddressFound?.(addressData)
    } catch (error) {
      setLookupError(error.message)
    } finally {
      setIsLooking(false)
    }
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={handleCepChange}
        disabled={disabled || isLooking}
        placeholder={placeholder}
        maxLength={9}
        className={`${className} ${isLooking ? 'opacity-50' : ''}`}
        {...props}
      />
      
      {isLooking && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
        </div>
      )}
      
      {lookupError && (
        <div className="text-red-500 text-xs mt-1">
          {lookupError}
        </div>
      )}
    </div>
  )
}

/**
 * Constantes de estados brasileiros
 */
export const ESTADOS_BRASIL = [
  { code: 'AC', name: 'Acre' },
  { code: 'AL', name: 'Alagoas' },
  { code: 'AP', name: 'Amapá' },
  { code: 'AM', name: 'Amazonas' },
  { code: 'BA', name: 'Bahia' },
  { code: 'CE', name: 'Ceará' },
  { code: 'DF', name: 'Distrito Federal' },
  { code: 'ES', name: 'Espírito Santo' },
  { code: 'GO', name: 'Goiás' },
  { code: 'MA', name: 'Maranhão' },
  { code: 'MT', name: 'Mato Grosso' },
  { code: 'MS', name: 'Mato Grosso do Sul' },
  { code: 'MG', name: 'Minas Gerais' },
  { code: 'PA', name: 'Pará' },
  { code: 'PB', name: 'Paraíba' },
  { code: 'PR', name: 'Paraná' },
  { code: 'PE', name: 'Pernambuco' },
  { code: 'PI', name: 'Piauí' },
  { code: 'RJ', name: 'Rio de Janeiro' },
  { code: 'RN', name: 'Rio Grande do Norte' },
  { code: 'RS', name: 'Rio Grande do Sul' },
  { code: 'RO', name: 'Rondônia' },
  { code: 'RR', name: 'Roraima' },
  { code: 'SC', name: 'Santa Catarina' },
  { code: 'SP', name: 'São Paulo' },
  { code: 'SE', name: 'Sergipe' },
  { code: 'TO', name: 'Tocantins' }
]
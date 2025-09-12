import { NextResponse } from 'next/server'

/**
 * API para geocodificação de CEP
 * Busca endereço via ViaCEP e coordenadas via Nominatim
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const cep = searchParams.get('cep')

    if (!cep) {
      return NextResponse.json(
        { error: 'CEP é obrigatório' },
        { status: 400 }
      )
    }

    // Limpar CEP (remover traços e espaços)
    const cleanCep = cep.replace(/\D/g, '')

    if (cleanCep.length !== 8) {
      return NextResponse.json(
        { error: 'CEP deve conter 8 dígitos' },
        { status: 400 }
      )
    }

    // 1. Buscar dados do endereço via ViaCEP
    const viaCepResponse = await fetch(
      `https://viacep.com.br/ws/${cleanCep}/json/`,
      {
        headers: {
          'User-Agent': 'Parceirize-Platform/1.0'
        }
      }
    )

    if (!viaCepResponse.ok) {
      throw new Error('Erro ao consultar ViaCEP')
    }

    const addressData = await viaCepResponse.json()

    if (addressData.erro) {
      return NextResponse.json(
        { error: 'CEP não encontrado' },
        { status: 404 }
      )
    }

    // 2. Buscar coordenadas via Nominatim (OpenStreetMap)
    const searchQuery = `${addressData.logradouro}, ${addressData.localidade}, ${addressData.uf}, Brazil`
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?` +
      `q=${encodeURIComponent(searchQuery)}&` +
      `format=json&` +
      `limit=1&` +
      `addressdetails=1&` +
      `countrycodes=br`

    let coordinates = null
    
    try {
      const nominatimResponse = await fetch(nominatimUrl, {
        headers: {
          'User-Agent': 'Parceirize-Platform/1.0 (contato@parceirize.com)'
        }
      })

      if (nominatimResponse.ok) {
        const geoData = await nominatimResponse.json()
        
        if (geoData && geoData.length > 0) {
          coordinates = {
            latitude: parseFloat(geoData[0].lat),
            longitude: parseFloat(geoData[0].lon)
          }
        }
      }
    } catch (geoError) {
      console.warn('Erro ao buscar coordenadas:', geoError.message)
      // Não falhar se não conseguir coordenadas, apenas log
    }

    // 3. Montar resposta completa
    const result = {
      cep: cleanCep,
      cepFormatted: `${cleanCep.slice(0, 5)}-${cleanCep.slice(5)}`,
      endereco: addressData.logradouro,
      complemento: addressData.complemento,
      bairro: addressData.bairro,
      cidade: addressData.localidade,
      estado: addressData.uf,
      ibge: addressData.ibge,
      gia: addressData.gia,
      ddd: addressData.ddd,
      siafi: addressData.siafi,
      ...coordinates
    }

    // 4. Cache headers para otimização
    const response = NextResponse.json(result)
    response.headers.set('Cache-Control', 'public, max-age=86400') // Cache por 24h
    
    return response

  } catch (error) {
    console.error('Erro na API de geocodificação:', error)
    
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

/**
 * POST para geocodificar múltiplos CEPs
 */
export async function POST(request) {
  try {
    const { ceps } = await request.json()

    if (!Array.isArray(ceps) || ceps.length === 0) {
      return NextResponse.json(
        { error: 'Lista de CEPs é obrigatória' },
        { status: 400 }
      )
    }

    if (ceps.length > 50) {
      return NextResponse.json(
        { error: 'Máximo de 50 CEPs por requisição' },
        { status: 400 }
      )
    }

    const results = []
    const errors = []

    // Processar CEPs com delay para respeitar rate limit
    for (let i = 0; i < ceps.length; i++) {
      const cep = ceps[i]
      
      try {
        // Reutilizar lógica do GET
        const url = new URL(`${request.url}?cep=${cep}`)
        const mockRequest = { url: url.toString() }
        
        const response = await GET(mockRequest)
        const data = await response.json()
        
        if (response.ok) {
          results.push({ cep, success: true, data })
        } else {
          errors.push({ cep, error: data.error })
        }
        
        // Delay entre requisições para respeitar rate limits
        if (i < ceps.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
        
      } catch (error) {
        errors.push({ cep, error: error.message })
      }
    }

    return NextResponse.json({
      total: ceps.length,
      success: results.length,
      errors: errors.length,
      results,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error) {
    console.error('Erro no batch de geocodificação:', error)
    
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}
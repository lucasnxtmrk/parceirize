/**
 * Script para geocodificar registros existentes
 * Busca CEPs existentes e adiciona coordenadas usando a API ViaCEP + Nominatim
 */

const { Pool } = require('pg')
const dotenv = require('dotenv')
const path = require('path')

// Carregar variáveis de ambiente
for (const p of ['.env.local', '.env', '.env.production']) {
  const full = path.resolve(process.cwd(), p)
  if (require('fs').existsSync(full)) {
    dotenv.config({ path: full })
  }
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

// Configurações
const BATCH_SIZE = 10 // Processar 10 registros por vez
const DELAY_BETWEEN_REQUESTS = 200 // 200ms entre requisições para respeitar rate limits
const MAX_RETRIES = 3

// Função para fazer delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

// Função para buscar dados do CEP via ViaCEP
async function fetchAddressFromCep(cep) {
  try {
    const cleanCep = cep.replace(/\D/g, '')
    if (cleanCep.length !== 8) {
      throw new Error('CEP inválido')
    }

    const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
    
    if (!response.ok) {
      throw new Error('Erro ao consultar ViaCEP')
    }

    const data = await response.json()
    
    if (data.erro) {
      throw new Error('CEP não encontrado')
    }

    return {
      endereco: data.logradouro,
      cidade: data.localidade,
      estado: data.uf,
      cep_formatted: `${cleanCep.slice(0, 5)}-${cleanCep.slice(5)}`
    }
  } catch (error) {
    console.warn(`Erro ao buscar endereço para CEP ${cep}:`, error.message)
    return null
  }
}

// Função para buscar coordenadas via Nominatim
async function fetchCoordinates(endereco, cidade, estado) {
  try {
    const searchQuery = `${endereco}, ${cidade}, ${estado}, Brazil`
    const url = `https://nominatim.openstreetmap.org/search?` +
      `q=${encodeURIComponent(searchQuery)}&` +
      `format=json&` +
      `limit=1&` +
      `addressdetails=1&` +
      `countrycodes=br`

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Parceirize-Geocoding-Script/1.0 (contato@parceirize.com)'
      }
    })

    if (!response.ok) {
      throw new Error('Erro ao consultar Nominatim')
    }

    const data = await response.json()
    
    if (data && data.length > 0) {
      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon)
      }
    }
    
    return null
  } catch (error) {
    console.warn(`Erro ao buscar coordenadas para ${cidade}, ${estado}:`, error.message)
    return null
  }
}

// Função para geocodificar um registro
async function geocodeRecord(record, tableName) {
  let retries = 0
  
  while (retries < MAX_RETRIES) {
    try {
      console.log(`Processando ${tableName} ID ${record.id} - CEP: ${record.cep}`)
      
      let addressData = null
      let coordinates = null
      
      // Se tem CEP, buscar dados do endereço
      if (record.cep) {
        addressData = await fetchAddressFromCep(record.cep)
        await delay(DELAY_BETWEEN_REQUESTS)
      }
      
      // Se conseguiu dados do endereço ou tem cidade/estado, buscar coordenadas
      if (addressData || (record.cidade && record.estado)) {
        const endereco = addressData?.endereco || record.endereco || ''
        const cidade = addressData?.cidade || record.cidade
        const estado = addressData?.estado || record.estado
        
        if (cidade && estado) {
          coordinates = await fetchCoordinates(endereco, cidade, estado)
          await delay(DELAY_BETWEEN_REQUESTS)
        }
      }
      
      // Atualizar registro no banco
      const updateFields = []
      const updateValues = []
      let paramCount = 1
      
      if (addressData) {
        if (addressData.endereco && !record.endereco) {
          updateFields.push(`endereco = $${paramCount++}`)
          updateValues.push(addressData.endereco)
        }
        if (addressData.cidade && !record.cidade) {
          updateFields.push(`cidade = $${paramCount++}`)
          updateValues.push(addressData.cidade)
        }
        if (addressData.estado && !record.estado) {
          updateFields.push(`estado = $${paramCount++}`)
          updateValues.push(addressData.estado)
        }
      }
      
      if (coordinates) {
        updateFields.push(`latitude = $${paramCount++}`)
        updateValues.push(coordinates.latitude)
        updateFields.push(`longitude = $${paramCount++}`)
        updateValues.push(coordinates.longitude)
      }
      
      if (updateFields.length > 0) {
        updateValues.push(record.id)
        const updateQuery = `
          UPDATE ${tableName} 
          SET ${updateFields.join(', ')} 
          WHERE id = $${paramCount}
        `
        
        await pool.query(updateQuery, updateValues)
        console.log(`✅ ${tableName} ID ${record.id} atualizado com sucesso`)
        
        return {
          success: true,
          updated_fields: updateFields.length,
          has_coordinates: !!coordinates
        }
      } else {
        console.log(`⚠️  ${tableName} ID ${record.id} - nenhum dado novo encontrado`)
        return { success: true, updated_fields: 0, has_coordinates: false }
      }
      
    } catch (error) {
      retries++
      console.error(`❌ Erro ao processar ${tableName} ID ${record.id} (tentativa ${retries}):`, error.message)
      
      if (retries < MAX_RETRIES) {
        await delay(DELAY_BETWEEN_REQUESTS * retries) // Delay progressivo
      } else {
        return { success: false, error: error.message }
      }
    }
  }
}

// Função para processar uma tabela
async function processTable(tableName) {
  console.log(`\n🔄 Processando tabela: ${tableName}`)
  
  try {
    // Buscar registros que precisam de geocodificação
    const selectQuery = `
      SELECT id, cep, endereco, cidade, estado, latitude, longitude
      FROM ${tableName}
      WHERE (
        (cep IS NOT NULL AND cep != '' AND (latitude IS NULL OR longitude IS NULL))
        OR
        (cidade IS NOT NULL AND estado IS NOT NULL AND (latitude IS NULL OR longitude IS NULL))
      )
      ORDER BY id
    `
    
    const result = await pool.query(selectQuery)
    const records = result.rows
    
    console.log(`📊 Encontrados ${records.length} registros para processar`)
    
    if (records.length === 0) {
      console.log(`✅ Tabela ${tableName} já está atualizada`)
      return { total: 0, processed: 0, updated: 0, errors: 0 }
    }
    
    const stats = {
      total: records.length,
      processed: 0,
      updated: 0,
      with_coordinates: 0,
      errors: 0
    }
    
    // Processar em lotes
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE)
      
      console.log(`\n📦 Processando lote ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(records.length / BATCH_SIZE)}`)
      
      for (const record of batch) {
        const result = await geocodeRecord(record, tableName)
        stats.processed++
        
        if (result.success) {
          if (result.updated_fields > 0) {
            stats.updated++
          }
          if (result.has_coordinates) {
            stats.with_coordinates++
          }
        } else {
          stats.errors++
        }
        
        // Progresso
        const percent = Math.round((stats.processed / stats.total) * 100)
        console.log(`📈 Progresso: ${stats.processed}/${stats.total} (${percent}%)`)
      }
      
      // Delay entre lotes
      if (i + BATCH_SIZE < records.length) {
        console.log(`⏳ Aguardando antes do próximo lote...`)
        await delay(1000) // 1 segundo entre lotes
      }
    }
    
    console.log(`\n✅ Tabela ${tableName} processada:`)
    console.log(`   📊 Total: ${stats.total}`)
    console.log(`   ✅ Atualizados: ${stats.updated}`)
    console.log(`   📍 Com coordenadas: ${stats.with_coordinates}`)
    console.log(`   ❌ Erros: ${stats.errors}`)
    
    return stats
    
  } catch (error) {
    console.error(`❌ Erro ao processar tabela ${tableName}:`, error.message)
    throw error
  }
}

// Função principal
async function main() {
  console.log('🚀 Iniciando geocodificação de registros existentes...')
  console.log(`⚙️  Configurações:`)
  console.log(`   - Batch size: ${BATCH_SIZE}`)
  console.log(`   - Delay entre requisições: ${DELAY_BETWEEN_REQUESTS}ms`)
  console.log(`   - Máximo de tentativas: ${MAX_RETRIES}`)
  
  const tabelas = ['provedores', 'clientes', 'parceiros']
  const globalStats = {
    total_records: 0,
    total_updated: 0,
    total_with_coordinates: 0,
    total_errors: 0
  }
  
  try {
    for (const tabela of tabelas) {
      const stats = await processTable(tabela)
      globalStats.total_records += stats.total
      globalStats.total_updated += stats.updated
      globalStats.total_with_coordinates += stats.with_coordinates
      globalStats.total_errors += stats.errors
    }
    
    console.log(`\n🎉 Geocodificação concluída!`)
    console.log(`📊 Estatísticas globais:`)
    console.log(`   📝 Total de registros processados: ${globalStats.total_records}`)
    console.log(`   ✅ Total de registros atualizados: ${globalStats.total_updated}`)
    console.log(`   📍 Total com coordenadas obtidas: ${globalStats.total_with_coordinates}`)
    console.log(`   ❌ Total de erros: ${globalStats.total_errors}`)
    
    // Log final no banco
    await pool.query(`
      INSERT INTO tenant_logs (tenant_id, acao, detalhes, created_at)
      VALUES (
        NULL,
        'Geocodificação em lote executada',
        $1,
        NOW()
      )
    `, [JSON.stringify({
      script: 'geocode-existing-records',
      stats: globalStats,
      timestamp: new Date().toISOString()
    })])
    
  } catch (error) {
    console.error('❌ Erro fatal:', error.message)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

// Executar se for chamado diretamente
if (require.main === module) {
  main().catch(console.error)
}

module.exports = { main, processTable, geocodeRecord }
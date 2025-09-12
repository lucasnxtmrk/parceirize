import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { options } from '../../auth/[...nextauth]/options'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export async function GET(request) {
  try {
    const session = await getServerSession(options)
    
    if (!session || session.user.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas superadmins podem acessar.' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const region = searchParams.get('region')
    const minIntensity = parseFloat(searchParams.get('min_intensity') || '0')
    const maxIntensity = parseFloat(searchParams.get('max_intensity') || '1')

    // 1. Buscar dados agregados por estado
    const statesQuery = `
      WITH state_data AS (
        -- Dados dos provedores por estado
        SELECT 
          p.estado,
          COUNT(DISTINCT p.id) as total_provedores,
          COUNT(DISTINCT p.id) FILTER (WHERE p.ativo = true) as provedores_ativos,
          COUNT(DISTINCT c.id) as total_clientes,
          COUNT(DISTINCT c.id) FILTER (WHERE c.ativo = true) as clientes_ativos,
          COUNT(DISTINCT pa.id) as total_parceiros,
          COUNT(DISTINCT pa.id) FILTER (WHERE pa.ativo = true) as parceiros_ativos,
          COUNT(DISTINCT v.id) as total_vouchers,
          COUNT(DISTINCT vu.id) as vouchers_utilizados,
          SUM(pl.preco) FILTER (WHERE p.ativo = true) as receita_mensal,
          AVG(p.latitude) as avg_latitude,
          AVG(p.longitude) as avg_longitude
        FROM provedores p
        LEFT JOIN planos pl ON p.plano_id = pl.id
        LEFT JOIN clientes c ON p.tenant_id = c.tenant_id
        LEFT JOIN parceiros pa ON p.tenant_id = pa.tenant_id
        LEFT JOIN vouchers v ON pa.id = v.parceiro_id
        LEFT JOIN voucher_utilizados vu ON v.id = vu.voucher_id
        WHERE p.estado IS NOT NULL
        GROUP BY p.estado
        
        UNION ALL
        
        -- Dados dos clientes por estado (quando não há provedor no mesmo estado)
        SELECT 
          c.estado,
          0 as total_provedores,
          0 as provedores_ativos,
          COUNT(DISTINCT c.id) as total_clientes,
          COUNT(DISTINCT c.id) FILTER (WHERE c.ativo = true) as clientes_ativos,
          0 as total_parceiros,
          0 as parceiros_ativos,
          0 as total_vouchers,
          0 as vouchers_utilizados,
          0 as receita_mensal,
          AVG(c.latitude) as avg_latitude,
          AVG(c.longitude) as avg_longitude
        FROM clientes c
        WHERE c.estado IS NOT NULL
          AND c.estado NOT IN (SELECT DISTINCT estado FROM provedores WHERE estado IS NOT NULL)
        GROUP BY c.estado
        
        UNION ALL
        
        -- Dados dos parceiros por estado (quando não há provedor no mesmo estado)
        SELECT 
          pa.estado,
          0 as total_provedores,
          0 as provedores_ativos,
          0 as total_clientes,
          0 as clientes_ativos,
          COUNT(DISTINCT pa.id) as total_parceiros,
          COUNT(DISTINCT pa.id) FILTER (WHERE pa.ativo = true) as parceiros_ativos,
          COUNT(DISTINCT v.id) as total_vouchers,
          COUNT(DISTINCT vu.id) as vouchers_utilizados,
          0 as receita_mensal,
          AVG(pa.latitude) as avg_latitude,
          AVG(pa.longitude) as avg_longitude
        FROM parceiros pa
        LEFT JOIN vouchers v ON pa.id = v.parceiro_id
        LEFT JOIN voucher_utilizados vu ON v.id = vu.voucher_id
        WHERE pa.estado IS NOT NULL
          AND pa.estado NOT IN (SELECT DISTINCT estado FROM provedores WHERE estado IS NOT NULL)
        GROUP BY pa.estado
      ),
      aggregated_states AS (
        SELECT 
          estado,
          SUM(total_provedores) as provedores,
          SUM(provedores_ativos) as provedores_ativos,
          SUM(total_clientes) as clientes,
          SUM(clientes_ativos) as clientes_ativos,
          SUM(total_parceiros) as parceiros,
          SUM(parceiros_ativos) as parceiros_ativos,
          SUM(total_vouchers) as vouchers,
          SUM(vouchers_utilizados) as vouchers_utilizados,
          SUM(receita_mensal) as receita,
          AVG(avg_latitude) as latitude,
          AVG(avg_longitude) as longitude
        FROM state_data
        GROUP BY estado
      )
      SELECT 
        estado,
        provedores,
        provedores_ativos,
        clientes,
        clientes_ativos,
        parceiros,
        parceiros_ativos,
        vouchers,
        vouchers_utilizados,
        receita,
        latitude,
        longitude,
        -- Calcular intensidade baseada na atividade total
        (provedores_ativos + clientes_ativos + parceiros_ativos)::float / GREATEST(
          (SELECT MAX(provedores_ativos + clientes_ativos + parceiros_ativos) FROM aggregated_states), 1
        ) as intensity
      FROM aggregated_states
      WHERE estado IS NOT NULL
      ORDER BY (provedores_ativos + clientes_ativos + parceiros_ativos) DESC
    `

    const statesResult = await pool.query(statesQuery)

    // 2. Buscar pontos de maior densidade (cidades com mais atividade)
    const hotSpotsQuery = `
      WITH city_data AS (
        SELECT 
          cidade,
          estado,
          COUNT(DISTINCT p.id) + COUNT(DISTINCT c.id) + COUNT(DISTINCT pa.id) as total_entities,
          AVG(COALESCE(p.latitude, c.latitude, pa.latitude)) as latitude,
          AVG(COALESCE(p.longitude, c.longitude, pa.longitude)) as longitude,
          COUNT(DISTINCT p.id) as provedores,
          COUNT(DISTINCT c.id) as clientes,
          COUNT(DISTINCT pa.id) as parceiros
        FROM (
          SELECT id, cidade, estado, latitude, longitude FROM provedores WHERE cidade IS NOT NULL AND latitude IS NOT NULL
          UNION ALL
          SELECT id, cidade, estado, latitude, longitude FROM clientes WHERE cidade IS NOT NULL AND latitude IS NOT NULL
          UNION ALL
          SELECT id, cidade, estado, latitude, longitude FROM parceiros WHERE cidade IS NOT NULL AND latitude IS NOT NULL
        ) AS all_entities
        LEFT JOIN provedores p ON all_entities.id = p.id AND EXISTS(SELECT 1 FROM provedores WHERE id = all_entities.id)
        LEFT JOIN clientes c ON all_entities.id = c.id AND EXISTS(SELECT 1 FROM clientes WHERE id = all_entities.id)
        LEFT JOIN parceiros pa ON all_entities.id = pa.id AND EXISTS(SELECT 1 FROM parceiros WHERE id = all_entities.id)
        GROUP BY cidade, estado
        HAVING COUNT(*) > 0
      )
      SELECT 
        cidade,
        estado,
        total_entities,
        latitude,
        longitude,
        provedores,
        clientes,
        parceiros,
        total_entities::float / GREATEST((SELECT MAX(total_entities) FROM city_data), 1) as intensity
      FROM city_data
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL
      ORDER BY total_entities DESC
      LIMIT 50
    `

    const hotSpotsResult = await pool.query(hotSpotsQuery)

    // 3. Estatísticas gerais
    const statsQuery = `
      SELECT 
        COUNT(DISTINCT p.id) as total_provedores,
        COUNT(DISTINCT p.id) FILTER (WHERE p.ativo = true) as provedores_ativos,
        COUNT(DISTINCT c.id) as total_clientes,
        COUNT(DISTINCT c.id) FILTER (WHERE c.ativo = true) as clientes_ativos,
        COUNT(DISTINCT pa.id) as total_parceiros,
        COUNT(DISTINCT pa.id) FILTER (WHERE pa.ativo = true) as parceiros_ativos,
        COUNT(DISTINCT v.id) as total_vouchers,
        COUNT(DISTINCT vu.id) as vouchers_utilizados,
        SUM(pl.preco) FILTER (WHERE p.ativo = true) as receita_total,
        COUNT(DISTINCT p.estado) as estados_com_atividade
      FROM provedores p
      LEFT JOIN planos pl ON p.plano_id = pl.id
      LEFT JOIN clientes c ON p.tenant_id = c.tenant_id
      LEFT JOIN parceiros pa ON p.tenant_id = pa.tenant_id
      LEFT JOIN vouchers v ON pa.id = v.parceiro_id
      LEFT JOIN voucher_utilizados vu ON v.id = vu.voucher_id
    `

    const statsResult = await pool.query(statsQuery)

    // 4. Mapear dados dos estados com nomes completos e coordenadas padrão
    const estadosInfo = {
      'AC': { nome: 'Acre', lat: -9.0238, lng: -70.8120 },
      'AL': { nome: 'Alagoas', lat: -9.5713, lng: -36.7820 },
      'AP': { nome: 'Amapá', lat: 1.4027, lng: -51.7770 },
      'AM': { nome: 'Amazonas', lat: -3.4168, lng: -65.8561 },
      'BA': { nome: 'Bahia', lat: -12.5797, lng: -41.7007 },
      'CE': { nome: 'Ceará', lat: -5.4984, lng: -39.3206 },
      'DF': { nome: 'Distrito Federal', lat: -15.7801, lng: -47.9292 },
      'ES': { nome: 'Espírito Santo', lat: -19.1834, lng: -40.3089 },
      'GO': { nome: 'Goiás', lat: -15.8270, lng: -49.8362 },
      'MA': { nome: 'Maranhão', lat: -4.9609, lng: -45.2744 },
      'MT': { nome: 'Mato Grosso', lat: -12.6819, lng: -56.9211 },
      'MS': { nome: 'Mato Grosso do Sul', lat: -20.7722, lng: -54.7852 },
      'MG': { nome: 'Minas Gerais', lat: -18.5122, lng: -44.5550 },
      'PA': { nome: 'Pará', lat: -3.9019, lng: -52.9213 },
      'PB': { nome: 'Paraíba', lat: -7.2399, lng: -36.7819 },
      'PR': { nome: 'Paraná', lat: -24.8900, lng: -51.4292 },
      'PE': { nome: 'Pernambuco', lat: -8.8137, lng: -36.9541 },
      'PI': { nome: 'Piauí', lat: -8.5756, lng: -42.2467 },
      'RJ': { nome: 'Rio de Janeiro', lat: -22.9129, lng: -43.2003 },
      'RN': { nome: 'Rio Grande do Norte', lat: -5.4026, lng: -36.9541 },
      'RS': { nome: 'Rio Grande do Sul', lat: -30.0368, lng: -51.2090 },
      'RO': { nome: 'Rondônia', lat: -11.5057, lng: -63.5806 },
      'RR': { nome: 'Roraima', lat: 1.9981, lng: -61.3308 },
      'SC': { nome: 'Santa Catarina', lat: -27.2423, lng: -50.2189 },
      'SP': { nome: 'São Paulo', lat: -23.5558, lng: -46.6396 },
      'SE': { nome: 'Sergipe', lat: -10.5741, lng: -37.3857 },
      'TO': { nome: 'Tocantins', lat: -10.1753, lng: -48.2982 }
    }

    // 5. Processar e formatar dados dos estados
    const statesFormatted = statesResult.rows.map(row => {
      const estadoInfo = estadosInfo[row.estado] || { nome: row.estado, lat: -15.7942, lng: -47.8822 }
      
      return {
        code: row.estado,
        name: estadoInfo.nome,
        coords: [
          row.latitude || estadoInfo.lat,
          row.longitude || estadoInfo.lng
        ],
        providers: parseInt(row.provedores) || 0,
        clients: parseInt(row.clientes) || 0,
        partners: parseInt(row.parceiros) || 0,
        vouchers: parseInt(row.vouchers) || 0,
        vouchers_used: parseInt(row.vouchers_utilizados) || 0,
        revenue: parseFloat(row.receita) || 0,
        intensity: parseFloat(row.intensity) || 0
      }
    }).filter(state => {
      // Filtrar por intensidade se especificado
      return state.intensity >= minIntensity && state.intensity <= maxIntensity
    })

    // 6. Filtrar por região se especificado
    let filteredStates = statesFormatted
    if (region) {
      const regionFilters = {
        'Sudeste': ['SP', 'RJ', 'MG', 'ES'],
        'Sul': ['RS', 'SC', 'PR'],
        'Nordeste': ['BA', 'PE', 'CE', 'AL', 'PB', 'RN', 'SE', 'PI', 'MA'],
        'Centro-Oeste': ['GO', 'MT', 'MS', 'DF'],
        'Norte': ['AM', 'PA', 'RO', 'AC', 'RR', 'AP', 'TO']
      }
      
      if (regionFilters[region]) {
        filteredStates = statesFormatted.filter(state => 
          regionFilters[region].includes(state.code)
        )
      }
    }

    // 7. Formatar resposta
    const responseData = {
      last_updated: new Date().toISOString(),
      total_states: filteredStates.length,
      region_filter: region || null,
      intensity_range: { min: minIntensity, max: maxIntensity },
      
      // Dados dos estados
      states: filteredStates,
      
      // Pontos de calor (cidades)
      hot_spots: hotSpotsResult.rows.map(row => ({
        city: row.cidade,
        state: row.estado,
        coords: [parseFloat(row.latitude), parseFloat(row.longitude)],
        total_entities: parseInt(row.total_entities),
        providers: parseInt(row.provedores) || 0,
        clients: parseInt(row.clientes) || 0,
        partners: parseInt(row.parceiros) || 0,
        intensity: parseFloat(row.intensity) || 0
      })),
      
      // Estatísticas gerais
      stats: {
        total_providers: parseInt(statsResult.rows[0].total_provedores) || 0,
        active_providers: parseInt(statsResult.rows[0].provedores_ativos) || 0,
        total_clients: parseInt(statsResult.rows[0].total_clientes) || 0,
        active_clients: parseInt(statsResult.rows[0].clientes_ativos) || 0,
        total_partners: parseInt(statsResult.rows[0].total_parceiros) || 0,
        active_partners: parseInt(statsResult.rows[0].parceiros_ativos) || 0,
        total_vouchers: parseInt(statsResult.rows[0].total_vouchers) || 0,
        used_vouchers: parseInt(statsResult.rows[0].vouchers_utilizados) || 0,
        total_revenue: parseFloat(statsResult.rows[0].receita_total) || 0,
        states_with_activity: parseInt(statsResult.rows[0].estados_com_atividade) || 0
      },
      
      // Legenda de intensidade
      intensity_legend: [
        { level: 1.0, color: '#ff0000', label: 'Muito Alto', range: '80-100%' },
        { level: 0.8, color: '#ff4500', label: 'Alto', range: '60-80%' },
        { level: 0.6, color: '#ffa500', label: 'Médio Alto', range: '40-60%' },
        { level: 0.4, color: '#ffff00', label: 'Médio', range: '20-40%' },
        { level: 0.2, color: '#90ee90', label: 'Baixo', range: '10-20%' },
        { level: 0.1, color: '#87ceeb', label: 'Muito Baixo', range: '0-10%' }
      ]
    }

    return NextResponse.json(responseData)

  } catch (error) {
    console.error('Erro ao buscar dados do mapa:', error)
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}
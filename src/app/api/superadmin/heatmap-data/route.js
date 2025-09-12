import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { options } from '../../auth/[...nextauth]/options';

// Mock data para mapa de calor de frete
const mockHeatmapData = {
  last_updated: new Date().toISOString(),
  period: '30_days',
  freight_points: [
    // São Paulo (região de maior intensidade)
    { lat: -23.5505, lng: -46.6333, intensity: 1.0, volume: 1250000, deliveries: 8500, avg_value: 147.20 },
    { lat: -23.6821, lng: -46.8755, intensity: 0.8, volume: 890000, deliveries: 5200, avg_value: 171.15 },
    { lat: -23.4205, lng: -46.7011, intensity: 0.7, volume: 720000, deliveries: 4100, avg_value: 175.60 },
    { lat: -23.2963, lng: -46.7343, intensity: 0.6, volume: 580000, deliveries: 3200, avg_value: 181.25 },

    // Rio de Janeiro
    { lat: -22.9068, lng: -43.1729, intensity: 0.9, volume: 950000, deliveries: 6200, avg_value: 153.30 },
    { lat: -22.8888, lng: -43.1038, intensity: 0.5, volume: 380000, deliveries: 2100, avg_value: 180.95 },
    { lat: -22.7629, lng: -43.4507, intensity: 0.4, volume: 290000, deliveries: 1800, avg_value: 161.45 },

    // Belo Horizonte
    { lat: -19.9167, lng: -43.9345, intensity: 0.7, volume: 680000, deliveries: 4500, avg_value: 151.20 },
    { lat: -19.8157, lng: -43.9542, intensity: 0.4, volume: 310000, deliveries: 1900, avg_value: 163.40 },

    // Porto Alegre
    { lat: -30.0346, lng: -51.2177, intensity: 0.6, volume: 520000, deliveries: 3800, avg_value: 136.80 },
    { lat: -29.1634, lng: -51.1797, intensity: 0.4, volume: 280000, deliveries: 2100, avg_value: 133.50 },

    // Curitiba
    { lat: -25.4284, lng: -49.2733, intensity: 0.5, volume: 450000, deliveries: 3100, avg_value: 145.20 },
    { lat: -25.5163, lng: -49.2968, intensity: 0.3, volume: 210000, deliveries: 1400, avg_value: 150.00 },

    // Florianópolis
    { lat: -27.2423, lng: -50.2189, intensity: 0.4, volume: 320000, deliveries: 2200, avg_value: 145.45 },
    { lat: -26.3044, lng: -48.8462, intensity: 0.3, volume: 190000, deliveries: 1300, avg_value: 146.15 },

    // Salvador
    { lat: -12.9714, lng: -38.5014, intensity: 0.4, volume: 280000, deliveries: 2800, avg_value: 100.00 },
    { lat: -12.2664, lng: -38.9663, intensity: 0.2, volume: 120000, deliveries: 1200, avg_value: 100.00 },

    // Recife  
    { lat: -8.0476, lng: -34.8770, intensity: 0.3, volume: 210000, deliveries: 2100, avg_value: 100.00 },

    // Fortaleza
    { lat: -3.7172, lng: -38.5433, intensity: 0.3, volume: 190000, deliveries: 1900, avg_value: 100.00 },

    // Goiânia
    { lat: -16.6864, lng: -49.2643, intensity: 0.3, volume: 180000, deliveries: 1400, avg_value: 128.57 },

    // Brasília
    { lat: -15.7801, lng: -47.9292, intensity: 0.2, volume: 150000, deliveries: 1100, avg_value: 136.36 },

    // Belém
    { lat: -1.4558, lng: -48.4902, intensity: 0.2, volume: 90000, deliveries: 800, avg_value: 112.50 },

    // Manaus
    { lat: -3.1190, lng: -60.0217, intensity: 0.1, volume: 60000, deliveries: 500, avg_value: 120.00 },

    // Pontos intermediários para criar gradiente mais realista
    { lat: -22.2711, lng: -45.2479, intensity: 0.3, volume: 180000, deliveries: 1200, avg_value: 150.00 }, // Entre RJ e SP
    { lat: -21.1767, lng: -44.8339, intensity: 0.2, volume: 120000, deliveries: 800, avg_value: 150.00 },   // Interior MG
    { lat: -28.2639, lng: -52.4111, intensity: 0.2, volume: 110000, deliveries: 750, avg_value: 146.67 },   // Interior RS
    { lat: -24.9555, lng: -50.1682, intensity: 0.2, volume: 100000, deliveries: 650, avg_value: 153.85 },   // Interior PR
    { lat: -26.9194, lng: -49.0661, intensity: 0.2, volume: 95000, deliveries: 600, avg_value: 158.33 },    // Interior SC
  ],
  
  delivery_routes: [
    {
      route_id: 'SP_Interior',
      origin: { lat: -23.5505, lng: -46.6333, name: 'São Paulo' },
      destinations: [
        { lat: -22.9056, lng: -47.0608, name: 'Campinas', volume: 120000 },
        { lat: -23.1794, lng: -45.8869, name: 'São José dos Campos', volume: 89000 },
        { lat: -21.7963, lng: -46.5689, name: 'Ribeirão Preto', volume: 75000 }
      ],
      total_volume: 284000,
      avg_distance: 180
    },
    {
      route_id: 'RJ_Interior', 
      origin: { lat: -22.9068, lng: -43.1729, name: 'Rio de Janeiro' },
      destinations: [
        { lat: -22.8888, lng: -43.1038, name: 'Niterói', volume: 85000 },
        { lat: -22.5307, lng: -44.1043, name: 'Nova Friburgo', volume: 45000 },
        { lat: -21.7642, lng: -43.3503, name: 'Juiz de Fora', volume: 62000 }
      ],
      total_volume: 192000,
      avg_distance: 150
    }
  ],

  intensity_legend: [
    { level: 1.0, color: '#ff0000', label: 'Muito Alto (>1M)', range: '1M+' },
    { level: 0.8, color: '#ff4500', label: 'Alto (700K-1M)', range: '700K-1M' },
    { level: 0.6, color: '#ffa500', label: 'Médio Alto (400K-700K)', range: '400K-700K' },
    { level: 0.4, color: '#ffff00', label: 'Médio (200K-400K)', range: '200K-400K' },
    { level: 0.2, color: '#90ee90', label: 'Baixo (100K-200K)', range: '100K-200K' },
    { level: 0.1, color: '#87ceeb', label: 'Muito Baixo (<100K)', range: '<100K' }
  ],

  regional_stats: {
    'Sudeste': {
      total_volume: 4580000,
      total_deliveries: 32100,
      avg_ticket: 142.68,
      concentration: 0.75,
      growth_trend: 18.5
    },
    'Sul': {
      total_volume: 1780000,
      total_deliveries: 12500,
      avg_ticket: 142.40,
      concentration: 0.45,
      growth_trend: 16.2
    },
    'Nordeste': {
      total_volume: 1180000,
      total_deliveries: 14200,
      avg_ticket: 83.10,
      concentration: 0.25,
      growth_trend: 24.8
    },
    'Centro-Oeste': {
      total_volume: 530000,
      total_deliveries: 3900,
      avg_ticket: 135.90,
      concentration: 0.20,
      growth_trend: 12.4
    },
    'Norte': {
      total_volume: 290000,
      total_deliveries: 2100,
      avg_ticket: 138.10,
      concentration: 0.15,
      growth_trend: 31.2
    }
  },

  time_series: [
    { date: '2024-01-01', total_volume: 6800000, deliveries: 45000 },
    { date: '2024-02-01', total_volume: 7100000, deliveries: 47500 },
    { date: '2024-03-01', total_volume: 7350000, deliveries: 49200 },
    { date: '2024-04-01', total_volume: 7650000, deliveries: 51800 },
    { date: '2024-05-01', total_volume: 7920000, deliveries: 54100 },
    { date: '2024-06-01', total_volume: 8180000, deliveries: 56400 },
    { date: '2024-07-01', total_volume: 8420000, deliveries: 58200 },
    { date: '2024-08-01', total_volume: 8650000, deliveries: 59800 }
  ]
}

export async function GET(request) {
  try {
    const session = await getServerSession(options);
    
    if (!session || session.user.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas superadmins podem acessar.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const region = searchParams.get('region');
    const intensity_min = parseFloat(searchParams.get('intensity_min') || '0');
    const intensity_max = parseFloat(searchParams.get('intensity_max') || '1');
    const format = searchParams.get('format') || 'json';

    let responseData = mockHeatmapData;

    // Filtrar por região
    if (region && mockHeatmapData.regional_stats[region]) {
      responseData = {
        ...responseData,
        region_focus: region,
        regional_data: mockHeatmapData.regional_stats[region],
        freight_points: mockHeatmapData.freight_points.filter(point => {
          // Filtro simplificado por coordenadas aproximadas das regiões
          switch(region) {
            case 'Sudeste':
              return point.lat >= -25 && point.lat <= -19 && point.lng >= -50 && point.lng <= -39;
            case 'Sul':  
              return point.lat >= -35 && point.lat <= -25;
            case 'Nordeste':
              return point.lat >= -18 && point.lat <= -1;
            case 'Centro-Oeste':
              return point.lat >= -25 && point.lat <= -7 && point.lng >= -65 && point.lng <= -47;
            case 'Norte':
              return point.lat >= -7;
            default:
              return true;
          }
        })
      };
    }

    // Filtrar por intensidade
    if (intensity_min > 0 || intensity_max < 1) {
      responseData = {
        ...responseData,
        freight_points: responseData.freight_points.filter(point => 
          point.intensity >= intensity_min && point.intensity <= intensity_max
        )
      };
    }

    // Formato específico para exportação
    if (format === 'csv') {
      const csvData = responseData.freight_points.map(point => 
        `${point.lat},${point.lng},${point.intensity},${point.volume},${point.deliveries},${point.avg_value}`
      ).join('\n');
      
      const csvHeader = 'latitude,longitude,intensity,volume,deliveries,avg_value\n';
      
      return new Response(csvHeader + csvData, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="heatmap-data.csv"'
        }
      });
    }

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Erro ao buscar dados do mapa de calor:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
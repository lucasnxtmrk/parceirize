import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { options } from '../../auth/[...nextauth]/options';

// Mock data para demonstração - dados geográficos do Brasil
const mockGeographicData = {
  brazil: {
    bounds: [
      [-33.7683777809, -73.9872354804],  // Southwest
      [5.2842873409, -28.8618094817]     // Northeast  
    ],
    center: [-15.7942, -47.8822],
    zoom: 4
  },
  states: [
    {
      id: 'SP',
      name: 'São Paulo',
      region: 'Sudeste',
      capital: 'São Paulo',
      coords: [-23.5505, -46.6333],
      providers: 78,
      clients: 28500,
      partners: 1250,
      freight_volume: 2850000,
      avg_ticket: 67.50,
      growth_rate: 18.5,
      main_cities: [
        { name: 'São Paulo', coords: [-23.5505, -46.6333], clients: 15200 },
        { name: 'Campinas', coords: [-22.9056, -47.0608], clients: 3800 },
        { name: 'Santos', coords: [-23.9537, -46.3336], clients: 2100 },
        { name: 'São José dos Campos', coords: [-23.1794, -45.8869], clients: 1900 }
      ]
    },
    {
      id: 'RJ', 
      name: 'Rio de Janeiro',
      region: 'Sudeste',
      capital: 'Rio de Janeiro',
      coords: [-22.9068, -43.1729],
      providers: 45,
      clients: 16200,
      partners: 890,
      freight_volume: 1950000,
      avg_ticket: 72.30,
      growth_rate: 22.1,
      main_cities: [
        { name: 'Rio de Janeiro', coords: [-22.9068, -43.1729], clients: 12800 },
        { name: 'Niterói', coords: [-22.8888, -43.1038], clients: 1850 },
        { name: 'Nova Iguaçu', coords: [-22.7592, -43.4506], clients: 1550 }
      ]
    },
    {
      id: 'MG',
      name: 'Minas Gerais', 
      region: 'Sudeste',
      capital: 'Belo Horizonte',
      coords: [-19.9167, -43.9345],
      providers: 35,
      clients: 12800,
      partners: 720,
      freight_volume: 1450000,
      avg_ticket: 58.90,
      growth_rate: 15.2,
      main_cities: [
        { name: 'Belo Horizonte', coords: [-19.9167, -43.9345], clients: 7200 },
        { name: 'Uberlândia', coords: [-18.9113, -48.2622], clients: 2100 },
        { name: 'Contagem', coords: [-19.9318, -44.0536], clients: 1800 }
      ]
    },
    {
      id: 'RS',
      name: 'Rio Grande do Sul',
      region: 'Sul', 
      capital: 'Porto Alegre',
      coords: [-30.0346, -51.2177],
      providers: 28,
      clients: 9500,
      partners: 520,
      freight_volume: 1200000,
      avg_ticket: 65.20,
      growth_rate: 12.8,
      main_cities: [
        { name: 'Porto Alegre', coords: [-30.0346, -51.2177], clients: 4800 },
        { name: 'Caxias do Sul', coords: [-29.1634, -51.1797], clients: 1850 },
        { name: 'Pelotas', coords: [-31.7654, -52.3377], clients: 1200 }
      ]
    },
    {
      id: 'PR',
      name: 'Paraná',
      region: 'Sul',
      capital: 'Curitiba', 
      coords: [-25.4284, -49.2733],
      providers: 22,
      clients: 7800,
      partners: 420,
      freight_volume: 980000,
      avg_ticket: 61.40,
      growth_rate: 16.7,
      main_cities: [
        { name: 'Curitiba', coords: [-25.4284, -49.2733], clients: 3900 },
        { name: 'Londrina', coords: [-23.3045, -51.1696], clients: 1650 },
        { name: 'Maringá', coords: [-23.4205, -51.9331], clients: 1200 }
      ]
    },
    {
      id: 'SC',
      name: 'Santa Catarina',
      region: 'Sul',
      capital: 'Florianópolis',
      coords: [-27.2423, -50.2189], 
      providers: 18,
      clients: 6100,
      partners: 350,
      freight_volume: 720000,
      avg_ticket: 69.80,
      growth_rate: 19.3,
      main_cities: [
        { name: 'Florianópolis', coords: [-27.2423, -50.2189], clients: 2100 },
        { name: 'Joinville', coords: [-26.3044, -48.8462], clients: 1850 },
        { name: 'Blumenau', coords: [-26.9194, -49.0661], clients: 1200 }
      ]
    },
    {
      id: 'BA',
      name: 'Bahia',
      region: 'Nordeste',
      capital: 'Salvador',
      coords: [-12.9714, -38.5014],
      providers: 15,
      clients: 4200,
      partners: 280,
      freight_volume: 650000,
      avg_ticket: 52.30,
      growth_rate: 25.4,
      main_cities: [
        { name: 'Salvador', coords: [-12.9714, -38.5014], clients: 2800 },
        { name: 'Feira de Santana', coords: [-12.2664, -38.9663], clients: 800 },
        { name: 'Vitória da Conquista', coords: [-14.8619, -40.8394], clients: 600 }
      ]
    },
    {
      id: 'GO',
      name: 'Goiás', 
      region: 'Centro-Oeste',
      capital: 'Goiânia',
      coords: [-16.6864, -49.2643],
      providers: 12,
      clients: 3100,
      partners: 180,
      freight_volume: 450000,
      avg_ticket: 59.70,
      growth_rate: 14.2,
      main_cities: [
        { name: 'Goiânia', coords: [-16.6864, -49.2643], clients: 1800 },
        { name: 'Anápolis', coords: [-16.3281, -48.9531], clients: 700 },
        { name: 'Aparecida de Goiânia', coords: [-16.8173, -49.2501], clients: 600 }
      ]
    }
  ],
  freight_heatmap: [
    // Região Sudeste (alta concentração)
    { lat: -23.5505, lng: -46.6333, intensity: 0.9, volume: 1200000, city: 'São Paulo' },
    { lat: -22.9068, lng: -43.1729, intensity: 0.8, volume: 950000, city: 'Rio de Janeiro' },
    { lat: -19.9167, lng: -43.9345, intensity: 0.7, volume: 780000, city: 'Belo Horizonte' },
    
    // Região Sul (média-alta concentração)  
    { lat: -30.0346, lng: -51.2177, intensity: 0.6, volume: 620000, city: 'Porto Alegre' },
    { lat: -25.4284, lng: -49.2733, intensity: 0.5, volume: 480000, city: 'Curitiba' },
    { lat: -27.2423, lng: -50.2189, intensity: 0.4, volume: 380000, city: 'Florianópolis' },
    
    // Região Nordeste (média concentração)
    { lat: -12.9714, lng: -38.5014, intensity: 0.4, volume: 350000, city: 'Salvador' },
    { lat: -8.0476, lng: -34.8770, intensity: 0.3, volume: 280000, city: 'Recife' },
    { lat: -3.7172, lng: -38.5433, intensity: 0.3, volume: 250000, city: 'Fortaleza' },
    
    // Região Centro-Oeste (baixa-média concentração)
    { lat: -16.6864, lng: -49.2643, intensity: 0.3, volume: 220000, city: 'Goiânia' },
    { lat: -15.7801, lng: -47.9292, intensity: 0.2, volume: 180000, city: 'Brasília' },
    
    // Região Norte (baixa concentração) 
    { lat: -1.4558, lng: -48.4902, intensity: 0.2, volume: 120000, city: 'Belém' },
    { lat: -3.1190, lng: -60.0217, intensity: 0.1, volume: 80000, city: 'Manaus' }
  ],
  regions_summary: {
    'Sudeste': {
      providers: 158,
      clients: 57500,
      partners: 2860,
      freight_volume: 6250000,
      participation: 52.3,
      growth_rate: 18.6
    },
    'Sul': { 
      providers: 68,
      clients: 23400,
      partners: 1290,
      freight_volume: 2900000,
      participation: 24.1,
      growth_rate: 16.3
    },
    'Nordeste': {
      providers: 34,
      clients: 11200,
      partners: 720,
      freight_volume: 1680000,
      participation: 14.2,
      growth_rate: 22.1
    },
    'Centro-Oeste': {
      providers: 18,
      clients: 4300,
      partners: 240,
      freight_volume: 850000,
      participation: 6.8,
      growth_rate: 13.5
    },
    'Norte': {
      providers: 7,
      clients: 1200,
      partners: 90,
      freight_volume: 320000,
      participation: 2.6,
      growth_rate: 28.7
    }
  }
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
    const type = searchParams.get('type') || 'all';
    const region = searchParams.get('region');
    const state = searchParams.get('state');

    let responseData = mockGeographicData;

    // Filtrar por região se especificado
    if (region && mockGeographicData.regions_summary[region]) {
      responseData = {
        ...responseData,
        region_data: mockGeographicData.regions_summary[region],
        states: mockGeographicData.states.filter(s => s.region === region)
      };
    }

    // Filtrar por estado se especificado  
    if (state) {
      const stateData = mockGeographicData.states.find(s => s.id === state.toUpperCase());
      if (stateData) {
        responseData = {
          ...responseData,
          state_data: stateData
        };
      }
    }

    // Filtrar por tipo de dados
    if (type === 'heatmap') {
      responseData = {
        freight_heatmap: mockGeographicData.freight_heatmap
      };
    } else if (type === 'summary') {
      responseData = {
        regions_summary: mockGeographicData.regions_summary,
        total_stats: {
          providers: mockGeographicData.states.reduce((acc, state) => acc + state.providers, 0),
          clients: mockGeographicData.states.reduce((acc, state) => acc + state.clients, 0),
          partners: mockGeographicData.states.reduce((acc, state) => acc + state.partners, 0),
          freight_volume: mockGeographicData.states.reduce((acc, state) => acc + state.freight_volume, 0)
        }
      };
    }

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Erro ao buscar dados geográficos:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
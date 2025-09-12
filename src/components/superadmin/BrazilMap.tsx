'use client'

import { useEffect, useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/superadmin/ui/card'
import { Button } from '@/components/superadmin/ui/button'
import { Badge } from '@/components/superadmin/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/superadmin/ui/tabs'
import { Layers, MapPin, TrendingUp } from 'lucide-react'

interface MapData {
  last_updated: string
  total_states: number
  region_filter: string | null
  intensity_range: { min: number; max: number }
  states: Array<{
    code: string
    name: string
    coords: [number, number]
    providers: number
    clients: number
    partners: number
    vouchers: number
    vouchers_used: number
    revenue: number
    intensity: number
  }>
  hot_spots: Array<{
    city: string
    state: string
    coords: [number, number]
    total_entities: number
    providers: number
    clients: number
    partners: number
    intensity: number
  }>
  stats: {
    total_providers: number
    active_providers: number
    total_clients: number
    active_clients: number
    total_partners: number
    active_partners: number
    total_vouchers: number
    used_vouchers: number
    total_revenue: number
    states_with_activity: number
  }
  intensity_legend: Array<{
    level: number
    color: string
    label: string
    range: string
  }>
}

// Componente do mapa (será carregado dinamicamente)
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false })

interface BrazilMapProps {
  height?: number
}

export function BrazilMap({ height = 500 }: BrazilMapProps) {
  const [mounted, setMounted] = useState(false)
  const [selectedView, setSelectedView] = useState<'providers' | 'clients' | 'partners'>('providers')
  const [mapData, setMapData] = useState<MapData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mapRef = useRef(null)

  useEffect(() => {
    setMounted(true)
    fetchMapData()
  }, [])

  const fetchMapData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/superadmin/map-data')
      
      if (!response.ok) {
        throw new Error('Erro ao carregar dados do mapa')
      }
      
      const data = await response.json()
      setMapData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      console.error('Erro ao buscar dados do mapa:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const getMarkerSize = (intensity: number) => {
    return Math.max(8, Math.min(25, intensity * 25))
  }

  const getMarkerColor = (intensity: number) => {
    if (intensity >= 0.8) return '#ff0000'
    if (intensity >= 0.6) return '#ff4500'
    if (intensity >= 0.4) return '#ffa500'
    if (intensity >= 0.2) return '#ffff00'
    if (intensity >= 0.1) return '#90ee90'
    return '#87ceeb'
  }

  if (!mounted || loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MapPin className="h-5 w-5" />
            <span>Mapa do Brasil</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 flex items-center justify-center bg-muted rounded-lg">
            <div className="text-center space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm text-muted-foreground">
                {loading ? 'Carregando dados do mapa...' : 'Carregando mapa...'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MapPin className="h-5 w-5" />
            <span>Mapa do Brasil</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 flex items-center justify-center bg-muted rounded-lg">
            <div className="text-center space-y-2">
              <p className="text-sm text-red-500">Erro ao carregar dados: {error}</p>
              <Button onClick={fetchMapData} size="sm">
                Tentar novamente
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!mapData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MapPin className="h-5 w-5" />
            <span>Mapa do Brasil</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 flex items-center justify-center bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Nenhum dado disponível</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2 text-lg">
            <MapPin className="h-4 w-4" />
            <span>Mapa do Brasil</span>
          </CardTitle>
          
          <Tabs value={selectedView} onValueChange={(value) => setSelectedView(value as any)}>
            <TabsList className="grid w-full grid-cols-3 h-8">
              <TabsTrigger value="providers" className="text-xs">Provedores</TabsTrigger>
              <TabsTrigger value="clients" className="text-xs">Clientes</TabsTrigger>
              <TabsTrigger value="partners" className="text-xs">Parceiros</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Mapa */}
          <div className="lg:col-span-3">
            <div className="relative rounded-lg overflow-hidden" style={{ height }}>
              <MapContainer
                center={[-15.7942, -47.8822]} // Centro do Brasil
                zoom={4}
                scrollWheelZoom={false}
                className="h-full w-full"
                ref={mapRef}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                {/* Marcadores dos estados */}
                {mapData.states.map((state, index) => {
                  const currentValue = selectedView === 'providers' 
                    ? state.providers 
                    : selectedView === 'clients' 
                    ? state.clients 
                    : state.partners
                  
                  if (currentValue === 0) return null
                  
                  return (
                    <Marker
                      key={state.code}
                      position={state.coords}
                    >
                      <Popup>
                        <div className="p-3 min-w-[200px]">
                          <h4 className="font-semibold text-sm mb-2">{state.name} ({state.code})</h4>
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">Provedores:</span>
                              <Badge variant="outline" className="text-xs">{state.providers}</Badge>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">Clientes:</span>
                              <Badge variant="outline" className="text-xs">{state.clients.toLocaleString('pt-BR')}</Badge>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">Parceiros:</span>
                              <Badge variant="outline" className="text-xs">{state.partners}</Badge>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">Vouchers:</span>
                              <Badge variant="outline" className="text-xs">{state.vouchers}</Badge>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">Receita:</span>
                              <Badge variant="outline" className="text-xs">{formatCurrency(state.revenue)}</Badge>
                            </div>
                            <div className="mt-2 pt-2 border-t">
                              <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Intensidade:</span>
                                <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                  <div 
                                    className="h-full rounded-full transition-all"
                                    style={{ 
                                      width: `${state.intensity * 100}%`,
                                      backgroundColor: getMarkerColor(state.intensity)
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  )
                })}
              </MapContainer>
              
              {/* Controls e Legenda */}
              <div className="absolute top-4 right-4 z-[1000] space-y-2">
                {/* Controles de Zoom */}
                <div className="bg-card border rounded-lg shadow-lg p-2 space-y-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full h-8 text-xs"
                    onClick={() => {
                      // @ts-ignore
                      mapRef.current?.setView([-23.5505, -46.6333], 6)
                    }}
                  >
                    <TrendingUp className="h-3 w-3 mr-1" />
                    SP
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full h-8 text-xs"
                    onClick={() => {
                      // @ts-ignore  
                      mapRef.current?.setView([-15.7942, -47.8822], 4)
                    }}
                  >
                    <Layers className="h-3 w-3 mr-1" />
                    Brasil
                  </Button>
                </div>
                
                {/* Legenda de Intensidade */}
                <div className="bg-card border rounded-lg shadow-lg p-3">
                  <h4 className="text-xs font-medium mb-2">Intensidade</h4>
                  <div className="space-y-1">
                    {mapData.intensity_legend.slice(0, 3).map((legend, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: legend.color }}
                        ></div>
                        <span className="text-xs text-muted-foreground">{legend.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Sidebar com rankings */}
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-3 text-sm">
                Top Estados - {selectedView === 'providers' ? 'Provedores' : 
                              selectedView === 'clients' ? 'Clientes' : 'Parceiros'}
              </h4>
              
              <div className="space-y-2">
                {mapData.states
                  .filter(state => {
                    const value = selectedView === 'providers' ? state.providers : 
                                 selectedView === 'clients' ? state.clients : state.partners
                    return value > 0
                  })
                  .sort((a, b) => {
                    const valueA = selectedView === 'providers' ? a.providers : 
                                   selectedView === 'clients' ? a.clients : a.partners
                    const valueB = selectedView === 'providers' ? b.providers : 
                                   selectedView === 'clients' ? b.clients : b.partners
                    return valueB - valueA
                  })
                  .slice(0, 8)
                  .map((state, index) => {
                    const value = selectedView === 'providers' ? state.providers : 
                                 selectedView === 'clients' ? state.clients : state.partners
                    const displayValue = value.toLocaleString('pt-BR')
                    
                    return (
                      <div key={state.code} className="flex items-center justify-between p-2 rounded hover:bg-muted/50">
                        <div className="flex items-center space-x-2">
                          <div className={`w-6 h-6 rounded text-xs flex items-center justify-center font-medium ${
                            index < 3 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                          }`}>
                            {index + 1}
                          </div>
                          <span className="text-sm font-medium">{state.code}</span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {displayValue}
                        </Badge>
                      </div>
                    )
                  })
                }
              </div>
            </div>
            
            {/* Resumo */}
            <div className="border-t pt-4 space-y-2">
              <h4 className="font-semibold text-sm mb-2">Resumo Nacional</h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Provedores:</span>
                  <span className="font-medium">{mapData.stats.total_providers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Provedores Ativos:</span>
                  <span className="font-medium">{mapData.stats.active_providers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Clientes:</span>
                  <span className="font-medium">{mapData.stats.total_clients.toLocaleString('pt-BR')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Parceiros:</span>
                  <span className="font-medium">{mapData.stats.total_partners.toLocaleString('pt-BR')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Receita Total:</span>
                  <span className="font-medium">{formatCurrency(mapData.stats.total_revenue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estados com Atividade:</span>
                  <span className="font-medium">{mapData.stats.states_with_activity}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Send, 
  Code2, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Copy, 
  Download,
  RefreshCw,
  Database,
  Server,
  Globe,
  AlertTriangle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/superadmin/ui/card'
import { Button } from '@/components/superadmin/ui/button'
import { Badge } from '@/components/superadmin/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/superadmin/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/superadmin/ui/select'

interface APIEndpoint {
  id: string
  name: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  path: string
  description: string
  category: 'admin' | 'superadmin' | 'parceiro' | 'cliente' | 'auth'
  authenticated: boolean
  status: string
  version: string
  responseTime: number
  errorRate: number
  lastUsed: string | null
  totalRequests: number
}

interface APIResponse {
  id: string
  endpoint: string
  method: string
  status: number
  responseTime: number
  timestamp: string
  response: any
  success: boolean
}

interface APIStatistics {
  totalEndpoints: number
  activeEndpoints: number
  avgResponseTime: number
  overallErrorRate: number
  totalRequests: number
  categoryDistribution: Array<{
    category: string
    count: number
    percentage: number
  }>
  methodDistribution: Array<{
    method: string
    count: number
    percentage: number
  }>
  topEndpoints: Array<{
    name: string
    path: string
    requests: number
    responseTime: number
  }>
}

export default function APIsPage() {
  const { data: session, status } = useSession()
  const [selectedEndpoint, setSelectedEndpoint] = useState<APIEndpoint | null>(null)
  const [responses, setResponses] = useState<APIResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedMethod, setSelectedMethod] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [endpoints, setEndpoints] = useState<APIEndpoint[]>([])
  const [statistics, setStatistics] = useState<APIStatistics | null>(null)

  useEffect(() => {
    if (session?.user?.role === 'superadmin') {
      fetchEndpointsData()
    }
  }, [session, selectedCategory, selectedMethod, selectedStatus])

  const fetchEndpointsData = async () => {
    try {
      const params = new URLSearchParams()
      if (selectedCategory !== 'all') params.append('category', selectedCategory)
      if (selectedMethod !== 'all') params.append('method', selectedMethod)
      if (selectedStatus !== 'all') params.append('status', selectedStatus)

      const response = await fetch(`/api/superadmin/api-endpoints?${params}`)
      if (response.ok) {
        const data = await response.json()
        setEndpoints(data.endpoints)
        setStatistics(data.statistics)
      }
    } catch (error) {
      console.error('Erro ao carregar endpoints:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredEndpoints = endpoints

  const executeRequest = async (endpoint: APIEndpoint) => {
    const startTime = Date.now()
    
    try {
      const response = await fetch(`/api/superadmin/api-endpoints`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'test_endpoint',
          endpoint_id: endpoint.id,
          endpoint_path: endpoint.path
        })
      })
      
      const result = await response.json()
      const endTime = Date.now()
      
      const apiResponse: APIResponse = {
        id: Date.now().toString(),
        endpoint: endpoint.path,
        method: endpoint.method,
        status: result.success ? result.result.status : 0,
        responseTime: result.success ? result.result.responseTime : endTime - startTime,
        timestamp: new Date().toLocaleString('pt-BR'),
        response: result.success ? { status: result.result.status, success: result.result.success } : { error: result.error },
        success: result.success
      }
      
      setResponses(prev => [apiResponse, ...prev.slice(0, 9)])
    } catch (error) {
      const endTime = Date.now()
      
      const apiResponse: APIResponse = {
        id: Date.now().toString(),
        endpoint: endpoint.path,
        method: endpoint.method,
        status: 0,
        responseTime: endTime - startTime,
        timestamp: new Date().toLocaleString('pt-BR'),
        response: { error: error instanceof Error ? error.message : 'Erro desconhecido' },
        success: false
      }
      
      setResponses(prev => [apiResponse, ...prev.slice(0, 9)])
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'text-green-600 bg-green-50'
      case 'POST': return 'text-blue-600 bg-blue-50'
      case 'PUT': return 'text-yellow-600 bg-yellow-50'
      case 'DELETE': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'superadmin': return Server
      case 'admin': return Database
      case 'parceiro': return Globe
      case 'cliente': return Globe
      default: return Code2
    }
  }

  const formatLastUsed = (dateString: string | null) => {
    if (!dateString) return 'Nunca usado'
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Agora'
    if (diffInMinutes < 60) return `${diffInMinutes}min atrás`
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours}h atrás`
    
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays}d atrás`
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Carregando APIs...</p>
        </div>
      </div>
    )
  }

  if (!statistics) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium">Erro ao carregar dados</p>
          <p className="text-sm text-muted-foreground">Tente recarregar a página</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">APIs</h1>
          <p className="text-sm text-muted-foreground">
            Teste e documentação dos endpoints
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={fetchEndpointsData}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Atualizar
          </Button>
          <Button variant="outline" size="sm" onClick={() => setResponses([])}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Limpar Testes
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Code2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total APIs</p>
                <p className="text-xl font-bold">{statistics.totalEndpoints}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">APIs Ativas</p>
                <p className="text-xl font-bold">{statistics.activeEndpoints}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Clock className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tempo Médio</p>
                <p className="text-xl font-bold">{statistics.avgResponseTime}ms</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Taxa de Erro</p>
                <p className="text-xl font-bold">{statistics.overallErrorRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-indigo-500/10 rounded-lg">
                <Send className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Requests</p>
                <p className="text-xl font-bold">{statistics.totalRequests}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Lista de Endpoints */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Endpoints</CardTitle>
              
              <div className="grid grid-cols-2 gap-2">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="superadmin">SuperAdmin</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="parceiro">Parceiro</SelectItem>
                    <SelectItem value="cliente">Cliente</SelectItem>
                    <SelectItem value="auth">Auth</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={selectedMethod} onValueChange={setSelectedMethod}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="GET">GET</SelectItem>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="PUT">PUT</SelectItem>
                    <SelectItem value="DELETE">DELETE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-2">
              {filteredEndpoints.map((endpoint) => {
                const CategoryIcon = getCategoryIcon(endpoint.category)
                
                return (
                  <motion.div
                    key={endpoint.id}
                    whileHover={{ scale: 1.02 }}
                    className={`p-3 border rounded-lg cursor-pointer transition-all ${
                      selectedEndpoint?.id === endpoint.id 
                        ? 'border-foreground bg-accent' 
                        : 'border-border hover:border-muted-foreground'
                    }`}
                    onClick={() => setSelectedEndpoint(endpoint)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <Badge className={`text-xs px-2 py-0.5 ${getMethodColor(endpoint.method)}`}>
                            {endpoint.method}
                          </Badge>
                          <CategoryIcon className="h-3 w-3 text-muted-foreground" />
                        </div>
                        <p className="font-medium text-sm truncate">{endpoint.name}</p>
                        <p className="text-xs text-muted-foreground font-mono truncate">
                          {endpoint.path}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {endpoint.description}
                        </p>
                        <div className="flex items-center space-x-2 mt-2 text-xs text-muted-foreground">
                          <span>{endpoint.responseTime}ms</span>
                          <span>•</span>
                          <span>{endpoint.errorRate}% erro</span>
                          <span>•</span>
                          <span>{formatLastUsed(endpoint.lastUsed)}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </CardContent>
          </Card>
        </div>

        {/* Tester e Resposta */}
        <div className="lg:col-span-2 space-y-4">
          {/* Área de Teste */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Teste de API</CardTitle>
            </CardHeader>
            
            <CardContent>
              {selectedEndpoint ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Badge className={getMethodColor(selectedEndpoint.method)}>
                        {selectedEndpoint.method}
                      </Badge>
                      <code className="text-sm font-mono">{selectedEndpoint.path}</code>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => executeRequest(selectedEndpoint)}
                      disabled={loading}
                    >
                      {loading ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      Executar
                    </Button>
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    {selectedEndpoint.description}
                  </div>
                  
                  {selectedEndpoint.authenticated && (
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      <CheckCircle className="h-3 w-3" />
                      <span>Autenticação requerida</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Code2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Selecione um endpoint para testar</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Histórico de Respostas */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Histórico de Respostas</CardTitle>
            </CardHeader>
            
            <CardContent>
              {responses.length > 0 ? (
                <div className="space-y-3">
                  {responses.map((response) => (
                    <motion.div
                      key={response.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="border rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <Badge className={getMethodColor(response.method)}>
                            {response.method}
                          </Badge>
                          <span className="text-sm font-mono">{response.endpoint}</span>
                          {response.success ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(JSON.stringify(response.response, null, 2))}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground mb-3">
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{response.responseTime}ms</span>
                        </div>
                        <span>Status: {response.status}</span>
                        <span>{response.timestamp}</span>
                      </div>
                      
                      <div className="bg-muted rounded p-3">
                        <pre className="text-xs overflow-x-auto">
                          {JSON.stringify(response.response, null, 2)}
                        </pre>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma resposta ainda</p>
                  <p className="text-xs">Execute um endpoint para ver as respostas aqui</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
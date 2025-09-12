'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import {
  Monitor,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Users,
  Building2,
  DollarSign,
  Calendar,
  Filter,
  Download,
  Zap,
  Shield,
  Activity,
  Database,
  Server,
  Wifi,
  WifiOff
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/superadmin/ui/card'
import { Badge } from '@/components/superadmin/ui/badge'
import { Button } from '@/components/superadmin/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/superadmin/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/superadmin/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/superadmin/ui/tabs'
// Progress component will be created inline
import { Alert, AlertDescription } from '@/components/superadmin/ui/alert'

interface Provedor {
  id: number
  nome_empresa: string
  email: string
  ativo: boolean
  data_vencimento: string | null
  data_cadastro: string
  plano_nome: string
  plano_preco: number
  limite_clientes: number | null
  limite_parceiros: number | null
  limite_produtos: number | null
  clientes_atual: number
  parceiros_atual: number
  produtos_atual: number
  vouchers_atual: number
  pedidos_total: number
  uso_clientes_percent: number
  uso_parceiros_percent: number
  uso_produtos_percent: number
  status_alerta: 'normal' | 'vencimento_proximo' | 'limite_clientes' | 'limite_parceiros' | 'limite_produtos'
}

interface SystemStats {
  total_provedores: number
  provedores_ativos: number
  vencimento_proximo: number
  total_clientes: number
  total_parceiros: number
  total_produtos: number
  total_pedidos: number
  receita_mensal_potencial: number
}

interface PlanoDistribution {
  plano: string
  quantidade: number
  ativos: number
}

interface ActivityData {
  data: string
  cadastros: number
}

export default function MonitoramentoPage() {
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(true)
  const [provedores, setProvedores] = useState<Provedor[]>([])
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null)
  const [planosDist, setPlanosDist] = useState<PlanoDistribution[]>([])
  const [atividade, setAtividade] = useState<ActivityData[]>([])
  const [alertasCriticos, setAlertasCriticos] = useState<Provedor[]>([])
  const [selectedProvedor, setSelectedProvedor] = useState<string>('')
  const [showAlertsOnly, setShowAlertsOnly] = useState<boolean>(false)

  const fetchMonitoringData = async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams()
      if (selectedProvedor) params.append('provedor_id', selectedProvedor)
      if (showAlertsOnly) params.append('alertas', 'true')

      const response = await fetch(`/api/superadmin/monitor?${params}`)
      if (!response.ok) throw new Error('Erro ao carregar dados de monitoramento')
      
      const data = await response.json()
      
      setProvedores(data.provedores || [])
      setSystemStats(data.system_stats || null)
      setPlanosDist(data.planos_distribuicao || [])
      setAtividade(data.atividade_recente || [])
      setAlertasCriticos(data.alertas_criticos || [])
      
    } catch (error) {
      console.error('Erro ao carregar monitoramento:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session?.user?.role === 'superadmin') {
      fetchMonitoringData()
    }
  }, [session, selectedProvedor, showAlertsOnly])

  const getStatusColor = (status: string, isActive: boolean) => {
    if (!isActive) return 'bg-gray-500/10 text-gray-700'
    
    switch (status) {
      case 'vencimento_proximo': return 'bg-yellow-500/10 text-yellow-700'
      case 'limite_clientes':
      case 'limite_parceiros':
      case 'limite_produtos': return 'bg-red-500/10 text-red-700'
      default: return 'bg-green-500/10 text-green-700'
    }
  }

  const getStatusIcon = (status: string, isActive: boolean) => {
    if (!isActive) return <WifiOff className="h-4 w-4" />
    
    switch (status) {
      case 'vencimento_proximo': return <Clock className="h-4 w-4" />
      case 'limite_clientes':
      case 'limite_parceiros':
      case 'limite_produtos': return <AlertTriangle className="h-4 w-4" />
      default: return <CheckCircle className="h-4 w-4" />
    }
  }

  const getStatusText = (status: string, isActive: boolean) => {
    if (!isActive) return 'Inativo'
    
    switch (status) {
      case 'vencimento_proximo': return 'Vencendo'
      case 'limite_clientes': return 'Limite Clientes'
      case 'limite_parceiros': return 'Limite Parceiros'  
      case 'limite_produtos': return 'Limite Produtos'
      default: return 'Normal'
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Carregando monitoramento...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Monitoramento</h1>
          <p className="text-sm text-muted-foreground">
            Monitoramento de uso e limites dos provedores
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" />
            Relatório
          </Button>
        </div>
      </div>

      {/* Alertas Críticos */}
      {alertasCriticos.length > 0 && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{alertasCriticos.length} alertas críticos</strong> requerem atenção.
            {alertasCriticos.slice(0, 3).map(p => p.nome_empresa).join(', ')}
            {alertasCriticos.length > 3 && ` e mais ${alertasCriticos.length - 3}...`}
          </AlertDescription>
        </Alert>
      )}

      {/* System Stats */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Provedores</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStats?.total_provedores || 0}</div>
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              <span className="text-green-600">{systemStats?.provedores_ativos || 0} ativos</span>
              {systemStats?.vencimento_proximo ? (
                <>
                  <span>•</span>
                  <span className="text-orange-600">{systemStats.vencimento_proximo} vencendo</span>
                </>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStats?.total_clientes?.toLocaleString('pt-BR') || 0}</div>
            <p className="text-xs text-muted-foreground">Usuários cadastrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Mensal</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(systemStats?.receita_mensal_potencial || 0)}</div>
            <p className="text-xs text-muted-foreground">Potencial com provedores ativos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pedidos Totais</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStats?.total_pedidos?.toLocaleString('pt-BR') || 0}</div>
            <p className="text-xs text-muted-foreground">Transações processadas</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="providers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="providers">Provedores</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="providers" className="space-y-4">
          {/* Filtros */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filtros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium">Provedor:</label>
                  <Select value={selectedProvedor} onValueChange={(value) => setSelectedProvedor(value === 'all' ? '' : value)}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {provedores.map((p) => (
                        <SelectItem key={p.id} value={p.id.toString()}>
                          {p.nome_empresa}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  variant={showAlertsOnly ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setShowAlertsOnly(!showAlertsOnly)}
                >
                  <Filter className="h-4 w-4 mr-1" />
                  {showAlertsOnly ? 'Mostrando Alertas' : 'Apenas Alertas'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tabela de Provedores */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Monitor className="h-5 w-5" />
                <span>Status dos Provedores</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Provedor</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Uso Clientes</TableHead>
                    <TableHead>Uso Parceiros</TableHead>
                    <TableHead>Uso Produtos</TableHead>
                    <TableHead>Vencimento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {provedores.map((provedor) => (
                    <TableRow key={provedor.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{provedor.nome_empresa}</div>
                          <div className="text-xs text-muted-foreground">{provedor.email}</div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div>
                          <div className="text-sm font-medium">{provedor.plano_nome}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatCurrency(provedor.plano_preco)}/mês
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <Badge className={getStatusColor(provedor.status_alerta, provedor.ativo)}>
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(provedor.status_alerta, provedor.ativo)}
                            <span>{getStatusText(provedor.status_alerta, provedor.ativo)}</span>
                          </div>
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm">
                            {provedor.clientes_atual} / {provedor.limite_clientes || '∞'}
                          </div>
                          {provedor.limite_clientes && (
                            <div className="w-full bg-muted rounded-full h-1">
                              <div 
                                className={`h-1 rounded-full ${
                                  provedor.uso_clientes_percent >= 90 
                                    ? 'bg-red-500' 
                                    : provedor.uso_clientes_percent >= 70 
                                    ? 'bg-yellow-500' 
                                    : 'bg-green-500'
                                }`}
                                style={{ width: `${Math.min(provedor.uso_clientes_percent, 100)}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm">
                            {provedor.parceiros_atual} / {provedor.limite_parceiros || '∞'}
                          </div>
                          {provedor.limite_parceiros && (
                            <div className="w-full bg-muted rounded-full h-1">
                              <div 
                                className={`h-1 rounded-full ${
                                  provedor.uso_parceiros_percent >= 90 
                                    ? 'bg-red-500' 
                                    : provedor.uso_parceiros_percent >= 70 
                                    ? 'bg-yellow-500' 
                                    : 'bg-green-500'
                                }`}
                                style={{ width: `${Math.min(provedor.uso_parceiros_percent, 100)}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm">
                            {provedor.produtos_atual} / {provedor.limite_produtos || '∞'}
                          </div>
                          {provedor.limite_produtos && (
                            <div className="w-full bg-muted rounded-full h-1">
                              <div 
                                className={`h-1 rounded-full ${
                                  provedor.uso_produtos_percent >= 90 
                                    ? 'bg-red-500' 
                                    : provedor.uso_produtos_percent >= 70 
                                    ? 'bg-yellow-500' 
                                    : 'bg-green-500'
                                }`}
                                style={{ width: `${Math.min(provedor.uso_produtos_percent, 100)}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        {provedor.data_vencimento ? (
                          <div className={`text-sm ${
                            new Date(provedor.data_vencimento) <= new Date(Date.now() + 7*24*60*60*1000) 
                              ? 'text-red-600 font-medium' 
                              : 'text-muted-foreground'
                          }`}>
                            {formatDate(provedor.data_vencimento)}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Sem vencimento</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Distribuição de Planos */}
            <Card>
              <CardHeader>
                <CardTitle>Distribuição de Planos</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={planosDist}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="quantidade"
                      label={(entry) => `${entry.plano}: ${entry.quantidade}`}
                    >
                      {planosDist.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={`hsl(${index * 137.5 % 360}, 70%, 60%)`} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                
                <div className="mt-4 space-y-2">
                  {planosDist.map((plano, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: `hsl(${index * 137.5 % 360}, 70%, 60%)` }}
                        />
                        <span>{plano.plano}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{plano.quantidade} total</div>
                        <div className="text-xs text-green-600">{plano.ativos} ativos</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Atividade de Cadastros */}
            <Card>
              <CardHeader>
                <CardTitle>Cadastros Recentes (30 dias)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={atividade}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="data" 
                      tickFormatter={(value) => new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleDateString('pt-BR')}
                      formatter={(value) => [value, 'Cadastros']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="cadastros" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
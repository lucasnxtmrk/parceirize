'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts'
import {
  Zap,
  Wifi,
  WifiOff,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Settings,
  Play,
  Pause,
  Trash2,
  Eye,
  Download,
  Filter,
  Building2,
  Database,
  Activity,
  TrendingUp,
  Server,
  Globe,
  Shield
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/superadmin/ui/card'
import { Badge } from '@/components/superadmin/ui/badge'
import { Button } from '@/components/superadmin/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/superadmin/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/superadmin/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/superadmin/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/superadmin/ui/dialog'
import { Input } from '@/components/superadmin/ui/input'
import { Label } from '@/components/superadmin/ui/label'
import { Alert, AlertDescription } from '@/components/superadmin/ui/alert'

interface Integracao {
  id: number
  tenant_id: string
  tipo: string
  subdominio?: string
  app_name?: string
  modo_ativacao?: string
  token?: string
  created_at: string
  nome_empresa: string
  provedor_email: string
  plano_nome: string
  status_conexao: 'conectado' | 'desconectado' | 'inativo'
  ultima_sincronizacao?: string
  total_clientes: number
  total_parceiros: number
}

interface IntegracaoStats {
  total_integracoes: number
  conectadas: number
  desconectadas: number
  provedores_com_integracao: number
  novas_7dias: number
}

interface AtividadeSincronizacao {
  data: string
  sincronizacoes: number
}

interface ErroRecente {
  id: number
  tenant_id: string
  acao: string
  detalhes: string
  created_at: string
  nome_empresa: string
}

interface PerformanceProvedor {
  nome_empresa: string
  tenant_id: string
  total_requests: number
  tempo_medio_resposta: number
  total_erros: number
}

export default function IntegracoesPage() {
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(true)
  const [integracoes, setIntegracoes] = useState<Integracao[]>([])
  const [stats, setStats] = useState<IntegracaoStats | null>(null)
  const [atividade, setAtividade] = useState<AtividadeSincronizacao[]>([])
  const [erros, setErros] = useState<ErroRecente[]>([])
  const [performance, setPerformance] = useState<PerformanceProvedor[]>([])
  const [selectedIntegracao, setSelectedIntegracao] = useState<Integracao | null>(null)
  const [configDialogOpen, setConfigDialogOpen] = useState(false)
  const [testingConnection, setTestingConnection] = useState<number | null>(null)

  // Filtros
  const [filters, setFilters] = useState({
    status: '',
    tipo: 'SGP',
    tenant_id: ''
  })

  // Configuração
  const [configForm, setConfigForm] = useState({
    subdominio: '',
    app_name: '',
    modo_ativacao: 'automatica'
  })

  const fetchIntegrationsData = async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value.toString())
      })

      const response = await fetch(`/api/superadmin/integracoes?${params}`)
      if (!response.ok) throw new Error('Erro ao carregar dados de integrações')
      
      const data = await response.json()
      
      setIntegracoes(data.integracoes || [])
      setStats(data.estatisticas || null)
      setAtividade(data.atividade_sincronizacao || [])
      setErros(data.erros_recentes || [])
      setPerformance(data.performance_provedores || [])
      
    } catch (error) {
      console.error('Erro ao carregar integrações:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session?.user?.role === 'superadmin') {
      fetchIntegrationsData()
    }
  }, [session, filters])

  const testConnection = async (integracaoId: number) => {
    setTestingConnection(integracaoId)
    try {
      const response = await fetch('/api/superadmin/integracoes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'test_connection',
          integracao_id: integracaoId
        })
      })

      const result = await response.json()
      if (result.success) {
        alert(`Teste ${result.online ? 'bem-sucedido' : 'falhou'}: ${result.detalhes}`)
      } else {
        alert('Erro no teste de conexão')
      }
    } catch (error) {
      alert('Erro ao testar conexão')
    } finally {
      setTestingConnection(null)
    }
  }

  const forceSync = async (integracaoId: number, tenantId: string) => {
    try {
      const response = await fetch('/api/superadmin/integracoes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'force_sync',
          integracao_id: integracaoId,
          tenant_id: tenantId
        })
      })

      const result = await response.json()
      if (result.success) {
        alert('Sincronização iniciada com sucesso')
        await fetchIntegrationsData()
      } else {
        alert('Erro ao iniciar sincronização')
      }
    } catch (error) {
      alert('Erro ao forçar sincronização')
    }
  }

  const updateConfig = async () => {
    if (!selectedIntegracao) return
    
    try {
      const response = await fetch('/api/superadmin/integracoes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'update_config',
          integracao_id: selectedIntegracao.id,
          tenant_id: selectedIntegracao.tenant_id,
          dados: configForm
        })
      })

      const result = await response.json()
      if (result.success) {
        alert('Configuração atualizada com sucesso')
        setConfigDialogOpen(false)
        await fetchIntegrationsData()
      } else {
        alert('Erro ao atualizar configuração')
      }
    } catch (error) {
      alert('Erro ao salvar configuração')
    }
  }

  const disableIntegration = async (integracaoId: number, tenantId: string) => {
    if (!confirm('Deseja realmente desativar esta integração?')) return
    
    try {
      const response = await fetch('/api/superadmin/integracoes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'disable_integration',
          integracao_id: integracaoId,
          tenant_id: tenantId
        })
      })

      const result = await response.json()
      if (result.success) {
        alert('Integração desativada com sucesso')
        await fetchIntegrationsData()
      } else {
        alert('Erro ao desativar integração')
      }
    } catch (error) {
      alert('Erro ao desativar integração')
    }
  }

  const deleteIntegration = async (integracaoId: number) => {
    if (!confirm('Deseja realmente remover esta integração? Esta ação não pode ser desfeita.')) return
    
    try {
      const response = await fetch(`/api/superadmin/integracoes?id=${integracaoId}`, {
        method: 'DELETE'
      })

      const result = await response.json()
      if (result.success) {
        alert('Integração removida com sucesso')
        await fetchIntegrationsData()
      } else {
        alert('Erro ao remover integração')
      }
    } catch (error) {
      alert('Erro ao remover integração')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'conectado': return 'bg-green-500/10 text-green-700'
      case 'desconectado': return 'bg-red-500/10 text-red-700'
      case 'inativo': return 'bg-yellow-500/10 text-yellow-700'
      default: return 'bg-gray-500/10 text-gray-700'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'conectado': return <Wifi className="h-4 w-4" />
      case 'desconectado': return <WifiOff className="h-4 w-4" />
      case 'inativo': return <Clock className="h-4 w-4" />
      default: return <AlertTriangle className="h-4 w-4" />
    }
  }

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Nunca'
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Carregando integrações...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Integrações</h1>
          <p className="text-sm text-muted-foreground">
            Gerenciamento de integrações SGP e conectividade
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={fetchIntegrationsData}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Atualizar
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" />
            Relatório
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Integrações</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_integracoes || 0}</div>
            <p className="text-xs text-muted-foreground">Configuradas no sistema</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conectadas</CardTitle>
            <Wifi className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.conectadas || 0}</div>
            <p className="text-xs text-muted-foreground">Online e funcionando</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Desconectadas</CardTitle>
            <WifiOff className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats?.desconectadas || 0}</div>
            <p className="text-xs text-muted-foreground">Precisam de atenção</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Provedores</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.provedores_com_integracao || 0}</div>
            <p className="text-xs text-muted-foreground">Com integração ativa</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Novas (7d)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.novas_7dias || 0}</div>
            <p className="text-xs text-muted-foreground">Últimos 7 dias</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="integrations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="integrations">Integrações</TabsTrigger>
          <TabsTrigger value="activity">Atividade</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="errors">Erros</TabsTrigger>
        </TabsList>

        <TabsContent value="integrations" className="space-y-4">
          {/* Filtros */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filtros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium">Status:</label>
                  <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value === 'all' ? '' : value }))}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="conectado">Conectado</SelectItem>
                      <SelectItem value="desconectado">Desconectado</SelectItem>
                      <SelectItem value="inativo">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium">Tipo:</label>
                  <Select value={filters.tipo} onValueChange={(value) => setFilters(prev => ({ ...prev, tipo: value }))}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SGP">SGP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium">Tenant ID:</label>
                  <Input
                    placeholder="ID do provedor"
                    value={filters.tenant_id}
                    onChange={(e) => setFilters(prev => ({ ...prev, tenant_id: e.target.value }))}
                    className="w-48"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabela de Integrações */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="h-5 w-5" />
                <span>Integrações SGP</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Provedor</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Configuração</TableHead>
                    <TableHead>Última Sinc.</TableHead>
                    <TableHead>Dados</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {integracoes.map((integracao) => (
                    <TableRow key={integracao.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{integracao.nome_empresa}</div>
                          <div className="text-xs text-muted-foreground">{integracao.provedor_email}</div>
                          <div className="text-xs text-muted-foreground">Plano: {integracao.plano_nome}</div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <Badge variant="outline">
                          {integracao.tipo}
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        <Badge className={getStatusColor(integracao.status_conexao)}>
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(integracao.status_conexao)}
                            <span className="capitalize">{integracao.status_conexao}</span>
                          </div>
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        <div className="text-sm">
                          {integracao.subdominio && (
                            <div>Subdomínio: {integracao.subdominio}</div>
                          )}
                          {integracao.app_name && (
                            <div>App: {integracao.app_name}</div>
                          )}
                          {integracao.modo_ativacao && (
                            <div className="text-xs text-muted-foreground">
                              Modo: {integracao.modo_ativacao}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell className="text-xs">
                        {formatDate(integracao.ultima_sincronizacao)}
                      </TableCell>
                      
                      <TableCell>
                        <div className="text-sm">
                          <div>{integracao.total_clientes} clientes</div>
                          <div className="text-xs text-muted-foreground">
                            {integracao.total_parceiros} parceiros
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => testConnection(integracao.id)}
                            disabled={testingConnection === integracao.id}
                          >
                            {testingConnection === integracao.id ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <Activity className="h-4 w-4" />
                            )}
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => forceSync(integracao.id, integracao.tenant_id)}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedIntegracao(integracao)
                              setConfigForm({
                                subdominio: integracao.subdominio || '',
                                app_name: integracao.app_name || '',
                                modo_ativacao: integracao.modo_ativacao || 'automatica'
                              })
                              setConfigDialogOpen(true)
                            }}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => disableIntegration(integracao.id, integracao.tenant_id)}
                          >
                            <Pause className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteIntegration(integracao.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Atividade de Sincronização (30 dias)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={atividade}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="data" 
                    tickFormatter={(value) => new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleDateString('pt-BR')}
                    formatter={(value) => [value, 'Sincronizações']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="sincronizacoes" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Performance por Provedor</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Provedor</TableHead>
                    <TableHead>Requests Totais</TableHead>
                    <TableHead>Tempo Médio</TableHead>
                    <TableHead>Erros</TableHead>
                    <TableHead>Taxa de Erro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {performance.map((perf, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{perf.nome_empresa}</TableCell>
                      <TableCell>{perf.total_requests.toLocaleString('pt-BR')}</TableCell>
                      <TableCell>{perf.tempo_medio_resposta?.toFixed(2)}s</TableCell>
                      <TableCell>{perf.total_erros}</TableCell>
                      <TableCell>
                        <Badge className={
                          perf.total_requests > 0 && (perf.total_erros / perf.total_requests) > 0.05
                            ? 'bg-red-500/10 text-red-700'
                            : 'bg-green-500/10 text-green-700'
                        }>
                          {perf.total_requests > 0 
                            ? ((perf.total_erros / perf.total_requests) * 100).toFixed(1)
                            : '0'
                          }%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors">
          <Card>
            <CardHeader>
              <CardTitle>Erros Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              {erros.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p>Nenhum erro recente registrado.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Provedor</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead>Detalhes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {erros.map((erro) => (
                      <TableRow key={erro.id}>
                        <TableCell className="text-xs">{formatDate(erro.created_at)}</TableCell>
                        <TableCell className="font-medium">{erro.nome_empresa}</TableCell>
                        <TableCell>
                          <Badge variant="destructive">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {erro.acao}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm max-w-xs truncate">
                            {JSON.stringify(erro.detalhes).slice(0, 100)}...
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de Configuração */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurar Integração</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="subdominio">Subdomínio</Label>
              <Input
                id="subdominio"
                value={configForm.subdominio}
                onChange={(e) => setConfigForm(prev => ({ ...prev, subdominio: e.target.value }))}
                placeholder="ex: cliente.sgp.com.br"
              />
            </div>
            
            <div>
              <Label htmlFor="app_name">Nome da Aplicação</Label>
              <Input
                id="app_name"
                value={configForm.app_name}
                onChange={(e) => setConfigForm(prev => ({ ...prev, app_name: e.target.value }))}
                placeholder="Nome do app SGP"
              />
            </div>
            
            <div>
              <Label htmlFor="modo_ativacao">Modo de Ativação</Label>
              <Select value={configForm.modo_ativacao} onValueChange={(value) => setConfigForm(prev => ({ ...prev, modo_ativacao: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="automatica">Automática</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="programada">Programada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setConfigDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={updateConfig}>
                Salvar Configuração
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Search,
  Filter,
  Download,
  Eye,
  Shield,
  Clock,
  User,
  Activity,
  AlertTriangle,
  CheckCircle,
  Calendar,
  BarChart3,
  TrendingUp,
  FileText,
  Users
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/superadmin/ui/card'
import { Badge } from '@/components/superadmin/ui/badge'
import { Button } from '@/components/superadmin/ui/button'
import { Input } from '@/components/superadmin/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/superadmin/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/superadmin/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/superadmin/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/superadmin/ui/dialog'

interface AuditLog {
  id: number
  tenant_id: string
  usuario_tipo: 'superadmin' | 'admin' | 'cliente' | 'parceiro'
  usuario_id: number
  acao: string
  detalhes: any
  ip_address: string
  created_at: string
  nome_empresa?: string
  provedor_email?: string
  plano_nome?: string
}

interface AuditStats {
  total_logs: number
  tenants_ativos: number
  logs_24h: number
  logs_7d: number
}

interface UserTypeStats {
  usuario_tipo: string
  total: number
}

export default function AuditoriaPage() {
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [stats, setStats] = useState<AuditStats | null>(null)
  const [userTypes, setUserTypes] = useState<UserTypeStats[]>([])
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)

  // Filtros
  const [filters, setFilters] = useState({
    page: 1,
    limit: 50,
    tenant_id: '',
    usuario_tipo: '',
    acao: '',
    data_inicio: '',
    data_fim: ''
  })

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  })

  const fetchAuditData = async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value.toString())
      })

      const response = await fetch(`/api/superadmin/auditoria?${params}`)
      if (!response.ok) throw new Error('Erro ao carregar dados de auditoria')
      
      const data = await response.json()
      
      setLogs(data.logs || [])
      setStats(data.stats || null)
      setUserTypes(data.tipos || [])
      setPagination(data.pagination || {})
      
    } catch (error) {
      console.error('Erro ao carregar auditoria:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session?.user?.role === 'superadmin') {
      fetchAuditData()
    }
  }, [session, filters])

  const handleFilterChange = (key: string, value: string) => {
    const actualValue = value === 'all' ? '' : value
    setFilters(prev => ({ ...prev, [key]: actualValue, page: 1 }))
  }

  const exportLogs = () => {
    // Implementar exportação
    console.log('Exportando logs...')
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getUserTypeColor = (tipo: string) => {
    switch (tipo) {
      case 'superadmin': return 'bg-red-500/10 text-red-700'
      case 'admin': return 'bg-blue-500/10 text-blue-700'
      case 'cliente': return 'bg-green-500/10 text-green-700'
      case 'parceiro': return 'bg-purple-500/10 text-purple-700'
      default: return 'bg-gray-500/10 text-gray-700'
    }
  }

  const getActionIcon = (acao: string) => {
    if (acao.toLowerCase().includes('login')) return <User className="h-4 w-4" />
    if (acao.toLowerCase().includes('criar') || acao.toLowerCase().includes('cadastr')) return <CheckCircle className="h-4 w-4" />
    if (acao.toLowerCase().includes('deletar') || acao.toLowerCase().includes('remov')) return <AlertTriangle className="h-4 w-4" />
    if (acao.toLowerCase().includes('atualiz') || acao.toLowerCase().includes('edit')) return <FileText className="h-4 w-4" />
    return <Activity className="h-4 w-4" />
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Carregando auditoria...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Auditoria</h1>
          <p className="text-sm text-muted-foreground">
            Logs e atividades do sistema
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={exportLogs}>
            <Download className="h-4 w-4 mr-1" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Logs</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_logs?.toLocaleString('pt-BR') || '0'}</div>
            <p className="text-xs text-muted-foreground">Todas as atividades registradas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tenants Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.tenants_ativos || '0'}</div>
            <p className="text-xs text-muted-foreground">Provedores com atividade</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Últimas 24h</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.logs_24h?.toLocaleString('pt-BR') || '0'}</div>
            <p className="text-xs text-muted-foreground">Atividades recentes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Últimos 7 dias</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.logs_7d?.toLocaleString('pt-BR') || '0'}</div>
            <p className="text-xs text-muted-foreground">Atividade semanal</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="logs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="logs">Logs de Atividade</TabsTrigger>
          <TabsTrigger value="stats">Estatísticas</TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="space-y-4">
          {/* Filtros */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filtros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tenant ID</label>
                  <Input
                    placeholder="ID do provedor"
                    value={filters.tenant_id}
                    onChange={(e) => handleFilterChange('tenant_id', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipo de Usuário</label>
                  <Select
                    value={filters.usuario_tipo}
                    onValueChange={(value) => handleFilterChange('usuario_tipo', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="superadmin">SuperAdmin</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="cliente">Cliente</SelectItem>
                      <SelectItem value="parceiro">Parceiro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Ação</label>
                  <Input
                    placeholder="Buscar ação..."
                    value={filters.acao}
                    onChange={(e) => handleFilterChange('acao', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Data Início</label>
                  <Input
                    type="date"
                    value={filters.data_inicio}
                    onChange={(e) => handleFilterChange('data_inicio', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Data Fim</label>
                  <Input
                    type="date"
                    value={filters.data_fim}
                    onChange={(e) => handleFilterChange('data_fim', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabela de Logs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Logs de Auditoria</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Provedor</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-xs">
                        {formatDate(log.created_at)}
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Badge className={getUserTypeColor(log.usuario_tipo)}>
                            {log.usuario_tipo}
                          </Badge>
                          <span className="text-sm">ID: {log.usuario_id}</span>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getActionIcon(log.acao)}
                          <span className="text-sm">{log.acao}</span>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        {log.nome_empresa ? (
                          <div>
                            <div className="text-sm font-medium">{log.nome_empresa}</div>
                            <div className="text-xs text-muted-foreground">{log.provedor_email}</div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      
                      <TableCell className="font-mono text-xs">
                        {log.ip_address}
                      </TableCell>
                      
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedLog(log)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Detalhes do Log</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-sm font-medium text-muted-foreground">Data/Hora</label>
                                  <p className="font-mono">{selectedLog && formatDate(selectedLog.created_at)}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-muted-foreground">Tipo de Usuário</label>
                                  <p>
                                    <Badge className={selectedLog ? getUserTypeColor(selectedLog.usuario_tipo) : ''}>
                                      {selectedLog?.usuario_tipo}
                                    </Badge>
                                  </p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-muted-foreground">ID do Usuário</label>
                                  <p>{selectedLog?.usuario_id}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-muted-foreground">IP Address</label>
                                  <p className="font-mono">{selectedLog?.ip_address}</p>
                                </div>
                              </div>
                              
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">Ação</label>
                                <p className="mt-1">{selectedLog?.acao}</p>
                              </div>
                              
                              {selectedLog?.detalhes && (
                                <div>
                                  <label className="text-sm font-medium text-muted-foreground">Detalhes</label>
                                  <pre className="mt-1 p-3 bg-muted rounded-md text-xs overflow-auto">
                                    {JSON.stringify(JSON.parse(selectedLog.detalhes), null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {/* Paginação */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between space-x-2 py-4">
                  <div className="text-sm text-muted-foreground">
                    Mostrando {(pagination.page - 1) * pagination.limit + 1} a{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} de{' '}
                    {pagination.total} registros
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page <= 1}
                      onClick={() => handleFilterChange('page', (pagination.page - 1).toString())}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() => handleFilterChange('page', (pagination.page + 1).toString())}
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Distribuição por Tipo de Usuário</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {userTypes.map((type) => (
                  <div key={type.usuario_tipo} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Badge className={getUserTypeColor(type.usuario_tipo)}>
                        {type.usuario_tipo}
                      </Badge>
                      <span className="font-medium capitalize">{type.usuario_tipo}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">{type.total.toLocaleString('pt-BR')}</div>
                      <div className="text-xs text-muted-foreground">
                        {stats?.total_logs ? ((type.total / stats.total_logs) * 100).toFixed(1) : '0'}% do total
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
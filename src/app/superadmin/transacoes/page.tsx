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
  CreditCard,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  Store,
  Calendar,
  Filter,
  Download,
  Eye,
  AlertTriangle,
  CheckCircle,
  Clock,
  Ban,
  Receipt,
  Ticket,
  Building2,
  Search,
  RefreshCw
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/superadmin/ui/card'
import { Badge } from '@/components/superadmin/ui/badge'
import { Button } from '@/components/superadmin/ui/button'
import { Input } from '@/components/superadmin/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/superadmin/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/superadmin/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/superadmin/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/superadmin/ui/dialog'
import { Alert, AlertDescription } from '@/components/superadmin/ui/alert'

interface Transacao {
  tipo_transacao: 'pedido' | 'voucher'
  transacao_id: number
  qr_code: string
  valor: number
  status: string
  created_at: string
  validated_at?: string
  cliente_nome: string
  cliente_cpf: string
  provedor_nome: string
  provedor_email: string
  total_itens: number
}

interface TransacaoStats {
  total_pedidos: number
  pedidos_validados: number
  pedidos_pendentes: number
  valor_total_pedidos: number
  valor_validado_pedidos: number
  total_vouchers_utilizados: number
  valor_total_vouchers: number
  pedidos_7d: number
  vouchers_7d: number
  ticket_medio_pedidos: number
  desconto_medio_vouchers: number
}

interface TopProvedor {
  nome_empresa: string
  total_pedidos: number
  valor_total: number
  vouchers_utilizados: number
}

interface PadraoSuspeito {
  tipo_suspeita: string
  ocorrencias: number
  clientes_envolvidos: string[]
}

export default function TransacoesPage() {
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(true)
  const [transacoes, setTransacoes] = useState<Transacao[]>([])
  const [stats, setStats] = useState<TransacaoStats | null>(null)
  const [topProvedores, setTopProvedores] = useState<TopProvedor[]>([])
  const [padroesSuspeitos, setPadroesSuspeitos] = useState<PadraoSuspeito[]>([])
  const [selectedTransaction, setSelectedTransaction] = useState<Transacao | null>(null)

  // Filtros
  const [filters, setFilters] = useState({
    page: 1,
    limit: 50,
    tipo: '',
    tenant_id: '',
    data_inicio: '',
    data_fim: '',
    status: '',
    min_valor: 0
  })

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0
  })

  const fetchTransactionsData = async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value.toString())
      })

      const response = await fetch(`/api/superadmin/transacoes?${params}`)
      if (!response.ok) throw new Error('Erro ao carregar dados de transações')
      
      const data = await response.json()
      
      setTransacoes(data.transacoes || [])
      setStats(data.estatisticas || null)
      setTopProvedores(data.top_provedores || [])
      setPadroesSuspeitos(data.padroes_suspeitos || [])
      setPagination(data.pagination || {})
      
    } catch (error) {
      console.error('Erro ao carregar transações:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session?.user?.role === 'superadmin') {
      fetchTransactionsData()
    }
  }, [session, filters])

  const handleFilterChange = (key: string, value: string | number) => {
    const actualValue = value === 'all' ? '' : value
    setFilters(prev => ({ ...prev, [key]: actualValue, page: 1 }))
  }

  const blockTransaction = async (transacao: Transacao, motivo: string) => {
    try {
      const response = await fetch('/api/superadmin/transacoes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'block_transaction',
          transacao_id: transacao.transacao_id,
          tipo: transacao.tipo_transacao,
          motivo
        })
      })

      if (response.ok) {
        await fetchTransactionsData() // Recarregar dados
      }
    } catch (error) {
      console.error('Erro ao bloquear transação:', error)
    }
  }

  const getStatusColor = (status: string, tipo: string) => {
    if (tipo === 'voucher') return 'bg-purple-500/10 text-purple-700'
    
    switch (status) {
      case 'validado': return 'bg-green-500/10 text-green-700'
      case 'pendente': return 'bg-yellow-500/10 text-yellow-700'
      case 'bloqueado': return 'bg-red-500/10 text-red-700'
      default: return 'bg-gray-500/10 text-gray-700'
    }
  }

  const getStatusIcon = (status: string, tipo: string) => {
    if (tipo === 'voucher') return <Ticket className="h-4 w-4" />
    
    switch (status) {
      case 'validado': return <CheckCircle className="h-4 w-4" />
      case 'pendente': return <Clock className="h-4 w-4" />
      case 'bloqueado': return <Ban className="h-4 w-4" />
      default: return <Receipt className="h-4 w-4" />
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0)
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

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Carregando transações...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transações</h1>
          <p className="text-sm text-muted-foreground">
            Pedidos e vouchers utilizados
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={fetchTransactionsData}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Atualizar
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Alertas de Padrões Suspeitos */}
      {padroesSuspeitos.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{padroesSuspeitos.length} padrões suspeitos detectados:</strong>
            {padroesSuspeitos.map((padrao, index) => (
              <div key={index} className="mt-1">
                • {padrao.tipo_suspeita}: {padrao.ocorrencias} ocorrências
              </div>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pedidos</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_pedidos?.toLocaleString('pt-BR') || '0'}</div>
            <div className="text-xs text-muted-foreground">
              <span className="text-green-600">{stats?.pedidos_validados || 0} validados</span>
              {' • '}
              <span className="text-yellow-600">{stats?.pedidos_pendentes || 0} pendentes</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Volume Pedidos</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats?.valor_total_pedidos || 0)}</div>
            <div className="text-xs text-green-600">
              {formatCurrency(stats?.valor_validado_pedidos || 0)} validado
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vouchers Utilizados</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_vouchers_utilizados?.toLocaleString('pt-BR') || '0'}</div>
            <div className="text-xs text-muted-foreground">
              {formatCurrency(stats?.valor_total_vouchers || 0)} em descontos
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats?.ticket_medio_pedidos || 0)}</div>
            <div className="text-xs text-muted-foreground">
              Desconto médio: {formatCurrency(stats?.desconto_medio_vouchers || 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="transactions">Transações</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="suspicious">Padrões Suspeitos</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-4">
          {/* Filtros */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filtros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipo</label>
                  <Select
                    value={filters.tipo}
                    onValueChange={(value) => handleFilterChange('tipo', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="pedidos">Pedidos</SelectItem>
                      <SelectItem value="vouchers">Vouchers</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Tenant ID</label>
                  <Input
                    placeholder="ID do provedor"
                    value={filters.tenant_id}
                    onChange={(e) => handleFilterChange('tenant_id', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select
                    value={filters.status}
                    onValueChange={(value) => handleFilterChange('status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="validado">Validado</SelectItem>
                      <SelectItem value="bloqueado">Bloqueado</SelectItem>
                    </SelectContent>
                  </Select>
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

                <div className="space-y-2">
                  <label className="text-sm font-medium">Valor Mínimo</label>
                  <Input
                    type="number"
                    placeholder="R$ 0,00"
                    value={filters.min_valor}
                    onChange={(e) => handleFilterChange('min_valor', parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabela de Transações */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5" />
                <span>Transações</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>QR Code</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Provedor</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transacoes.map((transacao) => (
                    <TableRow key={`${transacao.tipo_transacao}-${transacao.transacao_id}`}>
                      <TableCell>
                        <Badge className={transacao.tipo_transacao === 'pedido' ? 'bg-blue-500/10 text-blue-700' : 'bg-purple-500/10 text-purple-700'}>
                          <div className="flex items-center space-x-1">
                            {transacao.tipo_transacao === 'pedido' ? <Receipt className="h-3 w-3" /> : <Ticket className="h-3 w-3" />}
                            <span className="capitalize">{transacao.tipo_transacao}</span>
                          </div>
                        </Badge>
                      </TableCell>
                      
                      <TableCell className="font-mono text-xs">
                        {transacao.qr_code}
                      </TableCell>
                      
                      <TableCell className="font-medium">
                        {formatCurrency(transacao.valor)}
                      </TableCell>
                      
                      <TableCell>
                        <Badge className={getStatusColor(transacao.status, transacao.tipo_transacao)}>
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(transacao.status, transacao.tipo_transacao)}
                            <span className="capitalize">{transacao.status}</span>
                          </div>
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        <div>
                          <div className="text-sm font-medium">{transacao.cliente_nome}</div>
                          <div className="text-xs text-muted-foreground">{transacao.cliente_cpf}</div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div>
                          <div className="text-sm font-medium">{transacao.provedor_nome}</div>
                          <div className="text-xs text-muted-foreground">{transacao.provedor_email}</div>
                        </div>
                      </TableCell>
                      
                      <TableCell className="text-xs">
                        {formatDate(transacao.created_at)}
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => setSelectedTransaction(transacao)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Detalhes da Transação</DialogTitle>
                              </DialogHeader>
                              {selectedTransaction && (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <label className="text-sm font-medium text-muted-foreground">Tipo</label>
                                      <p className="capitalize">{selectedTransaction.tipo_transacao}</p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium text-muted-foreground">ID</label>
                                      <p>{selectedTransaction.transacao_id}</p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium text-muted-foreground">QR Code</label>
                                      <p className="font-mono text-sm">{selectedTransaction.qr_code}</p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium text-muted-foreground">Valor</label>
                                      <p className="font-medium">{formatCurrency(selectedTransaction.valor)}</p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium text-muted-foreground">Status</label>
                                      <p>
                                        <Badge className={getStatusColor(selectedTransaction.status, selectedTransaction.tipo_transacao)}>
                                          {selectedTransaction.status}
                                        </Badge>
                                      </p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium text-muted-foreground">Itens</label>
                                      <p>{selectedTransaction.total_itens}</p>
                                    </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <label className="text-sm font-medium text-muted-foreground">Cliente</label>
                                      <p>{selectedTransaction.cliente_nome}</p>
                                      <p className="text-sm text-muted-foreground">{selectedTransaction.cliente_cpf}</p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium text-muted-foreground">Provedor</label>
                                      <p>{selectedTransaction.provedor_nome}</p>
                                      <p className="text-sm text-muted-foreground">{selectedTransaction.provedor_email}</p>
                                    </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <label className="text-sm font-medium text-muted-foreground">Criado em</label>
                                      <p>{formatDate(selectedTransaction.created_at)}</p>
                                    </div>
                                    {selectedTransaction.validated_at && (
                                      <div>
                                        <label className="text-sm font-medium text-muted-foreground">Validado em</label>
                                        <p>{formatDate(selectedTransaction.validated_at)}</p>
                                      </div>
                                    )}
                                  </div>
                                  
                                  {selectedTransaction.status !== 'bloqueado' && (
                                    <div className="flex justify-end space-x-2 pt-4 border-t">
                                      <Button 
                                        variant="destructive" 
                                        size="sm"
                                        onClick={() => blockTransaction(selectedTransaction, 'Bloqueado pelo superadmin')}
                                      >
                                        <Ban className="h-4 w-4 mr-1" />
                                        Bloquear
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Top Provedores */}
            <Card>
              <CardHeader>
                <CardTitle>Top Provedores por Volume</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topProvedores.slice(0, 10).map((provedor, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">{provedor.nome_empresa}</div>
                          <div className="text-sm text-muted-foreground">
                            {provedor.total_pedidos} pedidos • {provedor.vouchers_utilizados} vouchers
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{formatCurrency(provedor.valor_total)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Atividade Semanal */}
            <Card>
              <CardHeader>
                <CardTitle>Atividade (7 dias)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">
                      {stats?.pedidos_7d || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Pedidos últimos 7 dias</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600">
                      {stats?.vouchers_7d || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Vouchers últimos 7 dias</div>
                  </div>

                  <div className="text-center pt-4 border-t">
                    <div className="text-lg font-medium">
                      Taxa de Conversão
                    </div>
                    <div className="text-2xl font-bold">
                      {stats?.total_pedidos ? 
                        ((stats.pedidos_validados / stats.total_pedidos) * 100).toFixed(1) : 
                        '0'
                      }%
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {stats?.pedidos_validados || 0} / {stats?.total_pedidos || 0} validados
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="suspicious">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5" />
                <span>Padrões Suspeitos Detectados</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {padroesSuspeitos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p>Nenhum padrão suspeito detectado no momento.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {padroesSuspeitos.map((padrao, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className="h-5 w-5 text-red-500" />
                          <div>
                            <h4 className="font-medium">
                              {padrao.tipo_suspeita.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {padrao.ocorrencias} ocorrências detectadas
                            </p>
                          </div>
                        </div>
                        <Badge variant="destructive">
                          Alto Risco
                        </Badge>
                      </div>
                      
                      <div className="mt-3">
                        <p className="text-sm font-medium mb-2">Clientes Envolvidos:</p>
                        <div className="flex flex-wrap gap-1">
                          {padrao.clientes_envolvidos.slice(0, 5).map((cliente, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {cliente}
                            </Badge>
                          ))}
                          {padrao.clientes_envolvidos.length > 5 && (
                            <Badge variant="outline" className="text-xs">
                              +{padrao.clientes_envolvidos.length - 5} mais
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
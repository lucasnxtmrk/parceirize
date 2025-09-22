'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/superadmin/ui/card'
import { Button } from '@/components/superadmin/ui/button'
import { Badge } from '@/components/superadmin/ui/badge'
import { Input } from '@/components/superadmin/ui/input'
import { Label } from '@/components/superadmin/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/superadmin/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/superadmin/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/superadmin/ui/dialog'
import { Alert, AlertDescription } from '@/components/superadmin/ui/alert'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/superadmin/ui/dropdown-menu'
import {
  DollarSign,
  CreditCard,
  Calendar,
  Download,
  Search,
  MoreHorizontal,
  Plus,
  AlertTriangle,
  CheckCircle,
  Clock,
  Building2
} from 'lucide-react'

export default function FinanceiroPage() {
  const { data: session, status } = useSession()
  const [provedores, setProvedores] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    receita_total: 0,
    receita_mensal: 0,
    provedores_pagos: 0,
    provedores_pendentes: 0,
    provedores_vencidos: 0
  })
  const [filters, setFilters] = useState({
    search: '',
    status_pagamento: '',
    plano: ''
  })
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedProvedor, setSelectedProvedor] = useState(null)
  const [paymentData, setPaymentData] = useState({
    valor: '',
    data_pagamento: '',
    metodo: 'transferencia',
    observacoes: '',
    meses_pagos: 1
  })
  const [alert, setAlert] = useState({ show: false, message: '', type: 'success' })

  useEffect(() => {
    if (session?.user?.role === 'superadmin') {
      fetchFinancialData()
    }
  }, [session, filters])

  const fetchFinancialData = async () => {
    try {
      setLoading(true)

      const params = new URLSearchParams(filters)
      const response = await fetch(`/api/superadmin/financeiro?${params}`)
      const data = await response.json()

      setProvedores(data.provedores || [])
      setStats(data.stats || {})

    } catch (error) {
      console.error('Erro ao carregar dados financeiros:', error)
    } finally {
      setLoading(false)
    }
  }

  const registerPayment = async () => {
    try {
      const response = await fetch(`/api/superadmin/provedores/${selectedProvedor.id}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          valor: parseFloat(paymentData.valor),
          data_pagamento: paymentData.data_pagamento,
          metodo: paymentData.metodo,
          observacoes: paymentData.observacoes,
          meses_pagos: parseInt(paymentData.meses_pagos)
        })
      })

      if (response.ok) {
        showAlert('Pagamento registrado com sucesso!', 'success')
        setShowPaymentModal(false)
        setSelectedProvedor(null)
        setPaymentData({
          valor: '',
          data_pagamento: '',
          metodo: 'transferencia',
          observacoes: '',
          meses_pagos: 1
        })
        fetchFinancialData()
      } else {
        const errorData = await response.json()
        showAlert(errorData.error || 'Erro ao registrar pagamento', 'error')
      }
    } catch (error) {
      console.error('Erro ao registrar pagamento:', error)
      showAlert('Erro interno do servidor', 'error')
    }
  }

  const updatePaymentStatus = async (provedorId, newStatus) => {
    try {
      const response = await fetch(`/api/superadmin/provedores/${provedorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status_pagamento: newStatus })
      })

      if (response.ok) {
        showAlert(`Status atualizado para ${newStatus}`, 'success')
        fetchFinancialData()
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
    }
  }

  const exportFinancialReport = async () => {
    try {
      const params = new URLSearchParams(filters)
      const response = await fetch(`/api/superadmin/financeiro/export?${params}`)
      const blob = await response.blob()

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `relatorio-financeiro-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Erro ao exportar relatório:', error)
    }
  }

  const showAlert = (message, type = 'success') => {
    setAlert({ show: true, message, type })
    setTimeout(() => setAlert({ show: false, message: '', type: 'success' }), 5000)
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const getStatusBadge = (status, dataVencimento) => {
    if (!dataVencimento) {
      return <Badge variant="secondary">Sem vencimento</Badge>
    }

    const vencimento = new Date(dataVencimento)
    const hoje = new Date()
    const diffDays = Math.ceil((vencimento - hoje) / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      return <Badge variant="destructive">Vencido ({Math.abs(diffDays)} dias)</Badge>
    } else if (diffDays <= 7) {
      return <Badge variant="outline" className="border-orange-500 text-orange-600">Vence em {diffDays} dias</Badge>
    } else if (diffDays <= 30) {
      return <Badge variant="outline" className="border-blue-500 text-blue-600">Vence em {diffDays} dias</Badge>
    } else {
      return <Badge variant="default">Em dia</Badge>
    }
  }

  const getPaymentStatusBadge = (status) => {
    switch (status) {
      case 'pago':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Pago</Badge>
      case 'pendente':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>
      case 'vencido':
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Vencido</Badge>
      default:
        return <Badge variant="secondary">Indefinido</Badge>
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex justify-center items-center" style={{ minHeight: '60vh' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (session?.user?.role !== 'superadmin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <h3 className="text-xl font-semibold text-foreground">Acesso Negado</h3>
        <p className="text-muted-foreground">Você não tem permissão para acessar esta área.</p>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4">
      {/* Alert */}
      {alert.show && (
        <Alert variant={alert.type === 'success' ? 'default' : 'destructive'} className="mb-6">
          <AlertDescription>{alert.message}</AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Controle Financeiro</h1>
          <p className="text-muted-foreground">
            Gerencie pagamentos e receitas dos provedores
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={exportFinancialReport} className="flex items-center space-x-2">
            <Download className="h-4 w-4" />
            <span>Exportar Relatório</span>
          </Button>
        </div>
      </div>

      {/* Cards de Estatísticas Financeiras */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <Card className="hover-card">
          <CardContent className="flex items-center p-6">
            <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-green-100 dark:bg-green-900/20 mr-4">
              <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Receita Total</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(stats.receita_total || 0)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-card">
          <CardContent className="flex items-center p-6">
            <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900/20 mr-4">
              <CreditCard className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Receita Mensal</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {formatCurrency(stats.receita_mensal || 0)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-card">
          <CardContent className="flex items-center p-6">
            <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-green-100 dark:bg-green-900/20 mr-4">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Provedores Pagos</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {stats.provedores_pagos || 0}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-card">
          <CardContent className="flex items-center p-6">
            <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-yellow-100 dark:bg-yellow-900/20 mr-4">
              <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Pendentes</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {stats.provedores_pendentes || 0}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-card">
          <CardContent className="flex items-center p-6">
            <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-red-100 dark:bg-red-900/20 mr-4">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Vencidos</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {stats.provedores_vencidos || 0}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="h-5 w-5" />
            <span>Filtros</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Buscar Provedor</Label>
              <Input
                type="text"
                placeholder="Nome da empresa ou email"
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Status de Pagamento</Label>
              <Select
                value={filters.status_pagamento || "all"}
                onValueChange={(value) => setFilters(prev => ({ ...prev, status_pagamento: value === "all" ? "" : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="pago">Pagos</SelectItem>
                  <SelectItem value="pendente">Pendentes</SelectItem>
                  <SelectItem value="vencido">Vencidos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button
                variant="outline"
                onClick={() => setFilters({ search: '', status_pagamento: '', plano: '' })}
                className="w-full"
              >
                Limpar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Provedores */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Building2 className="h-5 w-5" />
            <span>Provedores e Pagamentos</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provedor</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status Pagamento</TableHead>
                  <TableHead>Último Pagamento</TableHead>
                  <TableHead>Valor Mensal</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {provedores.map((provedor) => (
                  <TableRow key={provedor.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-semibold">{provedor.nome_empresa}</div>
                        <div className="text-sm text-muted-foreground">{provedor.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{provedor.plano_nome}</Badge>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(provedor.status_pagamento, provedor.data_vencimento)}
                      {provedor.data_vencimento && (
                        <div className="text-sm text-muted-foreground mt-1">
                          {formatDate(provedor.data_vencimento)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {getPaymentStatusBadge(provedor.status_pagamento)}
                    </TableCell>
                    <TableCell>
                      {provedor.ultimo_pagamento ? (
                        <div className="space-y-1">
                          <div className="text-sm font-medium">
                            {formatDate(provedor.ultimo_pagamento)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatCurrency(provedor.valor_ultimo_pagamento || 0)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Nenhum pagamento</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold">
                        {formatCurrency(provedor.plano_preco || 0)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedProvedor(provedor)
                              setPaymentData(prev => ({
                                ...prev,
                                valor: provedor.plano_preco?.toString() || '',
                                data_pagamento: new Date().toISOString().split('T')[0]
                              }))
                              setShowPaymentModal(true)
                            }}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Registrar Pagamento
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updatePaymentStatus(provedor.id, 'pago')}>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Marcar como Pago
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updatePaymentStatus(provedor.id, 'pendente')}>
                            <Clock className="h-4 w-4 mr-2" />
                            Marcar como Pendente
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {provedores.length === 0 && !loading && (
            <div className="text-center py-12 space-y-4">
              <DollarSign className="h-12 w-12 text-muted-foreground mx-auto" />
              <div className="space-y-2">
                <h5 className="text-lg font-semibold text-muted-foreground">Nenhum provedor encontrado</h5>
                <p className="text-muted-foreground">Ajuste os filtros para refinar sua busca.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Registrar Pagamento */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pagamento</DialogTitle>
            <DialogDescription>
              {selectedProvedor && (
                <>
                  Registrando pagamento para: <strong>{selectedProvedor.nome_empresa}</strong>
                  <br />
                  Plano atual: <Badge variant="secondary">{selectedProvedor.plano_nome}</Badge>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedProvedor && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor do Pagamento</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={paymentData.valor}
                    onChange={(e) => setPaymentData(prev => ({ ...prev, valor: e.target.value }))}
                    placeholder="0,00"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Data do Pagamento</Label>
                  <Input
                    type="date"
                    value={paymentData.data_pagamento}
                    onChange={(e) => setPaymentData(prev => ({ ...prev, data_pagamento: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Método de Pagamento</Label>
                  <Select
                    value={paymentData.metodo || "transferencia"}
                    onValueChange={(value) => setPaymentData(prev => ({ ...prev, metodo: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="transferencia">Transferência Bancária</SelectItem>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="cartao">Cartão de Crédito</SelectItem>
                      <SelectItem value="boleto">Boleto</SelectItem>
                      <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Meses Pagos</Label>
                  <Input
                    type="number"
                    min="1"
                    max="12"
                    value={paymentData.meses_pagos}
                    onChange={(e) => setPaymentData(prev => ({ ...prev, meses_pagos: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Observações (opcional)</Label>
                <Input
                  type="text"
                  value={paymentData.observacoes}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, observacoes: e.target.value }))}
                  placeholder="Observações sobre o pagamento..."
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentModal(false)}>
              Cancelar
            </Button>
            <Button onClick={registerPayment}>
              Registrar Pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
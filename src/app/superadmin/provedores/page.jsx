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
import { Building2, Filter, Download, Search, Eye, Edit, MoreHorizontal, Plus, DollarSign } from 'lucide-react'
import Link from 'next/link'

export default function ProvedoresPage() {
  const { data: session, status } = useSession()
  const [provedores, setProvedores] = useState([])
  const [planos, setPlanos] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    ativos: 0,
    inativos: 0,
    vencimento_proximo: 0
  })
  const [filters, setFilters] = useState({
    search: '',
    plano: '',
    status: '',
    vencimento: ''
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 0
  })
  const [showModal, setShowModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedProvedor, setSelectedProvedor] = useState(null)
  const [editForm, setEditForm] = useState({
    nome_empresa: '',
    email: '',
    subdominio: '',
    ativo: true
  })
  const [subdomainValidation, setSubdomainValidation] = useState({ valid: true, message: '' })
  const [validatingSubdomain, setValidatingSubdomain] = useState(false)
  const [alert, setAlert] = useState({ show: false, message: '', type: 'success' })

  useEffect(() => {
    if (session?.user?.role === 'superadmin') {
      fetchPlanos()
      fetchProvedores()
    }
  }, [session, filters, pagination.page])

  const fetchPlanos = async () => {
    try {
      const response = await fetch('/api/superadmin/planos')
      const data = await response.json()
      setPlanos(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Erro ao carregar planos:', error)
      setPlanos([])
    }
  }

  const fetchProvedores = async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...filters
      })

      const response = await fetch(`/api/superadmin/provedores-details?${params}`)
      const data = await response.json()
      
      setProvedores(data.provedores || [])
      setStats(data.stats || { total: 0, ativos: 0, inativos: 0, vencimento_proximo: 0 })
      setPagination(prev => ({
        ...prev,
        total: data.total || 0,
        totalPages: data.totalPages || 0
      }))
      
    } catch (error) {
      console.error('Erro ao carregar provedores:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key, value) => {
    // Converte "all" para string vazia para manter compatibilidade com a API
    const apiValue = value === "all" ? "" : value
    setFilters(prev => ({ ...prev, [key]: apiValue }))
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const clearFilters = () => {
    setFilters({
      search: '',
      plano: '',
      status: '',
      vencimento: ''
    })
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const toggleProviderStatus = async (providerId, currentStatus) => {
    try {
      const response = await fetch(`/api/superadmin/provedores/${providerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ativo: !currentStatus })
      })

      if (response.ok) {
        showAlert(`Provedor ${!currentStatus ? 'ativado' : 'desativado'} com sucesso!`, 'success')
        fetchProvedores()
      } else {
        throw new Error('Erro ao alterar status')
      }
    } catch (error) {
      console.error('Erro ao alterar status:', error)
      showAlert('Erro ao alterar status do provedor', 'danger')
    }
  }

  const updatePlano = async (providerId, novoPlanoId) => {
    try {
      const response = await fetch(`/api/superadmin/provedores/${providerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plano_id: novoPlanoId })
      })

      if (response.ok) {
        showAlert('Plano atualizado com sucesso!', 'success')
        setShowModal(false)
        setSelectedProvedor(null)
        fetchProvedores()
      } else {
        throw new Error('Erro ao atualizar plano')
      }
    } catch (error) {
      console.error('Erro ao atualizar plano:', error)
      showAlert('Erro ao atualizar plano do provedor', 'danger')
    }
  }

  const extenderVencimento = async (providerId, meses) => {
    try {
      const response = await fetch(`/api/superadmin/provedores/${providerId}/extend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meses })
      })

      if (response.ok) {
        showAlert(`Vencimento estendido por ${meses} meses!`, 'success')
        fetchProvedores()
      } else {
        throw new Error('Erro ao estender vencimento')
      }
    } catch (error) {
      console.error('Erro ao estender vencimento:', error)
      showAlert('Erro ao estender vencimento', 'danger')
    }
  }

  const exportProvedores = async () => {
    try {
      const params = new URLSearchParams(filters)
      const response = await fetch(`/api/superadmin/provedores/export?${params}`)
      const blob = await response.blob()
      
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `provedores-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Erro ao exportar provedores:', error)
    }
  }

  const validateSubdomain = async (subdomain) => {
    if (!subdomain || subdomain.trim() === '') {
      setSubdomainValidation({ valid: true, message: '' })
      return
    }

    setValidatingSubdomain(true)
    try {
      const response = await fetch('/api/superadmin/validate-subdomain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subdominio: subdomain.trim(),
          provedor_id: selectedProvedor?.id
        })
      })

      const data = await response.json()

      console.log('🔍 Frontend - Validate subdomain response:', {
        status: response.status,
        ok: response.ok,
        data
      });

      if (data.valid) {
        setSubdomainValidation({
          valid: true,
          message: `✓ ${data.domain_preview} disponível!`
        })
      } else {
        setSubdomainValidation({
          valid: false,
          message: data.error || 'Subdomínio inválido'
        })
      }
    } catch (error) {
      console.error('Erro ao validar subdomínio:', error)
      setSubdomainValidation({
        valid: false,
        message: 'Erro ao validar subdomínio'
      })
    } finally {
      setValidatingSubdomain(false)
    }
  }

  const openEditModal = (provedor) => {
    setSelectedProvedor(provedor)
    setEditForm({
      nome_empresa: provedor.nome_empresa || '',
      email: provedor.email || '',
      subdominio: provedor.subdominio || '',
      ativo: provedor.ativo
    })
    setSubdomainValidation({ valid: true, message: '' })
    setShowEditModal(true)
  }

  const handleEditSubmit = async () => {
    if (!subdomainValidation.valid && editForm.subdominio.trim() !== '') {
      showAlert('Corrija o subdomínio antes de salvar', 'danger')
      return
    }

    try {
      const updateData = {
        subdominio: editForm.subdominio.trim() || null,
        ativo: editForm.ativo
      }

      const response = await fetch(`/api/superadmin/provedores/${selectedProvedor.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })

      if (response.ok) {
        showAlert('Provedor atualizado com sucesso!', 'success')
        setShowEditModal(false)
        setSelectedProvedor(null)
        fetchProvedores()
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao atualizar provedor')
      }
    } catch (error) {
      console.error('Erro ao atualizar provedor:', error)
      showAlert(error.message || 'Erro ao atualizar provedor', 'danger')
    }
  }

  const showAlert = (message, type = 'success') => {
    setAlert({ show: true, message, type })
    setTimeout(() => setAlert({ show: false, message: '', type: 'success' }), 5000)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const getStatusBadge = (ativo) => {
    return (
      <Badge variant={ativo ? 'default' : 'destructive'}>
        {ativo ? 'Ativo' : 'Inativo'}
      </Badge>
    )
  }

  const getVencimentoBadge = (dataVencimento) => {
    if (!dataVencimento) return <Badge variant="secondary">Sem vencimento</Badge>
    
    const vencimento = new Date(dataVencimento)
    const hoje = new Date()
    const diffTime = vencimento - hoje
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) {
      return <Badge variant="destructive">Vencido</Badge>
    } else if (diffDays <= 7) {
      return <Badge variant="outline" className="border-orange-500 text-orange-600">Vence em {diffDays} dias</Badge>
    } else if (diffDays <= 30) {
      return <Badge variant="outline" className="border-blue-500 text-blue-600">Vence em {diffDays} dias</Badge>
    } else {
      return <Badge variant="default">Vigente</Badge>
    }
  }

  const renderPagination = () => {
    if (pagination.totalPages <= 1) return null

    const current = pagination.page
    const total = pagination.totalPages

    return (
      <div className="flex justify-center items-center space-x-2 mt-6">
        <Button
          variant="outline"
          size="sm"
          disabled={current <= 1}
          onClick={() => setPagination(prev => ({ ...prev, page: current - 1 }))}
        >
          Anterior
        </Button>
        
        <div className="flex items-center space-x-1">
          {current > 3 && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPagination(prev => ({ ...prev, page: 1 }))}
              >
                1
              </Button>
              {current > 4 && <span className="px-2">...</span>}
            </>
          )}
          
          {Array.from(
            { length: Math.min(5, total) },
            (_, i) => Math.max(1, current - 2) + i
          ).filter(page => page <= total).map(page => (
            <Button
              key={page}
              variant={page === current ? "default" : "ghost"}
              size="sm"
              onClick={() => setPagination(prev => ({ ...prev, page }))}
            >
              {page}
            </Button>
          ))}
          
          {current < total - 2 && (
            <>
              {current < total - 3 && <span className="px-2">...</span>}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPagination(prev => ({ ...prev, page: total }))}
              >
                {total}
              </Button>
            </>
          )}
        </div>
        
        <Button
          variant="outline"
          size="sm"
          disabled={current >= total}
          onClick={() => setPagination(prev => ({ ...prev, page: current + 1 }))}
        >
          Próxima
        </Button>
      </div>
    )
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
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Provedores</h1>
          <p className="text-muted-foreground">
            Controle completo de todos os provedores da plataforma
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={exportProvedores} className="flex items-center space-x-2">
            <Download className="h-4 w-4" />
            <span>Exportar CSV</span>
          </Button>
          <Button asChild className="flex items-center space-x-2">
            <Link href="/superadmin/provedores/cadastrar">
              <Plus className="h-4 w-4" />
              <span>Novo Provedor</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="hover-card">
          <CardContent className="flex items-center p-6">
            <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900/20 mr-4">
              <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total de Provedores</p>
              <p className="text-2xl font-bold">{stats.total?.toLocaleString('pt-BR') || 0}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover-card">
          <CardContent className="flex items-center p-6">
            <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-green-100 dark:bg-green-900/20 mr-4">
              <Building2 className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Provedores Ativos</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.ativos?.toLocaleString('pt-BR') || 0}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover-card">
          <CardContent className="flex items-center p-6">
            <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-red-100 dark:bg-red-900/20 mr-4">
              <Building2 className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Provedores Inativos</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.inativos?.toLocaleString('pt-BR') || 0}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover-card">
          <CardContent className="flex items-center p-6">
            <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-orange-100 dark:bg-orange-900/20 mr-4">
              <Building2 className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Vencimento Próximo</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.vencimento_proximo?.toLocaleString('pt-BR') || 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filtros de Busca</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Buscar Provedor</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Nome da empresa ou email"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Plano</Label>
              <Select value={filters.plano || "all"} onValueChange={(value) => handleFilterChange('plano', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os planos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os planos</SelectItem>
                  {planos.map(plano => (
                    <SelectItem key={plano.id} value={plano.id?.toString() || plano.id}>
                      {plano.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filters.status || "all"} onValueChange={(value) => handleFilterChange('status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="ativo">Ativos</SelectItem>
                  <SelectItem value="inativo">Inativos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Vencimento</Label>
              <Select value={filters.vencimento || "all"} onValueChange={(value) => handleFilterChange('vencimento', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="vencido">Vencidos</SelectItem>
                  <SelectItem value="proximo">Próximo ao vencimento</SelectItem>
                  <SelectItem value="vigente">Vigentes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button variant="outline" onClick={clearFilters} className="w-full">
                Limpar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Provedores */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center space-x-2">
              <Building2 className="h-5 w-5" />
              <span>Lista de Provedores</span>
            </CardTitle>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">
                Mostrando {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total?.toLocaleString('pt-BR')}
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    {pagination.limit} por página
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setPagination(prev => ({ ...prev, limit: 10, page: 1 }))}>
                    10 por página
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setPagination(prev => ({ ...prev, limit: 25, page: 1 }))}>
                    25 por página
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setPagination(prev => ({ ...prev, limit: 50, page: 1 }))}>
                    50 por página
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Subdomínio</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Clientes</TableHead>
                  <TableHead>Parceiros</TableHead>
                  <TableHead>Receita</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {provedores.map((provedor) => (
                  <TableRow key={provedor.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center h-10 w-10 rounded-full bg-secondary/10">
                          <Building2 className="h-4 w-4" />
                        </div>
                        <div className="space-y-1">
                          <div className="font-semibold">{provedor.nome_empresa}</div>
                          <div className="text-sm text-muted-foreground">{provedor.email}</div>
                          <div className="text-sm text-muted-foreground">{provedor.telefone}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {provedor.subdominio ? (
                        <div className="space-y-1">
                          <Badge variant="outline" className="font-mono">
                            {provedor.subdominio}
                          </Badge>
                          <div className="text-xs text-muted-foreground">
                            {provedor.subdominio}.parceirize.com.br
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Sem subdomínio</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={provedor.plano_nome === 'Enterprise' ? 'default' : 
                                provedor.plano_nome === 'Profissional' ? 'secondary' : 'outline'}
                        className="mb-1"
                      >
                        {provedor.plano_nome}
                      </Badge>
                      <div className="text-sm text-muted-foreground">
                        {formatCurrency(provedor.plano_preco)}/mês
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(provedor.ativo)}
                    </TableCell>
                    <TableCell>
                      {getVencimentoBadge(provedor.data_vencimento)}
                      {provedor.data_vencimento && (
                        <div className="text-sm text-muted-foreground mt-1">
                          {formatDate(provedor.data_vencimento)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold">{provedor.total_clientes || 0}</span>
                      {provedor.plano_limite_clientes && (
                        <div className="text-sm text-muted-foreground">
                          Limite: {provedor.plano_limite_clientes}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold">{provedor.total_parceiros || 0}</span>
                      {provedor.plano_limite_parceiros && (
                        <div className="text-sm text-muted-foreground">
                          Limite: {provedor.plano_limite_parceiros}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <span className="font-semibold">{formatCurrency(provedor.receita_mensal || 0)}</span>
                        <div className="text-sm text-green-600">
                          {formatCurrency((provedor.receita_mensal || 0) * 12)}/ano
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditModal(provedor)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar Provedor
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleProviderStatus(provedor.id, provedor.ativo)}>
                            {provedor.ativo ? 'Suspender' : 'Ativar'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setSelectedProvedor(provedor); setShowModal(true); }}>
                            Alterar Plano
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => extenderVencimento(provedor.id, 1)}>
                            Extender +1 mês
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/superadmin/provedores/${provedor.id}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver Detalhes
                            </Link>
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
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto" />
              <div className="space-y-2">
                <h5 className="text-lg font-semibold text-muted-foreground">Nenhum provedor encontrado</h5>
                <p className="text-muted-foreground">Ajuste os filtros para refinar sua busca.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {renderPagination()}

      {/* Dialog para Editar Provedor */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="!max-w-[700px] max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full flex flex-col">
          <DialogHeader className="pb-6">
            <DialogTitle className="flex items-center space-x-3 text-xl">
              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10">
                <Edit className="h-5 w-5 text-primary" />
              </div>
              <span>Editar Provedor</span>
            </DialogTitle>
            <DialogDescription className="text-base">
              {selectedProvedor && (
                <>
                  Editando dados do provedor: <strong className="text-foreground">{selectedProvedor.nome_empresa}</strong>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedProvedor && (
            <div className="space-y-8 py-4">
              {/* Seção Informações da Empresa */}
              <div className="space-y-6">
                <div className="flex items-center space-x-2 pb-2 border-b">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <h3 className="text-lg font-semibold">Informações da Empresa</h3>
                </div>

                <div className="space-y-6">
                  <div className="w-full space-y-3">
                    <Label className="block text-sm font-medium">Nome da Empresa</Label>
                    <Input
                      value={editForm.nome_empresa}
                      disabled
                      className="bg-muted/50 h-11 w-full block"
                    />
                    <p className="text-xs text-muted-foreground block">
                      Nome da empresa não pode ser alterado
                    </p>
                  </div>

                  <div className="w-full space-y-3">
                    <Label className="block text-sm font-medium">E-mail</Label>
                    <Input
                      value={editForm.email}
                      disabled
                      className="bg-muted/50 h-11 w-full block"
                    />
                    <p className="text-xs text-muted-foreground block">
                      E-mail não pode ser alterado
                    </p>
                  </div>
                </div>
              </div>

              {/* Seção Configurações */}
              <div className="space-y-6">
                <div className="flex items-center space-x-2 pb-2 border-b">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <h3 className="text-lg font-semibold">Configurações</h3>
                </div>

                <div className="space-y-6">
                  <div className="w-full space-y-3">
                    <Label className="block text-sm font-medium">Subdomínio Personalizado</Label>
                    <div className="space-y-3">
                      <Input
                        placeholder="meuclube"
                        value={editForm.subdominio}
                        onChange={(e) => {
                          const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
                          setEditForm(prev => ({ ...prev, subdominio: value }))
                          if (value !== selectedProvedor.subdominio) {
                            validateSubdomain(value)
                          } else {
                            setSubdomainValidation({ valid: true, message: '' })
                          }
                        }}
                        className={`h-11 w-full block ${!subdomainValidation.valid ? 'border-red-500' : ''}`}
                      />
                      {validatingSubdomain && (
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                          <span>Validando disponibilidade...</span>
                        </div>
                      )}
                      {subdomainValidation.message && (
                        <div className={`p-3 rounded-lg text-sm block ${
                          subdomainValidation.valid
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                          {subdomainValidation.message}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground block">
                        Deixe vazio se não quiser subdomínio personalizado
                      </p>
                    </div>
                  </div>

                  <div className="w-full space-y-3">
                    <Label className="block text-sm font-medium">Status da Conta</Label>
                    <Select
                      value={editForm.ativo ? "true" : "false"}
                      onValueChange={(value) => setEditForm(prev => ({ ...prev, ativo: value === "true" }))}
                    >
                      <SelectTrigger className="h-11 w-full block">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span>Ativo</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="false">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            <span>Inativo</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground block">
                      Contas inativas não podem acessar o sistema
                    </p>
                  </div>
                </div>
              </div>

              {/* Preview do domínio */}
              {editForm.subdominio && subdomainValidation.valid && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 pb-2 border-b">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                    <h3 className="text-lg font-semibold">Prévia dos Domínios</h3>
                  </div>

                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
                    <p className="text-sm text-muted-foreground mb-4">
                      Estes serão os endereços que seus usuários irão acessar:
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3 p-3 bg-white rounded-lg border">
                        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100">
                          <Building2 className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">Painel Administrativo</p>
                          <p className="text-sm text-blue-600 font-mono">
                            https://{editForm.subdominio}.parceirize.com.br/dashboard
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 p-3 bg-white rounded-lg border">
                        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-green-100">
                          <Building2 className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">Painel de Parceiros</p>
                          <p className="text-sm text-green-600 font-mono">
                            https://{editForm.subdominio}.parceirize.com.br/painel
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 p-3 bg-white rounded-lg border">
                        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-purple-100">
                          <Building2 className="h-4 w-4 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">Carteirinha Digital</p>
                          <p className="text-sm text-purple-600 font-mono">
                            https://{editForm.subdominio}.parceirize.com.br/carteirinha
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="pt-6 border-t">
            <Button variant="outline" onClick={() => setShowEditModal(false)} className="px-6">
              Cancelar
            </Button>
            <Button
              onClick={handleEditSubmit}
              disabled={!subdomainValidation.valid && editForm.subdominio.trim() !== ''}
              className="px-6"
            >
              <Edit className="h-4 w-4 mr-2" />
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para Alterar Plano */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="!max-w-[600px] w-[95vw] sm:w-full flex flex-col">
          <DialogHeader className="pb-6">
            <DialogTitle className="flex items-center space-x-3 text-xl">
              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-green-100">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <span>Alterar Plano do Provedor</span>
            </DialogTitle>
            <DialogDescription className="text-base">
              {selectedProvedor && (
                <>
                  Alterando plano do provedor: <strong className="text-foreground">{selectedProvedor.nome_empresa}</strong>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedProvedor && (
            <div className="space-y-6 py-4">
              {/* Plano Atual */}
              <div className="bg-muted/50 p-4 rounded-lg border">
                <h3 className="font-semibold mb-3 flex items-center space-x-2">
                  <Badge variant="secondary" className="text-sm">ATUAL</Badge>
                  <span>Plano Vigente</span>
                </h3>
                <div className="space-y-4">
                  <div className="w-full">
                    <p className="text-sm text-muted-foreground block">Nome do Plano</p>
                    <p className="font-semibold block">{selectedProvedor.plano_nome}</p>
                  </div>
                  <div className="w-full">
                    <p className="text-sm text-muted-foreground block">Valor Mensal</p>
                    <p className="font-semibold text-green-600 block">{formatCurrency(selectedProvedor.plano_preco)}</p>
                  </div>
                </div>
              </div>

              {/* Novo Plano */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2 pb-2 border-b">
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                  <h3 className="text-lg font-semibold">Selecionar Novo Plano</h3>
                </div>

                <div className="w-full space-y-3">
                  <Label className="block text-sm font-medium">Planos Disponíveis</Label>
                  <Select
                    onValueChange={(value) => {
                      if (value) {
                        updatePlano(selectedProvedor.id, value)
                      }
                    }}
                  >
                    <SelectTrigger className="h-12 w-full block">
                      <SelectValue placeholder="Selecione um novo plano..." />
                    </SelectTrigger>
                    <SelectContent>
                      {planos.filter(p => p.id !== selectedProvedor.plano_id).map(plano => (
                        <SelectItem key={plano.id} value={plano.id?.toString() || plano.id}>
                          <div className="w-full py-1">
                            <div className="font-medium block">{plano.nome}</div>
                            <div className="text-sm text-muted-foreground block">
                              {formatCurrency(plano.preco)}/mês • {plano.limite_clientes ? `${plano.limite_clientes} clientes` : 'Ilimitado'}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground block">
                    A alteração será aplicada imediatamente e afetará o próximo ciclo de cobrança
                  </p>
                </div>
              </div>

              {/* Aviso */}
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <div className="flex items-start space-x-3">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100">
                    <Building2 className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-blue-900">Importante</p>
                    <p className="text-sm text-blue-700">
                      A mudança de plano será aplicada imediatamente. Os limites e recursos do novo plano
                      entrarão em vigor após a confirmação.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-6 border-t">
            <Button variant="outline" onClick={() => setShowModal(false)} className="px-6">
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
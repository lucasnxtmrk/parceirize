'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/superadmin/ui/card'
import { Button } from '@/components/superadmin/ui/button'
import { Badge } from '@/components/superadmin/ui/badge'
import { Input } from '@/components/superadmin/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/superadmin/ui/table'
import { Users, Filter, Download, Search, ChevronDown, Eye } from 'lucide-react'
import Link from 'next/link'

export default function ClientesGlobalPage() {
  const { data: session, status } = useSession()
  const [clientes, setClientes] = useState([])
  const [provedores, setProvedores] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    ativos: 0,
    inativos: 0,
    novos_mes: 0
  })
  const [filters, setFilters] = useState({
    search: '',
    provedor: '',
    status: '',
    plano: ''
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  })

  useEffect(() => {
    if (session?.user?.role === 'superadmin') {
      fetchProvedores()
      fetchClientes()
    }
  }, [session, filters, pagination.page])

  const fetchProvedores = async () => {
    try {
      const response = await fetch('/api/superadmin/provedores')
      const data = await response.json()
      setProvedores(data)
    } catch (error) {
      console.error('Erro ao carregar provedores:', error)
    }
  }

  const fetchClientes = async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...filters
      })

      const response = await fetch(`/api/superadmin/clientes?${params}`)
      const data = await response.json()
      
      setClientes(data.clientes || [])
      setStats(data.stats || { total: 0, ativos: 0, inativos: 0, pendentes: 0 })
      setPagination(prev => ({
        ...prev,
        total: data.total || 0,
        totalPages: data.totalPages || 0
      }))
      
    } catch (error) {
      console.error('Erro ao carregar clientes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const clearFilters = () => {
    setFilters({
      search: '',
      provedor: '',
      status: '',
      plano: ''
    })
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const exportClientes = async () => {
    try {
      const params = new URLSearchParams(filters)
      const response = await fetch(`/api/superadmin/clientes/export?${params}`)
      const blob = await response.blob()
      
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `clientes-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Erro ao exportar clientes:', error)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const getStatusBadge = (ativo) => {
    return (
      <Badge bg={ativo ? 'success' : 'danger'}>
        {ativo ? 'Ativo' : 'Inativo'}
      </Badge>
    )
  }

  const renderPagination = () => {
    if (pagination.totalPages <= 1) return null

    const items = []
    const current = pagination.page
    const total = pagination.totalPages

    // Primeira página
    if (current > 3) {
      items.push(
        <Pagination.Item key={1} onClick={() => setPagination(prev => ({ ...prev, page: 1 }))}>
          1
        </Pagination.Item>
      )
      if (current > 4) items.push(<Pagination.Ellipsis key="start-ellipsis" />)
    }

    // Páginas ao redor da atual
    for (let i = Math.max(1, current - 2); i <= Math.min(total, current + 2); i++) {
      items.push(
        <Pagination.Item
          key={i}
          active={i === current}
          onClick={() => setPagination(prev => ({ ...prev, page: i }))}
        >
          {i}
        </Pagination.Item>
      )
    }

    // Última página
    if (current < total - 2) {
      if (current < total - 3) items.push(<Pagination.Ellipsis key="end-ellipsis" />)
      items.push(
        <Pagination.Item key={total} onClick={() => setPagination(prev => ({ ...prev, page: total }))}>
          {total}
        </Pagination.Item>
      )
    }

    return (
      <div className="d-flex justify-content-center mt-4">
        <Pagination>
          <Pagination.Prev
            disabled={current <= 1}
            onClick={() => setPagination(prev => ({ ...prev, page: current - 1 }))}
          />
          {items}
          <Pagination.Next
            disabled={current >= total}
            onClick={() => setPagination(prev => ({ ...prev, page: current + 1 }))}
          />
        </Pagination>
      </div>
    )
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
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
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Clientes</h1>
          <p className="text-muted-foreground">
            Visualização completa de todos os clientes da plataforma
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={exportClientes} className="flex items-center space-x-2">
            <Download className="h-4 w-4" />
            <span>Exportar CSV</span>
          </Button>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="hover-card">
          <CardContent className="flex items-center p-6">
            <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900/20 mr-4">
              <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total de Clientes</p>
              <p className="text-2xl font-bold">{stats.total?.toLocaleString('pt-BR') || 0}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover-card">
          <CardContent className="flex items-center p-6">
            <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-green-100 dark:bg-green-900/20 mr-4">
              <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Clientes Ativos</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.ativos?.toLocaleString('pt-BR') || 0}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover-card">
          <CardContent className="flex items-center p-6">
            <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-red-100 dark:bg-red-900/20 mr-4">
              <Users className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Clientes Inativos</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.inativos?.toLocaleString('pt-BR') || 0}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover-card">
          <CardContent className="flex items-center p-6">
            <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-purple-100 dark:bg-purple-900/20 mr-4">
              <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Novos este Mês</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.novos_mes?.toLocaleString('pt-BR') || 0}</p>
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
              <label className="text-sm font-medium">Buscar Cliente</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Nome, email ou CPF"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Provedor</label>
              <select
                className="w-full h-10 px-3 py-2 text-sm bg-background border border-input rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={filters.provedor}
                onChange={(e) => handleFilterChange('provedor', e.target.value)}
              >
                <option value="">Todos os provedores</option>
                {provedores.map(provedor => (
                  <option key={provedor.id} value={provedor.id}>
                    {provedor.nome_empresa}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <select
                className="w-full h-10 px-3 py-2 text-sm bg-background border border-input rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="">Todos</option>
                <option value="ativo">Ativos</option>
                <option value="inativo">Inativos</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Plano</label>
              <select
                className="w-full h-10 px-3 py-2 text-sm bg-background border border-input rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={filters.plano}
                onChange={(e) => handleFilterChange('plano', e.target.value)}
              >
                <option value="">Todos os planos</option>
                <option value="basico">Básico</option>
                <option value="profissional">Profissional</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">&nbsp;</label>
              <Button variant="outline" onClick={clearFilters} className="w-full">
                Limpar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Clientes */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Lista de Clientes</span>
            </CardTitle>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">
                Mostrando {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total?.toLocaleString('pt-BR')}
              </span>
              <select
                className="h-8 px-3 py-1 text-sm bg-background border border-input rounded-md"
                value={pagination.limit}
                onChange={(e) => setPagination(prev => ({ ...prev, limit: parseInt(e.target.value), page: 1 }))}
              >
                <option value={25}>25 por página</option>
                <option value={50}>50 por página</option>
                <option value={100}>100 por página</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Provedor</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Cadastro</TableHead>
                <TableHead>Último Acesso</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientes.map((cliente) => (
                <TableRow key={cliente.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10">
                        <Users className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{cliente.nome}</div>
                        <div className="text-sm text-muted-foreground">{cliente.email}</div>
                        {cliente.cpf && <div className="text-xs text-muted-foreground">{cliente.cpf}</div>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{cliente.provedor_nome}</div>
                      <Badge 
                        variant={cliente.provedor_plano === 'Enterprise' ? 'default' : 
                                cliente.provedor_plano === 'Profissional' ? 'secondary' : 'outline'}
                        className="text-xs"
                      >
                        {cliente.provedor_plano}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {cliente.plano_nome || 'Padrão'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={cliente.ativo ? 'default' : 'destructive'}>
                      {cliente.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(cliente.created_at)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {cliente.ultimo_acesso ? formatDate(cliente.ultimo_acesso) : 'Nunca'}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        window.open(`/superadmin/clientes/${cliente.id}`, '_blank')
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {clientes.length === 0 && !loading && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Nenhum cliente encontrado</h3>
              <p className="text-muted-foreground">Ajuste os filtros para refinar sua busca.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Paginação */}
      {renderPagination()}
    </div>
  )
}
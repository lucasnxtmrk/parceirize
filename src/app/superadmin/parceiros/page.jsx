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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/superadmin/ui/dropdown-menu'
import { Store, Filter, Download, Search, Eye, MoreHorizontal, CheckCircle, XCircle } from 'lucide-react'
import Link from 'next/link'

export default function ParceirosGlobalPage() {
  const { data: session, status } = useSession()
  const [parceiros, setParceiros] = useState([])
  const [provedores, setProvedores] = useState([])
  const [nichos, setNichos] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    ativos: 0,
    inativos: 0,
    aprovados: 0
  })
  const [filters, setFilters] = useState({
    search: '',
    provedor: '',
    status: '',
    nicho: '',
    aprovacao: ''
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
      fetchNichos()
      fetchParceiros()
    }
  }, [session, filters, pagination.page])

  const fetchProvedores = async () => {
    try {
      const response = await fetch('/api/superadmin/provedores')
      const data = await response.json()
      setProvedores(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Erro ao carregar provedores:', error)
      setProvedores([])
    }
  }

  const fetchNichos = async () => {
    try {
      const response = await fetch('/api/nichos')
      const data = await response.json()
      setNichos(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Erro ao carregar nichos:', error)
      setNichos([])
    }
  }

  const fetchParceiros = async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...filters
      })

      const response = await fetch(`/api/superadmin/parceiros?${params}`)
      const data = await response.json()
      
      setParceiros(data.parceiros || [])
      setStats(data.stats || { total: 0, ativos: 0, inativos: 0, aprovados: 0 })
      setPagination(prev => ({
        ...prev,
        total: data.total || 0,
        totalPages: data.totalPages || 0
      }))
      
    } catch (error) {
      console.error('Erro ao carregar parceiros:', error)
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
      provedor: '',
      status: '',
      nicho: '',
      aprovacao: ''
    })
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const exportParceiros = async () => {
    try {
      const params = new URLSearchParams(filters)
      const response = await fetch(`/api/superadmin/parceiros/export?${params}`)
      const blob = await response.blob()
      
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `parceiros-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Erro ao exportar parceiros:', error)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const getStatusBadge = (ativo) => {
    return (
      <Badge variant={ativo ? 'default' : 'destructive'}>
        {ativo ? 'Ativo' : 'Inativo'}
      </Badge>
    )
  }

  const getAprovacaoBadge = (aprovado) => {
    return (
      <Badge variant={aprovado ? 'default' : 'secondary'}>
        {aprovado ? 'Aprovado' : 'Pendente'}
      </Badge>
    )
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
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Parceiros</h1>
          <p className="text-muted-foreground">
            Visualização completa de todos os parceiros da plataforma
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={exportParceiros} className="flex items-center space-x-2">
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
              <Store className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total de Parceiros</p>
              <p className="text-2xl font-bold">{stats.total?.toLocaleString('pt-BR') || 0}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover-card">
          <CardContent className="flex items-center p-6">
            <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-green-100 dark:bg-green-900/20 mr-4">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Parceiros Ativos</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.ativos?.toLocaleString('pt-BR') || 0}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover-card">
          <CardContent className="flex items-center p-6">
            <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900/20 mr-4">
              <CheckCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Aprovados</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.aprovados?.toLocaleString('pt-BR') || 0}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover-card">
          <CardContent className="flex items-center p-6">
            <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-orange-100 dark:bg-orange-900/20 mr-4">
              <XCircle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Pendentes</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{(stats.total - stats.aprovados)?.toLocaleString('pt-BR') || 0}</p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="space-y-2">
              <Label>Buscar Parceiro</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Nome ou email"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Provedor</Label>
              <Select value={filters.provedor || "all"} onValueChange={(value) => handleFilterChange('provedor', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os provedores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os provedores</SelectItem>
                  {provedores.map(provedor => (
                    <SelectItem key={provedor.id} value={provedor.id?.toString() || provedor.id}>
                      {provedor.nome_empresa}
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
              <Label>Nicho</Label>
              <Select value={filters.nicho || "all"} onValueChange={(value) => handleFilterChange('nicho', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os nichos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os nichos</SelectItem>
                  {nichos.map(nicho => (
                    <SelectItem key={nicho.id} value={nicho.id?.toString() || nicho.id}>
                      {nicho.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Aprovação</Label>
              <Select value={filters.aprovacao || "all"} onValueChange={(value) => handleFilterChange('aprovacao', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="aprovado">Aprovados</SelectItem>
                  <SelectItem value="pendente">Pendentes</SelectItem>
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

      {/* Tabela de Parceiros */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center space-x-2">
              <Store className="h-5 w-5" />
              <span>Lista de Parceiros</span>
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
                  <DropdownMenuItem onClick={() => setPagination(prev => ({ ...prev, limit: 25, page: 1 }))}>
                    25 por página
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setPagination(prev => ({ ...prev, limit: 50, page: 1 }))}>
                    50 por página
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setPagination(prev => ({ ...prev, limit: 100, page: 1 }))}>
                    100 por página
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
                  <TableHead>Parceiro</TableHead>
                  <TableHead>Provedor</TableHead>
                  <TableHead>Nicho</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Aprovação</TableHead>
                  <TableHead>Vouchers</TableHead>
                  <TableHead>Cadastro</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parceiros.map((parceiro) => (
                  <TableRow key={parceiro.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/20">
                          <Store className="h-4 w-4 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="space-y-1">
                          <div className="font-semibold">{parceiro.nome_fantasia}</div>
                          <div className="text-sm text-muted-foreground">{parceiro.email}</div>
                          <div className="text-sm text-muted-foreground">{parceiro.telefone}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-semibold">{parceiro.provedor_nome}</div>
                        <Badge 
                          variant={parceiro.provedor_plano === 'Enterprise' ? 'default' : 
                                  parceiro.provedor_plano === 'Profissional' ? 'secondary' : 'outline'}
                        >
                          {parceiro.provedor_plano}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {parceiro.nicho_nome}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(parceiro.ativo)}
                    </TableCell>
                    <TableCell>
                      {getAprovacaoBadge(parceiro.aprovado)}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <span className="font-semibold">{parceiro.total_vouchers || 0}</span>
                        <div className="text-sm text-muted-foreground">
                          {parceiro.vouchers_utilizados || 0} usados
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(parceiro.created_at)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        title="Ver detalhes"
                        onClick={() => {
                          window.open(`/superadmin/parceiros/${parceiro.id}`, '_blank')
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {parceiros.length === 0 && !loading && (
            <div className="text-center py-12 space-y-4">
              <Store className="h-12 w-12 text-muted-foreground mx-auto" />
              <div className="space-y-2">
                <h5 className="text-lg font-semibold text-muted-foreground">Nenhum parceiro encontrado</h5>
                <p className="text-muted-foreground">Ajuste os filtros para refinar sua busca.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {renderPagination()}
    </div>
  )
}
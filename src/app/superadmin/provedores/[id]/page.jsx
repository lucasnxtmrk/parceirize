'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/superadmin/ui/card'
import { Button } from '@/components/superadmin/ui/button'
import { Badge } from '@/components/superadmin/ui/badge'
import { Separator } from '@/components/superadmin/ui/separator'
import { ArrowLeft, Building2, Users, ShoppingBag, DollarSign, Calendar, Globe, Mail, Phone } from 'lucide-react'

export default function ProvedorDetalhesPage() {
  const { data: session, status } = useSession()
  const { id } = useParams()
  const router = useRouter()
  const [provedor, setProvedor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (session?.user?.role === 'superadmin' && id) {
      fetchProvedor()
    }
  }, [session, id])

  const fetchProvedor = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/superadmin/provedores/${id}`)

      if (!response.ok) {
        throw new Error('Provedor não encontrado')
      }

      const data = await response.json()
      setProvedor(data)
    } catch (error) {
      console.error('Erro ao carregar provedor:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
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

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <h3 className="text-xl font-semibold text-foreground">Erro</h3>
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>
    )
  }

  if (!provedor) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <h3 className="text-xl font-semibold text-foreground">Provedor não encontrado</h3>
        <Button onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {provedor.nome_empresa}
            </h1>
            <p className="text-muted-foreground">
              Detalhes completos do provedor
            </p>
          </div>
        </div>
        <Badge variant={provedor.ativo ? 'default' : 'destructive'}>
          {provedor.ativo ? 'Ativo' : 'Inativo'}
        </Badge>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900/20 mr-4">
              <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total de Clientes</p>
              <p className="text-2xl font-bold">{provedor.estatisticas.total_clientes}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-green-100 dark:bg-green-900/20 mr-4">
              <Building2 className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total de Parceiros</p>
              <p className="text-2xl font-bold">{provedor.estatisticas.total_parceiros}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-purple-100 dark:bg-purple-900/20 mr-4">
              <ShoppingBag className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total de Produtos</p>
              <p className="text-2xl font-bold">{provedor.estatisticas.total_produtos}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-orange-100 dark:bg-orange-900/20 mr-4">
              <DollarSign className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Pedidos (30 dias)</p>
              <p className="text-2xl font-bold">{provedor.estatisticas.pedidos_mes}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Informações Detalhadas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Informações Básicas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building2 className="h-5 w-5" />
              <span>Informações da Empresa</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Tenant ID</p>
              <p className="font-mono text-sm">{provedor.tenant_id}</p>
            </div>
            <Separator />
            <div>
              <p className="text-sm font-medium text-muted-foreground">E-mail</p>
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <p>{provedor.email}</p>
              </div>
            </div>
            <Separator />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Subdomínio</p>
              <div className="flex items-center space-x-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <p>{provedor.subdominio ? `${provedor.subdominio}.parceirize.com.br` : 'Não configurado'}</p>
              </div>
            </div>
            <Separator />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Data de Criação</p>
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <p>{formatDate(provedor.created_at)}</p>
              </div>
            </div>
            {provedor.data_vencimento && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Data de Vencimento</p>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p>{formatDate(provedor.data_vencimento)}</p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Informações do Plano */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5" />
              <span>Informações do Plano</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Plano Atual</p>
              <p className="text-lg font-semibold">{provedor.plano.nome}</p>
            </div>
            <Separator />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Valor Mensal</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(provedor.plano.preco)}</p>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Limite de Clientes</p>
                <p>{provedor.plano.limite_clientes || 'Ilimitado'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Limite de Parceiros</p>
                <p>{provedor.plano.limite_parceiros || 'Ilimitado'}</p>
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Subdomínio</p>
                <Badge variant={provedor.plano.tem_subdominio ? 'default' : 'secondary'}>
                  {provedor.plano.tem_subdominio ? 'Incluído' : 'Não incluído'}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">API</p>
                <Badge variant={provedor.plano.tem_api ? 'default' : 'secondary'}>
                  {provedor.plano.tem_api ? 'Incluído' : 'Não incluído'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
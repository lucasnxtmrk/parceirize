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
import { Alert, AlertDescription } from '@/components/superadmin/ui/alert'
import { Calendar, FileDown, BarChart3, TrendingUp, Users, Building2 } from 'lucide-react'

export default function RelatoriosPage() {
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(true)
  const [relatorioSelecionado, setRelatorioSelecionado] = useState('')
  const [filtros, setFiltros] = useState({
    dataInicio: new Date().toISOString().split('T')[0],
    dataFim: new Date().toISOString().split('T')[0],
    provedor: '',
    tipo: ''
  })
  const [dados, setDados] = useState(null)
  const [resumo, setResumo] = useState({
    totalProvedores: 0,
    totalClientes: 0,
    totalVouchers: 0,
    receitaMensal: 0
  })
  const [alert, setAlert] = useState({ show: false, message: '', type: 'info' })

  useEffect(() => {
    if (session?.user?.role === 'superadmin') {
      carregarResumo()
      setLoading(false)
    }
  }, [session])

  const carregarResumo = async () => {
    try {
      const response = await fetch('/api/superadmin/relatorios/resumo')
      const data = await response.json()
      setResumo(data)
    } catch (error) {
      console.error('Erro ao carregar resumo:', error)
    }
  }

  const gerarRelatorio = async () => {
    if (!relatorioSelecionado) {
      setAlert({ show: true, message: 'Selecione um tipo de relatório', type: 'warning' })
      return
    }

    try {
      setLoading(true)
      const params = new URLSearchParams({
        tipo: relatorioSelecionado,
        dataInicio: filtros.dataInicio,
        dataFim: filtros.dataFim,
        ...(filtros.provedor && { provedor: filtros.provedor })
      })

      const response = await fetch(`/api/superadmin/relatorios?${params}`)
      const data = await response.json()

      if (response.ok) {
        setDados(data)
        setAlert({ show: true, message: 'Relatório gerado com sucesso!', type: 'success' })
      } else {
        setAlert({ show: true, message: data.error || 'Erro ao gerar relatório', type: 'danger' })
      }
    } catch (error) {
      setAlert({ show: true, message: 'Erro ao gerar relatório', type: 'danger' })
      console.error('Erro:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportarRelatorio = async (formato = 'csv') => {
    if (!dados || dados.length === 0) {
      setAlert({ show: true, message: 'Nenhum dado para exportar', type: 'warning' })
      return
    }

    try {
      const params = new URLSearchParams({
        tipo: relatorioSelecionado,
        formato,
        dataInicio: filtros.dataInicio,
        dataFim: filtros.dataFim,
        ...(filtros.provedor && { provedor: filtros.provedor })
      })

      const response = await fetch(`/api/superadmin/relatorios/export?${params}`)
      const blob = await response.blob()
      
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `relatorio_${relatorioSelecionado}_${new Date().toISOString().split('T')[0]}.${formato}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setAlert({ show: true, message: 'Relatório exportado com sucesso!', type: 'success' })
    } catch (error) {
      setAlert({ show: true, message: 'Erro ao exportar relatório', type: 'danger' })
      console.error('Erro:', error)
    }
  }

  const renderResumoCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <Card className="hover-card">
        <CardContent className="flex items-center p-6">
          <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900/20 mr-4">
            <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total de Provedores</p>
            <p className="text-2xl font-bold">{resumo.totalProvedores}</p>
          </div>
        </CardContent>
      </Card>
      
      <Card className="hover-card">
        <CardContent className="flex items-center p-6">
          <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-green-100 dark:bg-green-900/20 mr-4">
            <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total de Clientes</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{resumo.totalClientes.toLocaleString('pt-BR')}</p>
          </div>
        </CardContent>
      </Card>
      
      <Card className="hover-card">
        <CardContent className="flex items-center p-6">
          <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900/20 mr-4">
            <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total de Vouchers</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{resumo.totalVouchers.toLocaleString('pt-BR')}</p>
          </div>
        </CardContent>
      </Card>
      
      <Card className="hover-card">
        <CardContent className="flex items-center p-6">
          <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-orange-100 dark:bg-orange-900/20 mr-4">
            <TrendingUp className="h-6 w-6 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Receita Mensal</p>
            <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
              R$ {resumo.receitaMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderTabela = () => {
    if (!dados || dados.length === 0) return null

    const colunas = Object.keys(dados[0])

    return (
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>Dados do Relatório</span>
            </CardTitle>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => exportarRelatorio('csv')} className="flex items-center space-x-2">
                <FileDown className="h-4 w-4" />
                <span>Exportar CSV</span>
              </Button>
              <Button variant="outline" onClick={() => exportarRelatorio('xlsx')} className="flex items-center space-x-2">
                <FileDown className="h-4 w-4" />
                <span>Exportar Excel</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {colunas.map(coluna => (
                    <TableHead key={coluna}>{coluna.charAt(0).toUpperCase() + coluna.slice(1)}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {dados.map((item, index) => (
                  <TableRow key={index}>
                    {colunas.map(coluna => (
                      <TableCell key={coluna}>
                        {typeof item[coluna] === 'boolean' ? (
                          <Badge variant={item[coluna] ? 'default' : 'destructive'}>
                            {item[coluna] ? 'Ativo' : 'Inativo'}
                          </Badge>
                        ) : typeof item[coluna] === 'number' && coluna.includes('preco') ? (
                          `R$ ${item[coluna].toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                        ) : (
                          item[coluna]
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
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
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Relatórios</h1>
          <p className="text-muted-foreground">
            Gere relatórios detalhados sobre a plataforma
          </p>
        </div>
      </div>

      {/* Alert */}
      {alert.show && (
        <Alert variant={alert.type === 'success' ? 'default' : 'destructive'} className="mb-6">
          <AlertDescription>{alert.message}</AlertDescription>
        </Alert>
      )}

      {/* Cards de Resumo */}
      {renderResumoCards()}

      {/* Filtros */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Filtros de Relatório</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Relatório</Label>
              <Select value={relatorioSelecionado} onValueChange={setRelatorioSelecionado}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um relatório" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="provedores">Relatório de Provedores</SelectItem>
                  <SelectItem value="clientes">Relatório de Clientes</SelectItem>
                  <SelectItem value="vouchers">Relatório de Vouchers</SelectItem>
                  <SelectItem value="financeiro">Relatório Financeiro</SelectItem>
                  <SelectItem value="uso">Relatório de Uso da Plataforma</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Data Início</Label>
              <Input
                type="date"
                value={filtros.dataInicio}
                onChange={(e) => setFiltros(prev => ({ ...prev, dataInicio: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Data Fim</Label>
              <Input
                type="date"
                value={filtros.dataFim}
                onChange={(e) => setFiltros(prev => ({ ...prev, dataFim: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Provedor (Opcional)</Label>
              <Input
                type="text"
                placeholder="ID ou nome do provedor"
                value={filtros.provedor}
                onChange={(e) => setFiltros(prev => ({ ...prev, provedor: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button 
                onClick={gerarRelatorio}
                disabled={loading}
                className="w-full flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Gerando...</span>
                  </>
                ) : (
                  <>
                    <BarChart3 className="h-4 w-4" />
                    <span>Gerar</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resultados */}
      {dados && renderTabela()}

      {/* Instruções */}
      {!dados && (
        <Card>
          <CardContent className="text-center py-12 space-y-6">
            <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto" />
            <div className="space-y-2">
              <h5 className="text-xl font-semibold text-muted-foreground">Relatórios Disponíveis</h5>
              <p className="text-muted-foreground">
                Selecione um tipo de relatório e configure os filtros para gerar análises detalhadas.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
              <div className="bg-muted/10 p-4 rounded-lg space-y-2">
                <h6 className="font-semibold flex items-center space-x-2">
                  <Building2 className="h-4 w-4" />
                  <span>Relatório de Provedores</span>
                </h6>
                <p className="text-sm text-muted-foreground">Dados completos dos provedores, planos e estatísticas</p>
              </div>
              <div className="bg-muted/10 p-4 rounded-lg space-y-2">
                <h6 className="font-semibold flex items-center space-x-2">
                  <Users className="h-4 w-4" />
                  <span>Relatório de Clientes</span>
                </h6>
                <p className="text-sm text-muted-foreground">Informações dos clientes por provedor e período</p>
              </div>
              <div className="bg-muted/10 p-4 rounded-lg space-y-2">
                <h6 className="font-semibold flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>Relatório de Vouchers</span>
                </h6>
                <p className="text-sm text-muted-foreground">Análise de vouchers criados e utilizados</p>
              </div>
              <div className="bg-muted/10 p-4 rounded-lg space-y-2">
                <h6 className="font-semibold flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4" />
                  <span>Relatório Financeiro</span>
                </h6>
                <p className="text-sm text-muted-foreground">Receitas, planos e análises financeiras</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
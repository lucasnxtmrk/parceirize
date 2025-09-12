'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/superadmin/ui/card'
import { Button } from '@/components/superadmin/ui/button'
import { Badge } from '@/components/superadmin/ui/badge'
import { Input } from '@/components/superadmin/ui/input'
import { Label } from '@/components/superadmin/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/superadmin/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/superadmin/ui/dialog'
import { Alert, AlertDescription } from '@/components/superadmin/ui/alert'
import { Textarea } from '@/components/superadmin/ui/textarea'
import { Package, CheckCircle, Building2, DollarSign, Plus, Edit, Trash2 } from 'lucide-react'
import Link from 'next/link'

export default function PlanosPage() {
  const { data: session, status } = useSession()
  const [planos, setPlanos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingPlano, setEditingPlano] = useState(null)
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    preco: '',
    limite_clientes: '',
    limite_parceiros: '',
    limite_vouchers: '',
    recursos: '',
    ativo: true
  })
  const [alert, setAlert] = useState({ show: false, message: '', type: 'success' })

  useEffect(() => {
    if (session?.user?.role === 'superadmin') {
      fetchPlanos()
    }
  }, [session])

  const fetchPlanos = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/superadmin/planos')
      const data = await response.json()
      setPlanos(data)
    } catch (error) {
      console.error('Erro ao carregar planos:', error)
      showAlert('Erro ao carregar planos', 'danger')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const method = editingPlano ? 'PUT' : 'POST'
      const url = editingPlano ? `/api/superadmin/planos/${editingPlano.id}` : '/api/superadmin/planos'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          preco: parseFloat(formData.preco),
          limite_clientes: parseInt(formData.limite_clientes) || null,
          limite_parceiros: parseInt(formData.limite_parceiros) || null,
          limite_vouchers: parseInt(formData.limite_vouchers) || null,
          recursos: formData.recursos.split('\n').filter(r => r.trim())
        })
      })

      if (response.ok) {
        showAlert(`Plano ${editingPlano ? 'atualizado' : 'criado'} com sucesso!`, 'success')
        setShowModal(false)
        resetForm()
        fetchPlanos()
      } else {
        throw new Error('Erro ao salvar plano')
      }
    } catch (error) {
      console.error('Erro ao salvar plano:', error)
      showAlert('Erro ao salvar plano', 'danger')
    }
  }

  const handleEdit = (plano) => {
    setEditingPlano(plano)
    setFormData({
      nome: plano.nome,
      descricao: plano.descricao || '',
      preco: plano.preco.toString(),
      limite_clientes: plano.limite_clientes?.toString() || '',
      limite_parceiros: plano.limite_parceiros?.toString() || '',
      limite_vouchers: plano.limite_vouchers?.toString() || '',
      recursos: Array.isArray(plano.recursos) ? plano.recursos.join('\n') : '',
      ativo: plano.ativo
    })
    setShowModal(true)
  }

  const handleDelete = async (planoId) => {
    if (!confirm('Tem certeza que deseja excluir este plano?')) return

    try {
      const response = await fetch(`/api/superadmin/planos/${planoId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        showAlert('Plano excluído com sucesso!', 'success')
        fetchPlanos()
      } else {
        throw new Error('Erro ao excluir plano')
      }
    } catch (error) {
      console.error('Erro ao excluir plano:', error)
      showAlert('Erro ao excluir plano', 'danger')
    }
  }

  const resetForm = () => {
    setFormData({
      nome: '',
      descricao: '',
      preco: '',
      limite_clientes: '',
      limite_parceiros: '',
      limite_vouchers: '',
      recursos: '',
      ativo: true
    })
    setEditingPlano(null)
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
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Gestão de Planos</h1>
          <p className="text-muted-foreground">
            Configure os planos disponíveis para os provedores
          </p>
        </div>
        <Button 
          onClick={() => { resetForm(); setShowModal(true); }}
          className="flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Novo Plano</span>
        </Button>
      </div>

      {/* Cards de Estatísticas dos Planos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="hover-card">
          <CardContent className="flex items-center p-6">
            <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900/20 mr-4">
              <Package className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total de Planos</p>
              <p className="text-2xl font-bold">{planos.length}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover-card">
          <CardContent className="flex items-center p-6">
            <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-green-100 dark:bg-green-900/20 mr-4">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Planos Ativos</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {planos.filter(p => p.ativo).length}
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover-card">
          <CardContent className="flex items-center p-6">
            <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-orange-100 dark:bg-orange-900/20 mr-4">
              <Building2 className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Provedores Usando</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {planos.reduce((acc, p) => acc + (p.provedores_usando || 0), 0)}
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover-card">
          <CardContent className="flex items-center p-6">
            <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900/20 mr-4">
              <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Receita Potencial</p>
              <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {formatCurrency(planos.reduce((acc, p) => acc + (p.preco * (p.provedores_usando || 0)), 0))}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Planos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5" />
            <span>Lista de Planos</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plano</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Limites</TableHead>
                  <TableHead>Recursos</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Provedores</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {planos.map((plano) => (
                  <TableRow key={plano.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-semibold">{plano.nome}</div>
                        <div className="text-sm text-muted-foreground">{plano.descricao}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <span className="font-bold">{formatCurrency(plano.preco)}</span>
                        <div className="text-sm text-muted-foreground">por mês</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm space-y-1">
                        {plano.limite_clientes && <div>{plano.limite_clientes} clientes</div>}
                        {plano.limite_parceiros && <div>{plano.limite_parceiros} parceiros</div>}
                        {plano.limite_vouchers && <div>{plano.limite_vouchers} vouchers</div>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm space-y-1">
                        {Array.isArray(plano.recursos) ? 
                          plano.recursos.slice(0, 3).map((recurso, idx) => (
                            <div key={idx} className="flex items-center space-x-1">
                              <CheckCircle className="h-3 w-3 text-green-600" />
                              <span>{recurso}</span>
                            </div>
                          )) : 
                          <span className="text-muted-foreground">Nenhum recurso listado</span>
                        }
                        {Array.isArray(plano.recursos) && plano.recursos.length > 3 && 
                          <div className="text-muted-foreground">+{plano.recursos.length - 3} mais</div>
                        }
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={plano.ativo ? 'default' : 'secondary'}>
                        {plano.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold">{plano.provedores_usando || 0}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(plano)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(plano.id)}
                          disabled={plano.provedores_usando > 0}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {planos.length === 0 && (
            <div className="text-center py-12 space-y-4">
              <Package className="h-12 w-12 text-muted-foreground mx-auto" />
              <div className="space-y-2">
                <h5 className="text-lg font-semibold text-muted-foreground">Nenhum plano cadastrado</h5>
                <p className="text-muted-foreground">Crie o primeiro plano para começar.</p>
              </div>
              <Button 
                onClick={() => { resetForm(); setShowModal(true); }}
                className="flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Criar Primeiro Plano</span>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog para Criar/Editar Plano */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPlano ? 'Editar Plano' : 'Novo Plano'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome do Plano *</Label>
                  <Input
                    id="nome"
                    type="text"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    required
                    placeholder="Ex: Básico, Profissional, Enterprise"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="preco">Preço Mensal *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">R$</span>
                    <Input
                      id="preco"
                      type="number"
                      step="0.01"
                      value={formData.preco}
                      onChange={(e) => setFormData({ ...formData, preco: e.target.value })}
                      required
                      placeholder="0,00"
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  rows={2}
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Descrição opcional do plano"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="limite_clientes">Limite de Clientes</Label>
                  <Input
                    id="limite_clientes"
                    type="number"
                    value={formData.limite_clientes}
                    onChange={(e) => setFormData({ ...formData, limite_clientes: e.target.value })}
                    placeholder="Ilimitado"
                  />
                  <p className="text-sm text-muted-foreground">Deixe vazio para ilimitado</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="limite_parceiros">Limite de Parceiros</Label>
                  <Input
                    id="limite_parceiros"
                    type="number"
                    value={formData.limite_parceiros}
                    onChange={(e) => setFormData({ ...formData, limite_parceiros: e.target.value })}
                    placeholder="Ilimitado"
                  />
                  <p className="text-sm text-muted-foreground">Deixe vazio para ilimitado</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="limite_vouchers">Limite de Vouchers</Label>
                  <Input
                    id="limite_vouchers"
                    type="number"
                    value={formData.limite_vouchers}
                    onChange={(e) => setFormData({ ...formData, limite_vouchers: e.target.value })}
                    placeholder="Ilimitado"
                  />
                  <p className="text-sm text-muted-foreground">Deixe vazio para ilimitado</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="recursos">Recursos Inclusos</Label>
                <Textarea
                  id="recursos"
                  rows={4}
                  value={formData.recursos}
                  onChange={(e) => setFormData({ ...formData, recursos: e.target.value })}
                  placeholder="Digite um recurso por linha:&#10;Dashboard avançado&#10;Relatórios personalizados&#10;Integração SGP&#10;Suporte 24h"
                />
                <p className="text-sm text-muted-foreground">Digite um recurso por linha</p>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="ativo"
                  checked={formData.ativo}
                  onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <Label htmlFor="ativo">Plano ativo</Label>
              </div>
            </div>
            <DialogFooter className="flex space-x-2">
              <Button variant="outline" type="button" onClick={() => setShowModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="flex items-center space-x-2">
                {editingPlano ? (
                  <>
                    <Edit className="h-4 w-4" />
                    <span>Salvar Alterações</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    <span>Criar Plano</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
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
import { Textarea } from '@/components/superadmin/ui/textarea'
import { Settings, Save, Shield, Database, Mail, Cpu, Plus, Edit, Trash2 } from 'lucide-react'

export default function ConfiguracoesPage() {
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [planos, setPlanos] = useState([])
  const [configuracoes, setConfiguracoes] = useState({
    sistema: {
      nome: 'Parceirize',
      versao: '2.0.0',
      manutencao: false,
      backupAuto: true,
      logLevel: 'info'
    },
    email: {
      smtp_host: '',
      smtp_port: 587,
      smtp_user: '',
      smtp_pass: '',
      from_email: '',
      from_name: 'Sistema Parceirize'
    },
    limites: {
      max_provedores: 100,
      max_clientes_por_provedor: 10000,
      max_vouchers_por_mes: 50000,
      taxa_comissao: 5.0
    }
  })
  const [showPlanoModal, setShowPlanoModal] = useState(false)
  const [planoEditando, setPlanoEditando] = useState(null)
  const [novoPlano, setNovoPlano] = useState({
    nome: '',
    preco: 0,
    limite_clientes: 100,
    limite_parceiros: 10,
    limite_vouchers: 1000,
    limite_produtos: 100,
    tem_subdominio: false,
    tem_api: false,
    tem_export: false,
    integracoes_sgp: 1,
    suporte_tipo: 'email',
    historico_meses: 6,
    descricao: '',
    ativo: true
  })
  const [alert, setAlert] = useState({ show: false, message: '', type: 'info' })

  useEffect(() => {
    if (session?.user?.role === 'superadmin') {
      carregarConfiguracoes()
      carregarPlanos()
    }
  }, [session])

  const carregarConfiguracoes = async () => {
    try {
      const response = await fetch('/api/superadmin/configuracoes')
      if (response.ok) {
        const data = await response.json()
        setConfiguracoes(prev => ({ ...prev, ...data }))
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
    } finally {
      setLoading(false)
    }
  }

  const carregarPlanos = async () => {
    try {
      const response = await fetch('/api/superadmin/planos')
      if (response.ok) {
        const data = await response.json()
        setPlanos(data)
      }
    } catch (error) {
      console.error('Erro ao carregar planos:', error)
    }
  }

  const salvarConfiguracoes = async (secao = null) => {
    try {
      setSaving(true)
      const dadosParaSalvar = secao ? { [secao]: configuracoes[secao] } : configuracoes

      const response = await fetch('/api/superadmin/configuracoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dadosParaSalvar)
      })

      if (response.ok) {
        setAlert({ show: true, message: 'Configurações salvas com sucesso!', type: 'success' })
      } else {
        const error = await response.json()
        setAlert({ show: true, message: error.message || 'Erro ao salvar configurações', type: 'danger' })
      }
    } catch (error) {
      setAlert({ show: true, message: 'Erro ao salvar configurações', type: 'danger' })
      console.error('Erro:', error)
    } finally {
      setSaving(false)
    }
  }

  const salvarPlano = async () => {
    try {
      const url = planoEditando 
        ? `/api/superadmin/planos/${planoEditando.id}`
        : '/api/superadmin/planos'
      
      const method = planoEditando ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novoPlano)
      })

      if (response.ok) {
        setAlert({ 
          show: true, 
          message: `Plano ${planoEditando ? 'atualizado' : 'criado'} com sucesso!`, 
          type: 'success' 
        })
        setShowPlanoModal(false)
        setPlanoEditando(null)
        setNovoPlano({
          nome: '',
          preco: 0,
          limite_clientes: 100,
          limite_parceiros: 10,
          limite_vouchers: 1000,
          limite_produtos: 100,
          tem_subdominio: false,
          tem_api: false,
          tem_export: false,
          integracoes_sgp: 1,
          suporte_tipo: 'email',
          historico_meses: 6,
          descricao: '',
          ativo: true
        })
        carregarPlanos()
      } else {
        const error = await response.json()
        setAlert({ show: true, message: error.message || 'Erro ao salvar plano', type: 'danger' })
      }
    } catch (error) {
      setAlert({ show: true, message: 'Erro ao salvar plano', type: 'danger' })
      console.error('Erro:', error)
    }
  }

  const editarPlano = (plano) => {
    setPlanoEditando(plano)
    setNovoPlano({ ...plano })
    setShowPlanoModal(true)
  }

  const excluirPlano = async (planoId) => {
    if (!confirm('Tem certeza que deseja excluir este plano? Esta ação não pode ser desfeita.')) {
      return
    }

    try {
      const response = await fetch(`/api/superadmin/planos/${planoId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setAlert({ show: true, message: 'Plano excluído com sucesso!', type: 'success' })
        carregarPlanos()
      } else {
        const error = await response.json()
        setAlert({ show: true, message: error.message || 'Erro ao excluir plano', type: 'danger' })
      }
    } catch (error) {
      setAlert({ show: true, message: 'Erro ao excluir plano', type: 'danger' })
      console.error('Erro:', error)
    }
  }

  const atualizarConfiguracao = (secao, campo, valor) => {
    setConfiguracoes(prev => ({
      ...prev,
      [secao]: {
        ...prev[secao],
        [campo]: valor
      }
    }))
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
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Configurações do Sistema</h1>
          <p className="text-muted-foreground">
            Gerencie configurações globais da plataforma
          </p>
        </div>
      </div>

      {/* Alert */}
      {alert.show && (
        <Alert variant={alert.type === 'success' ? 'default' : 'destructive'} className="mb-6">
          <AlertDescription>{alert.message}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Configurações do Sistema */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <CardTitle>Configurações Gerais</CardTitle>
                </div>
                <Button 
                  size="sm" 
                  onClick={() => salvarConfiguracoes('sistema')}
                  disabled={saving}
                  className="flex items-center space-x-2"
                >
                  <Save className="h-4 w-4" />
                  <span>Salvar</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="nome-sistema">Nome do Sistema</Label>
                  <Input
                    id="nome-sistema"
                    type="text"
                    value={configuracoes.sistema.nome}
                    onChange={(e) => atualizarConfiguracao('sistema', 'nome', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="versao">Versão</Label>
                  <Input
                    id="versao"
                    type="text"
                    value={configuracoes.sistema.versao}
                    onChange={(e) => atualizarConfiguracao('sistema', 'versao', e.target.value)}
                    readOnly
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nível de Log</Label>
                  <Select value={configuracoes.sistema.logLevel} onValueChange={(value) => atualizarConfiguracao('sistema', 'logLevel', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="error">Error</SelectItem>
                      <SelectItem value="warn">Warning</SelectItem>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="debug">Debug</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="manutencao-switch"
                      checked={configuracoes.sistema.manutencao}
                      onChange={(e) => atualizarConfiguracao('sistema', 'manutencao', e.target.checked)}
                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <Label htmlFor="manutencao-switch">Modo de Manutenção</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="backup-switch"
                      checked={configuracoes.sistema.backupAuto}
                      onChange={(e) => atualizarConfiguracao('sistema', 'backupAuto', e.target.checked)}
                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <Label htmlFor="backup-switch">Backup Automático</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Configurações de Email */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Mail className="h-5 w-5" />
                  <CardTitle>Configurações de Email</CardTitle>
                </div>
                <Button 
                  size="sm" 
                  onClick={() => salvarConfiguracoes('email')}
                  disabled={saving}
                  className="flex items-center space-x-2"
                >
                  <Save className="h-4 w-4" />
                  <span>Salvar</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="smtp-host">SMTP Host</Label>
                  <Input
                    id="smtp-host"
                    type="text"
                    value={configuracoes.email.smtp_host}
                    onChange={(e) => atualizarConfiguracao('email', 'smtp_host', e.target.value)}
                    placeholder="smtp.gmail.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-port">SMTP Port</Label>
                  <Input
                    id="smtp-port"
                    type="number"
                    value={configuracoes.email.smtp_port}
                    onChange={(e) => atualizarConfiguracao('email', 'smtp_port', parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="from-email">Email do Remetente</Label>
                  <Input
                    id="from-email"
                    type="email"
                    value={configuracoes.email.from_email}
                    onChange={(e) => atualizarConfiguracao('email', 'from_email', e.target.value)}
                    placeholder="sistema@parceirize.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="from-name">Nome do Remetente</Label>
                  <Input
                    id="from-name"
                    type="text"
                    value={configuracoes.email.from_name}
                    onChange={(e) => atualizarConfiguracao('email', 'from_name', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Limites do Sistema */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <CardTitle>Limites do Sistema</CardTitle>
                </div>
                <Button 
                  size="sm" 
                  onClick={() => salvarConfiguracoes('limites')}
                  disabled={saving}
                  className="flex items-center space-x-2"
                >
                  <Save className="h-4 w-4" />
                  <span>Salvar</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="max-provedores">Máximo de Provedores</Label>
                  <Input
                    id="max-provedores"
                    type="number"
                    value={configuracoes.limites.max_provedores}
                    onChange={(e) => atualizarConfiguracao('limites', 'max_provedores', parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taxa-comissao">Taxa de Comissão (%)</Label>
                  <Input
                    id="taxa-comissao"
                    type="number"
                    step="0.1"
                    value={configuracoes.limites.taxa_comissao}
                    onChange={(e) => atualizarConfiguracao('limites', 'taxa_comissao', parseFloat(e.target.value))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Status do Sistema */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Cpu className="h-5 w-5" />
                <CardTitle>Status do Sistema</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Sistema</span>
                  <Badge variant="default">Online</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Banco de Dados</span>
                  <Badge variant="default">Conectado</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Email SMTP</span>
                  <Badge variant="secondary">Não configurado</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Backup</span>
                  <Badge variant={configuracoes.sistema.backupAuto ? 'default' : 'secondary'}>
                    {configuracoes.sistema.backupAuto ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Planos */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Planos Disponíveis</CardTitle>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowPlanoModal(true)}
                  className="flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Novo Plano</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {planos.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Nenhum plano cadastrado</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableBody>
                      {planos.map(plano => (
                        <TableRow key={plano.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{plano.nome}</div>
                              <div className="text-sm text-muted-foreground">
                                R$ {plano.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => editarPlano(plano)}
                              className="mr-2"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => excluirPlano(plano.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog de Plano */}
      <Dialog open={showPlanoModal} onOpenChange={setShowPlanoModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{planoEditando ? 'Editar Plano' : 'Novo Plano'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="nome-plano">Nome do Plano</Label>
                <Input
                  id="nome-plano"
                  type="text"
                  value={novoPlano.nome}
                  onChange={(e) => setNovoPlano(prev => ({ ...prev, nome: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="preco-plano">Preço (R$)</Label>
                <Input
                  id="preco-plano"
                  type="number"
                  step="0.01"
                  value={novoPlano.preco}
                  onChange={(e) => setNovoPlano(prev => ({ ...prev, preco: parseFloat(e.target.value) }))}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="limite-clientes">Limite de Clientes</Label>
                <Input
                  id="limite-clientes"
                  type="number"
                  value={novoPlano.limite_clientes}
                  onChange={(e) => setNovoPlano(prev => ({ ...prev, limite_clientes: parseInt(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="limite-parceiros">Limite de Parceiros</Label>
                <Input
                  id="limite-parceiros"
                  type="number"
                  value={novoPlano.limite_parceiros}
                  onChange={(e) => setNovoPlano(prev => ({ ...prev, limite_parceiros: parseInt(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="limite-vouchers">Limite de Vouchers</Label>
                <Input
                  id="limite-vouchers"
                  type="number"
                  value={novoPlano.limite_vouchers}
                  onChange={(e) => setNovoPlano(prev => ({ ...prev, limite_vouchers: parseInt(e.target.value) }))}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="subdominio-switch"
                  checked={novoPlano.tem_subdominio}
                  onChange={(e) => setNovoPlano(prev => ({ ...prev, tem_subdominio: e.target.checked }))}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <Label htmlFor="subdominio-switch">Permite Subdomínio</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="api-switch"
                  checked={novoPlano.tem_api}
                  onChange={(e) => setNovoPlano(prev => ({ ...prev, tem_api: e.target.checked }))}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <Label htmlFor="api-switch">Acesso à API</Label>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="descricao-plano">Descrição</Label>
              <Textarea
                id="descricao-plano"
                rows={3}
                value={novoPlano.descricao}
                onChange={(e) => setNovoPlano(prev => ({ ...prev, descricao: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowPlanoModal(false)}>
              Cancelar
            </Button>
            <Button onClick={salvarPlano}>
              {planoEditando ? 'Atualizar' : 'Criar'} Plano
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
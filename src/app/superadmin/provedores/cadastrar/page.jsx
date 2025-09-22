'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/superadmin/ui/card'
import { Button } from '@/components/superadmin/ui/button'
import { Input } from '@/components/superadmin/ui/input'
import { Label } from '@/components/superadmin/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/superadmin/ui/select'
import { Alert, AlertDescription } from '@/components/superadmin/ui/alert'
import { Separator } from '@/components/superadmin/ui/separator'
import { Building2, ArrowLeft, Save, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'

export default function CadastrarProvedorPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [planos, setPlanos] = useState([])
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [alert, setAlert] = useState({ show: false, message: '', type: 'success' })

  const [formData, setFormData] = useState({
    nome_empresa: '',
    email: '',
    senha: '',
    confirmar_senha: '',
    plano_id: '',
    subdominio: '',
    data_vencimento: ''
  })

  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (session?.user?.role === 'superadmin') {
      fetchPlanos()
    }
  }, [session])

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

  const validateForm = () => {
    const newErrors = {}

    // Nome da empresa
    if (!formData.nome_empresa.trim()) {
      newErrors.nome_empresa = 'Nome da empresa é obrigatório'
    }

    // Email
    if (!formData.email.trim()) {
      newErrors.email = 'Email é obrigatório'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido'
    }

    // Senha
    if (!formData.senha) {
      newErrors.senha = 'Senha é obrigatória'
    } else if (formData.senha.length < 6) {
      newErrors.senha = 'Senha deve ter pelo menos 6 caracteres'
    }

    // Confirmar senha
    if (formData.senha !== formData.confirmar_senha) {
      newErrors.confirmar_senha = 'Senhas não coincidem'
    }

    // Plano
    if (!formData.plano_id) {
      newErrors.plano_id = 'Plano é obrigatório'
    }

    // Subdomínio (opcional, mas se fornecido deve ser válido)
    if (formData.subdominio && !/^[a-z0-9-]+$/.test(formData.subdominio)) {
      newErrors.subdominio = 'Subdomínio deve conter apenas letras minúsculas, números e hífens'
    }

    // Data de vencimento (opcional, mas se fornecida deve ser futura)
    if (formData.data_vencimento) {
      const vencimento = new Date(formData.data_vencimento)
      const hoje = new Date()
      if (vencimento <= hoje) {
        newErrors.data_vencimento = 'Data de vencimento deve ser futura'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/superadmin/provedores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome_empresa: formData.nome_empresa,
          email: formData.email,
          senha: formData.senha,
          plano_id: parseInt(formData.plano_id),
          subdominio: formData.subdominio || null,
          data_vencimento: formData.data_vencimento || null
        })
      })

      const data = await response.json()

      if (response.ok) {
        showAlert('Provedor cadastrado com sucesso!', 'success')
        setTimeout(() => {
          router.push('/superadmin/provedores')
        }, 2000)
      } else {
        showAlert(data.error || 'Erro ao cadastrar provedor', 'error')
      }
    } catch (error) {
      console.error('Erro ao cadastrar provedor:', error)
      showAlert('Erro interno do servidor', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))

    // Limpar erro do campo quando usuário começar a digitar
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
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

  if (status === 'loading') {
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
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/superadmin/provedores" className="flex items-center space-x-2">
              <ArrowLeft className="h-4 w-4" />
              <span>Voltar</span>
            </Link>
          </Button>
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Cadastrar Novo Provedor</h1>
            <p className="text-muted-foreground">
              Crie uma nova conta de provedor na plataforma
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building2 className="h-5 w-5" />
              <span>Informações do Provedor</span>
            </CardTitle>
            <CardDescription>
              Preencha os dados do novo provedor. Todos os campos marcados com * são obrigatórios.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Dados da Empresa */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nome_empresa">Nome da Empresa *</Label>
                  <Input
                    id="nome_empresa"
                    type="text"
                    value={formData.nome_empresa}
                    onChange={(e) => handleInputChange('nome_empresa', e.target.value)}
                    placeholder="Digite o nome da empresa"
                    disabled={loading}
                  />
                  {errors.nome_empresa && (
                    <p className="text-sm text-red-600">{errors.nome_empresa}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email de Acesso *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="email@empresa.com"
                    disabled={loading}
                  />
                  {errors.email && (
                    <p className="text-sm text-red-600">{errors.email}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="senha">Senha *</Label>
                    <div className="relative">
                      <Input
                        id="senha"
                        type={showPassword ? "text" : "password"}
                        value={formData.senha}
                        onChange={(e) => handleInputChange('senha', e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        disabled={loading}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {errors.senha && (
                      <p className="text-sm text-red-600">{errors.senha}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmar_senha">Confirmar Senha *</Label>
                    <Input
                      id="confirmar_senha"
                      type={showPassword ? "text" : "password"}
                      value={formData.confirmar_senha}
                      onChange={(e) => handleInputChange('confirmar_senha', e.target.value)}
                      placeholder="Digite a senha novamente"
                      disabled={loading}
                    />
                    {errors.confirmar_senha && (
                      <p className="text-sm text-red-600">{errors.confirmar_senha}</p>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Configurações do Plano */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Configurações do Plano</h3>

                <div className="space-y-2">
                  <Label htmlFor="plano_id">Plano de Assinatura *</Label>
                  <Select value={formData.plano_id || ""} onValueChange={(value) => handleInputChange('plano_id', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um plano..." />
                    </SelectTrigger>
                    <SelectContent>
                      {planos.map(plano => (
                        <SelectItem key={plano.id} value={plano.id.toString()}>
                          <div className="flex items-center justify-between w-full">
                            <span>{plano.nome}</span>
                            <span className="ml-2 text-sm text-muted-foreground">
                              {formatCurrency(plano.preco)}/mês
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.plano_id && (
                    <p className="text-sm text-red-600">{errors.plano_id}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="subdominio">Subdomínio (opcional)</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        id="subdominio"
                        type="text"
                        value={formData.subdominio}
                        onChange={(e) => handleInputChange('subdominio', e.target.value.toLowerCase())}
                        placeholder="empresa"
                        disabled={loading}
                      />
                      <span className="text-sm text-muted-foreground">.parceirize.com</span>
                    </div>
                    {errors.subdominio && (
                      <p className="text-sm text-red-600">{errors.subdominio}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="data_vencimento">Data de Vencimento (opcional)</Label>
                    <Input
                      id="data_vencimento"
                      type="date"
                      value={formData.data_vencimento}
                      onChange={(e) => handleInputChange('data_vencimento', e.target.value)}
                      disabled={loading}
                      min={new Date().toISOString().split('T')[0]}
                    />
                    {errors.data_vencimento && (
                      <p className="text-sm text-red-600">{errors.data_vencimento}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Botões */}
              <div className="flex justify-end space-x-4 pt-6">
                <Button type="button" variant="outline" asChild disabled={loading}>
                  <Link href="/superadmin/provedores">Cancelar</Link>
                </Button>
                <Button type="submit" disabled={loading} className="flex items-center space-x-2">
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  <span>{loading ? 'Salvando...' : 'Cadastrar Provedor'}</span>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
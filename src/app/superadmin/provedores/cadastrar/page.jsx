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
    telefone: '',
    endereco: '',
    cnpj: '',
    subdominio: ''
  })

  const [errors, setErrors] = useState({})
  const [subdomainStatus, setSubdomainStatus] = useState({ checking: false, valid: null, message: '' })

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

  const validateSubdomain = async (subdomain) => {
    if (!subdomain || subdomain.trim().length === 0) {
      setSubdomainStatus({ checking: false, valid: null, message: '' })
      return
    }

    setSubdomainStatus({ checking: true, valid: null, message: 'Verificando...' })

    try {
      const response = await fetch('/api/admin/validate-subdomain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subdominio: subdomain.trim().toLowerCase() })
      })

      const data = await response.json()

      if (response.ok) {
        setSubdomainStatus({
          checking: false,
          valid: true,
          message: `✅ ${data.message} Domínio: ${data.domain_preview}`
        })
      } else {
        setSubdomainStatus({
          checking: false,
          valid: false,
          message: `❌ ${data.error}`
        })
      }
    } catch (error) {
      setSubdomainStatus({
        checking: false,
        valid: false,
        message: '❌ Erro ao validar subdomínio'
      })
    }
  }

  // Debounce para validação de subdomínio
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.subdominio) {
        validateSubdomain(formData.subdominio)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [formData.subdominio])

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

    // Subdomínio (opcional, mas se fornecido deve ser válido)
    if (formData.subdominio) {
      if (subdomainStatus.valid === false) {
        newErrors.subdominio = 'Subdomínio inválido ou não disponível'
      } else if (subdomainStatus.checking) {
        newErrors.subdominio = 'Aguarde a validação do subdomínio'
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
      const response = await fetch('/api/admin/provedores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome_empresa: formData.nome_empresa,
          email: formData.email,
          senha: formData.senha,
          subdominio: formData.subdominio || null,
          telefone: formData.telefone || null,
          endereco: formData.endereco || null,
          cnpj: formData.cnpj || null
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input
                      id="telefone"
                      type="tel"
                      value={formData.telefone}
                      onChange={(e) => handleInputChange('telefone', e.target.value)}
                      placeholder="(11) 99999-9999"
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cnpj">CNPJ</Label>
                    <Input
                      id="cnpj"
                      type="text"
                      value={formData.cnpj}
                      onChange={(e) => handleInputChange('cnpj', e.target.value)}
                      placeholder="00.000.000/0001-00"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endereco">Endereço</Label>
                  <Input
                    id="endereco"
                    type="text"
                    value={formData.endereco}
                    onChange={(e) => handleInputChange('endereco', e.target.value)}
                    placeholder="Rua, número, bairro, cidade - UF"
                    disabled={loading}
                  />
                </div>
              </div>

              <Separator />

              {/* Configurações de Domínio */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Configurações de Domínio</h3>
                <p className="text-sm text-muted-foreground">
                  Configure um subdomínio personalizado para este provedor. Será criado automaticamente um domínio como: subdominio.parceirize.com
                </p>

                <div className="space-y-2">
                  <Label htmlFor="subdominio">Subdomínio (opcional)</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="subdominio"
                      type="text"
                      value={formData.subdominio}
                      onChange={(e) => handleInputChange('subdominio', e.target.value.toLowerCase())}
                      placeholder="minhaempresa"
                      disabled={loading}
                      className={
                        subdomainStatus.valid === true ? 'border-green-500' :
                        subdomainStatus.valid === false ? 'border-red-500' :
                        ''
                      }
                    />
                    <span className="text-sm text-muted-foreground whitespace-nowrap">.parceirize.com</span>
                  </div>

                  {/* Status do subdomínio */}
                  {subdomainStatus.message && (
                    <div className={`text-sm p-2 rounded ${
                      subdomainStatus.valid === true ? 'bg-green-50 text-green-700' :
                      subdomainStatus.valid === false ? 'bg-red-50 text-red-700' :
                      'bg-yellow-50 text-yellow-700'
                    }`}>
                      {subdomainStatus.checking && (
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-yellow-600"></div>
                          <span>{subdomainStatus.message}</span>
                        </div>
                      )}
                      {!subdomainStatus.checking && subdomainStatus.message}
                    </div>
                  )}

                  {errors.subdominio && (
                    <p className="text-sm text-red-600">{errors.subdominio}</p>
                  )}

                  <div className="text-xs text-muted-foreground">
                    <p>• Use apenas letras minúsculas, números e hífen</p>
                    <p>• Não pode começar ou terminar com hífen</p>
                    <p>• Mínimo 1 caractere, máximo 50 caracteres</p>
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
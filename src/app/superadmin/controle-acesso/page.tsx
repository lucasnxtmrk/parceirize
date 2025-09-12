'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Shield,
  Key,
  Users,
  Lock,
  Unlock,
  UserCheck,
  UserX,
  AlertTriangle,
  CheckCircle,
  Clock,
  Settings,
  Eye,
  Edit,
  Trash2,
  Plus,
  RefreshCw,
  Download,
  Search,
  Filter,
  Building2,
  Store,
  Globe
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/superadmin/ui/card'
import { Badge } from '@/components/superadmin/ui/badge'
import { Button } from '@/components/superadmin/ui/button'
import { Input } from '@/components/superadmin/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/superadmin/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/superadmin/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/superadmin/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/superadmin/ui/dialog'
import { Alert, AlertDescription } from '@/components/superadmin/ui/alert'
import { Label } from '@/components/superadmin/ui/label'

interface Permission {
  id: string
  name: string
  description: string
  category: string
  level: string
  usage: {
    totalUsage: number
    byRole: Record<string, number>
    uniqueUsers: number
  }
  assignedToRoles: string[]
}

interface Role {
  id: string
  name: string
  description: string
  permissions: string[]
  userCount: number
  canEdit: boolean
  systemRole: boolean
  level: number
}

interface User {
  id: number
  user_type: string
  nome: string
  email: string
  status: boolean
  created_at: string
  last_activity: string
  session_status: string
  tenant_id?: string
  provider_name?: string
  plano_nome?: string
  total_clientes?: number
  total_parceiros?: number
}

interface AccessStats {
  total_users: number
  active_users: number
  admins: {
    total: number
    active: number
    new_this_month: number
  }
  clientes: {
    total: number
    active: number
    new_this_month: number
  }
  parceiros: {
    total: number
    active: number
    new_this_month: number
  }
  active_users_week: number
}

export default function AccessControlPage() {
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('usuarios')
  
  // Estados para dados
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [statistics, setStatistics] = useState<AccessStats | null>(null)
  
  // Estados para filtros
  const [userTypeFilter, setUserTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  
  // Estados para modais
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [selectedPermission, setSelectedPermission] = useState<Permission | null>(null)

  useEffect(() => {
    if (session?.user?.role === 'superadmin') {
      fetchData()
    }
  }, [session, userTypeFilter, statusFilter, searchTerm])

  const fetchData = async () => {
    try {
      const [usersRes, rolesRes, permissionsRes] = await Promise.all([
        fetch(`/api/superadmin/usuarios?user_type=${userTypeFilter !== 'all' ? userTypeFilter : ''}&status=${statusFilter !== 'all' ? statusFilter : ''}&search=${searchTerm}`),
        fetch('/api/superadmin/roles'),
        fetch('/api/superadmin/permissoes')
      ])

      if (usersRes.ok) {
        const usersData = await usersRes.json()
        setUsers(usersData.users)
        setStatistics(usersData.statistics)
      }

      if (rolesRes.ok) {
        const rolesData = await rolesRes.json()
        setRoles(rolesData.roles)
      }

      if (permissionsRes.ok) {
        const permissionsData = await permissionsRes.json()
        setPermissions(permissionsData.permissions)
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleUserStatus = async (userId: number, userType: string, newStatus: boolean) => {
    try {
      const response = await fetch('/api/superadmin/usuarios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'toggle_status',
          user_id: userId,
          user_type: userType,
          status: newStatus
        })
      })

      if (response.ok) {
        fetchData()
      }
    } catch (error) {
      console.error('Erro ao alterar status do usuário:', error)
    }
  }

  const getUserTypeIcon = (userType: string) => {
    switch (userType) {
      case 'admin': return <Building2 className="h-4 w-4" />
      case 'cliente': return <Users className="h-4 w-4" />
      case 'parceiro': return <Store className="h-4 w-4" />
      default: return <Globe className="h-4 w-4" />
    }
  }

  const getUserTypeColor = (userType: string) => {
    switch (userType) {
      case 'admin': return 'bg-blue-500/10 text-blue-700'
      case 'cliente': return 'bg-green-500/10 text-green-700'
      case 'parceiro': return 'bg-purple-500/10 text-purple-700'
      default: return 'bg-gray-500/10 text-gray-700'
    }
  }

  const getSessionStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500/10 text-green-700'
      case 'recent': return 'bg-yellow-500/10 text-yellow-700'
      case 'offline': return 'bg-gray-500/10 text-gray-700'
      default: return 'bg-gray-500/10 text-gray-700'
    }
  }

  const getPermissionLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-500/10 text-red-700'
      case 'high': return 'bg-orange-500/10 text-orange-700'
      case 'medium': return 'bg-yellow-500/10 text-yellow-700'
      case 'low': return 'bg-green-500/10 text-green-700'
      default: return 'bg-gray-500/10 text-gray-700'
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Agora'
    if (diffInMinutes < 60) return `${diffInMinutes}min atrás`
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours}h atrás`
    
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays}d atrás`
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Carregando controle de acesso...</p>
        </div>
      </div>
    )
  }

  if (!statistics) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium">Erro ao carregar dados</p>
          <p className="text-sm text-muted-foreground">Tente recarregar a página</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Controle de Acesso</h1>
          <p className="text-sm text-muted-foreground">
            Gerenciamento de usuários, roles e permissões
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Atualizar
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Usuários</p>
                <p className="text-xl font-bold">{statistics.total_users}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Usuários Ativos</p>
                <p className="text-xl font-bold">{statistics.active_users}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Building2 className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Admins</p>
                <p className="text-xl font-bold">{statistics.admins.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <Shield className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Roles</p>
                <p className="text-xl font-bold">{roles.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-indigo-500/10 rounded-lg">
                <Key className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Permissões</p>
                <p className="text-xl font-bold">{permissions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="usuarios">Usuários</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="permissoes">Permissões</TabsTrigger>
        </TabsList>

        {/* Usuários Tab */}
        <TabsContent value="usuarios" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Filtros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Buscar</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Nome ou email..."
                      className="pl-9"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipo de Usuário</label>
                  <Select value={userTypeFilter} onValueChange={setUserTypeFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="cliente">Cliente</SelectItem>
                      <SelectItem value="parceiro">Parceiro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="inactive">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Users Table */}
          <Card>
            <CardHeader>
              <CardTitle>Usuários ({users.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Última Atividade</TableHead>
                      <TableHead>Sessão</TableHead>
                      <TableHead>Provedor</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={`${user.user_type}_${user.id}`}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{user.nome}</span>
                            <span className="text-xs text-muted-foreground">{user.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getUserTypeColor(user.user_type)}>
                            {getUserTypeIcon(user.user_type)}
                            <span className="ml-1 capitalize">{user.user_type}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={user.status ? 'bg-green-500/10 text-green-700' : 'bg-red-500/10 text-red-700'}>
                            {user.status ? <CheckCircle className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
                            <span className="ml-1">{user.status ? 'Ativo' : 'Inativo'}</span>
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatTimeAgo(user.last_activity)}
                        </TableCell>
                        <TableCell>
                          <Badge className={getSessionStatusColor(user.session_status)}>
                            {user.session_status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {user.provider_name || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedUser(user)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Detalhes do Usuário</DialogTitle>
                                </DialogHeader>
                                {selectedUser && (
                                  <div className="space-y-4">
                                    <div>
                                      <h4 className="font-medium mb-2">Informações Básicas</h4>
                                      <div className="space-y-2 text-sm">
                                        <div><span className="font-medium">Nome:</span> {selectedUser.nome}</div>
                                        <div><span className="font-medium">Email:</span> {selectedUser.email}</div>
                                        <div><span className="font-medium">Tipo:</span> {selectedUser.user_type}</div>
                                        <div><span className="font-medium">Status:</span> {selectedUser.status ? 'Ativo' : 'Inativo'}</div>
                                      </div>
                                    </div>
                                    <div>
                                      <h4 className="font-medium mb-2">Informações Adicionais</h4>
                                      <div className="space-y-2 text-sm">
                                        <div><span className="font-medium">Criado em:</span> {new Date(selectedUser.created_at).toLocaleString('pt-BR')}</div>
                                        <div><span className="font-medium">Última Atividade:</span> {formatTimeAgo(selectedUser.last_activity)}</div>
                                        {selectedUser.provider_name && (
                                          <div><span className="font-medium">Provedor:</span> {selectedUser.provider_name}</div>
                                        )}
                                        {selectedUser.plano_nome && (
                                          <div><span className="font-medium">Plano:</span> {selectedUser.plano_nome}</div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleUserStatus(user.id, user.user_type, !user.status)}
                            >
                              {user.status ? <Lock className="h-4 w-4 text-red-600" /> : <Unlock className="h-4 w-4 text-green-600" />}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Roles Tab */}
        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Roles do Sistema ({roles.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {roles.map((role) => (
                  <Card key={role.id} className="relative">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <Shield className="h-5 w-5 text-muted-foreground" />
                          <h3 className="font-medium">{role.name}</h3>
                        </div>
                        {role.systemRole && (
                          <Badge variant="secondary" className="text-xs">Sistema</Badge>
                        )}
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-3">
                        {role.description}
                      </p>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {role.userCount} usuário{role.userCount !== 1 ? 's' : ''}
                        </span>
                        <span className="text-muted-foreground">
                          {role.permissions.length} permissões
                        </span>
                      </div>
                      
                      <div className="mt-3 pt-3 border-t">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full"
                              onClick={() => setSelectedRole(role)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Ver Detalhes
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Detalhes do Role: {selectedRole?.name}</DialogTitle>
                            </DialogHeader>
                            {selectedRole && (
                              <div className="space-y-4">
                                <div>
                                  <h4 className="font-medium mb-2">Informações Básicas</h4>
                                  <div className="space-y-2 text-sm">
                                    <div><span className="font-medium">Nome:</span> {selectedRole.name}</div>
                                    <div><span className="font-medium">Descrição:</span> {selectedRole.description}</div>
                                    <div><span className="font-medium">Usuários:</span> {selectedRole.userCount}</div>
                                    <div><span className="font-medium">Tipo:</span> {selectedRole.systemRole ? 'Sistema' : 'Personalizado'}</div>
                                  </div>
                                </div>
                                <div>
                                  <h4 className="font-medium mb-2">Permissões ({selectedRole.permissions.length})</h4>
                                  <div className="grid grid-cols-2 gap-2">
                                    {selectedRole.permissions.map((perm) => (
                                      <Badge key={perm} variant="outline" className="text-xs">
                                        {perm}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Permissões Tab */}
        <TabsContent value="permissoes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Permissões do Sistema ({permissions.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {permissions.map((permission) => (
                  <Card key={permission.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <Key className="h-4 w-4 text-muted-foreground" />
                            <h3 className="font-medium">{permission.name}</h3>
                            <Badge className={getPermissionLevelColor(permission.level)}>
                              {permission.level}
                            </Badge>
                          </div>
                          
                          <p className="text-sm text-muted-foreground mb-2">
                            {permission.description}
                          </p>
                          
                          <div className="flex items-center space-x-4 text-sm">
                            <span className="text-muted-foreground">
                              Categoria: {permission.category}
                            </span>
                            <span className="text-muted-foreground">
                              Uso: {permission.usage.totalUsage} vezes
                            </span>
                            <span className="text-muted-foreground">
                              Usuários: {permission.usage.uniqueUsers}
                            </span>
                          </div>
                          
                          <div className="mt-2">
                            <span className="text-xs text-muted-foreground">Atribuída aos roles:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {permission.assignedToRoles.map((role) => (
                                <Badge key={role} variant="outline" className="text-xs">
                                  {role}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedPermission(permission)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
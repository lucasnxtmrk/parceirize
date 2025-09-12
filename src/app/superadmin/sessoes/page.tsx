'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Users,
  Monitor,
  Globe,
  Clock,
  MapPin,
  Smartphone,
  Laptop,
  Shield,
  Activity,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Ban,
  Eye,
  Search,
  Filter,
  Download
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

interface SessionData {
  session_id: string
  user_id: number
  user_name: string
  user_email: string
  user_type: 'superadmin' | 'admin' | 'cliente' | 'parceiro'
  ip_address: string
  user_agent: string
  device_type: string
  location: string
  login_time: string
  last_activity: string
  status: 'active' | 'expired' | 'terminated'
  duration: number
  tenant_id?: string
  provider_name?: string
}

interface SessionStats {
  total_sessions: number
  active_sessions: number
  expired_sessions: number
  unique_users: number
  avg_session_duration: number
  suspicious_sessions: number
}

export default function SessionsPage() {
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(true)
  const [sessions, setSessions] = useState<SessionData[]>([])
  const [statistics, setStatistics] = useState<SessionStats | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [userTypeFilter, setUserTypeFilter] = useState('all')
  const [selectedSession, setSelectedSession] = useState<SessionData | null>(null)

  useEffect(() => {
    if (session?.user?.role === 'superadmin') {
      fetchSessionsData()
    }
  }, [session, statusFilter, userTypeFilter, searchTerm])

  const fetchSessionsData = async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (userTypeFilter !== 'all') params.append('user_type', userTypeFilter)
      if (searchTerm) params.append('search', searchTerm)

      const response = await fetch(`/api/superadmin/sessoes?${params}`)
      if (response.ok) {
        const data = await response.json()
        setSessions(data.sessions)
        setStatistics(data.statistics)
      }
    } catch (error) {
      console.error('Erro ao carregar sessões:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTerminateSession = async (sessionId: string, userId: number, userType: string) => {
    if (!confirm('Deseja realmente encerrar esta sessão?')) return
    
    try {
      const response = await fetch('/api/superadmin/sessoes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'terminate_session',
          session_id: sessionId,
          user_id: userId,
          user_type: userType
        })
      })

      if (response.ok) {
        fetchSessionsData()
      }
    } catch (error) {
      console.error('Erro ao encerrar sessão:', error)
    }
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}m`
    }
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}m`
  }

  const formatTimeAgo = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Agora'
    if (diffInMinutes < 60) return `${diffInMinutes} minuto${diffInMinutes > 1 ? 's' : ''} atrás`
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours} hora${diffInHours > 1 ? 's' : ''} atrás`
    
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays} dia${diffInDays > 1 ? 's' : ''} atrás`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/10 text-green-700'
      case 'expired': return 'bg-yellow-500/10 text-yellow-700'
      case 'terminated': return 'bg-red-500/10 text-red-700'
      default: return 'bg-gray-500/10 text-gray-700'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4" />
      case 'expired': return <Clock className="h-4 w-4" />
      case 'terminated': return <Ban className="h-4 w-4" />
      default: return <AlertTriangle className="h-4 w-4" />
    }
  }

  const getUserTypeColor = (type: string) => {
    switch (type) {
      case 'superadmin': return 'bg-red-500/10 text-red-700'
      case 'admin': return 'bg-blue-500/10 text-blue-700'
      case 'cliente': return 'bg-green-500/10 text-green-700'
      case 'parceiro': return 'bg-purple-500/10 text-purple-700'
      default: return 'bg-gray-500/10 text-gray-700'
    }
  }

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType?.toLowerCase()) {
      case 'mobile': return <Smartphone className="h-4 w-4" />
      case 'desktop': return <Laptop className="h-4 w-4" />
      case 'tablet': return <Monitor className="h-4 w-4" />
      default: return <Monitor className="h-4 w-4" />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Carregando sessões...</p>
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
          <h1 className="text-2xl font-bold tracking-tight">Sessões Ativas</h1>
          <p className="text-sm text-muted-foreground">
            Monitoramento e controle de sessões de usuários
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => fetchSessionsData()}>
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
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Activity className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total</p>
                <p className="text-xl font-bold">{statistics.total_sessions}</p>
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
                <p className="text-sm font-medium text-muted-foreground">Ativas</p>
                <p className="text-xl font-bold">{statistics.active_sessions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Expiradas</p>
                <p className="text-xl font-bold">{statistics.expired_sessions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Usuários</p>
                <p className="text-xl font-bold">{statistics.unique_users}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-indigo-500/10 rounded-lg">
                <Clock className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Duração Média</p>
                <p className="text-xl font-bold">{statistics.avg_session_duration}min</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <Shield className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Suspeitas</p>
                <p className="text-xl font-bold">{statistics.suspicious_sessions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="expired">Expirado</SelectItem>
                  <SelectItem value="terminated">Encerrado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Usuário</label>
              <Select value={userTypeFilter} onValueChange={setUserTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="superadmin">SuperAdmin</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="cliente">Cliente</SelectItem>
                  <SelectItem value="parceiro">Parceiro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sessions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Sessões ({sessions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Dispositivo</TableHead>
                  <TableHead>Localização</TableHead>
                  <TableHead>Última Atividade</TableHead>
                  <TableHead>Duração</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((sessionData) => (
                  <TableRow key={sessionData.session_id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{sessionData.user_name}</span>
                        <span className="text-xs text-muted-foreground">{sessionData.user_email}</span>
                        {sessionData.provider_name && (
                          <span className="text-xs text-muted-foreground">{sessionData.provider_name}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getUserTypeColor(sessionData.user_type)}>
                        {sessionData.user_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(sessionData.status)}>
                        {getStatusIcon(sessionData.status)}
                        <span className="ml-1 capitalize">{sessionData.status}</span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getDeviceIcon(sessionData.device_type)}
                        <span className="text-sm">{sessionData.device_type}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{sessionData.location}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatTimeAgo(sessionData.last_activity)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDuration(sessionData.duration)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedSession(sessionData)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Detalhes da Sessão</DialogTitle>
                            </DialogHeader>
                            {selectedSession && (
                              <div className="space-y-4">
                                <div>
                                  <h4 className="font-medium mb-2">Informações do Usuário</h4>
                                  <div className="space-y-2 text-sm">
                                    <div><span className="font-medium">Nome:</span> {selectedSession.user_name}</div>
                                    <div><span className="font-medium">Email:</span> {selectedSession.user_email}</div>
                                    <div><span className="font-medium">Tipo:</span> {selectedSession.user_type}</div>
                                  </div>
                                </div>
                                <div>
                                  <h4 className="font-medium mb-2">Informações Técnicas</h4>
                                  <div className="space-y-2 text-sm">
                                    <div><span className="font-medium">IP:</span> {selectedSession.ip_address}</div>
                                    <div><span className="font-medium">User Agent:</span> {selectedSession.user_agent}</div>
                                    <div><span className="font-medium">Dispositivo:</span> {selectedSession.device_type}</div>
                                    <div><span className="font-medium">Localização:</span> {selectedSession.location}</div>
                                  </div>
                                </div>
                                <div>
                                  <h4 className="font-medium mb-2">Sessão</h4>
                                  <div className="space-y-2 text-sm">
                                    <div><span className="font-medium">Login:</span> {formatDate(selectedSession.login_time)}</div>
                                    <div><span className="font-medium">Última Atividade:</span> {formatDate(selectedSession.last_activity)}</div>
                                    <div><span className="font-medium">Duração:</span> {formatDuration(selectedSession.duration)}</div>
                                    <div><span className="font-medium">Status:</span> {selectedSession.status}</div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                        
                        {sessionData.status === 'active' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleTerminateSession(sessionData.session_id, sessionData.user_id, sessionData.user_type)}
                          >
                            <Ban className="h-4 w-4 text-red-600" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {sessions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma sessão encontrada</p>
              <p className="text-xs">Ajuste os filtros ou tente novamente</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
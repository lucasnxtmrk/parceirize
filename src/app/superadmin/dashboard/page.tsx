'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import {
  Building2,
  Users,
  Store,
  CreditCard,
  TrendingUp,
  TrendingDown,
  MapPin,
  Package,
  DollarSign,
  Activity,
  Calendar,
  Clock
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/superadmin/ui/card'
import { Badge } from '@/components/superadmin/ui/badge'
import { Button } from '@/components/superadmin/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/superadmin/ui/tabs'
import { KPICard } from '@/components/superadmin/KPICard'
import { BrazilMap } from '@/components/superadmin/BrazilMap'

interface DashboardData {
  kpis: {
    totalProvedores: { value: number; trend: { value: number; isPositive: boolean; period?: string } }
    provedoresAtivos: { value: number; trend: { value: number; isPositive: boolean; period?: string } }
    totalClientes: { value: number; trend: { value: number; isPositive: boolean; period?: string } }
    totalParceiros: { value: number; trend: { value: number; isPositive: boolean; period?: string } }
    receitaMensal: { value: number; trend: { value: number; isPositive: boolean; period?: string } }
    totalVouchers: { value: number; trend: { value: number; isPositive: boolean; period?: string } }
    vouchersUtilizados: { value: number; trend: { value: number; isPositive: boolean; period?: string } }
    ticketMedio: { value: number; trend: { value: number; isPositive: boolean; period?: string } }
  }
  charts: {
    crescimentoMensal: Array<{ mes: string; provedores: number; clientes: number; receita: number }>
    distribuicaoPlanos: Array<{ nome: string; quantidade: number; receita: number; color: string }>
  }
  recentActivity: Array<{
    id: number
    type: string
    message: string
    time: string
    severity: string
  }>
}

export default function SuperAdminDashboard() {
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState('30d')
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)

  useEffect(() => {
    if (session?.user?.role === 'superadmin') {
      fetchDashboardData()
    }
  }, [session])

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/superadmin/dashboard')
      if (response.ok) {
        const data = await response.json()
        setDashboardData(data)
      }
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  if (status === 'loading' || loading || !dashboardData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Carregando dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4">
      {/* Header - Compacto */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Visão geral da plataforma
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-1" />
            30 dias
          </Button>
          <Button variant="outline" size="sm">
            <Package className="h-4 w-4 mr-1" />
            Exportar
          </Button>
        </div>
      </div>

      {/* KPIs Grid - Compacto */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Provedores"
          value={dashboardData.kpis.totalProvedores.value}
          subtitle="Empresas ativas"
          icon={Building2}
          trend={dashboardData.kpis.totalProvedores.trend}
        />
        
        <KPICard
          title="Clientes"
          value={dashboardData.kpis.totalClientes.value}
          subtitle="Usuários ativos"
          icon={Users}
          trend={dashboardData.kpis.totalClientes.trend}
        />
        
        <KPICard
          title="Parceiros"
          value={dashboardData.kpis.totalParceiros.value}
          subtitle="Estabelecimentos"
          icon={Store}
          trend={dashboardData.kpis.totalParceiros.trend}
        />
        
        <KPICard
          title="Receita Mensal"
          value={formatCurrency(dashboardData.kpis.receitaMensal.value)}
          subtitle="Faturamento total"
          icon={DollarSign}
          trend={dashboardData.kpis.receitaMensal.trend}
        />
      </div>

      {/* Second KPI Row - Compacto */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Vouchers Ativos"
          value={dashboardData.kpis.totalVouchers.value}
          subtitle="Cupons disponíveis"
          icon={CreditCard}
          trend={dashboardData.kpis.totalVouchers.trend}
        />
        
        <KPICard
          title="Vouchers Utilizados"
          value={dashboardData.kpis.vouchersUtilizados.value}
          subtitle="Cupons resgatados"
          icon={Activity}
          trend={dashboardData.kpis.vouchersUtilizados.trend}
        />
        
        <KPICard
          title="Ticket Médio"
          value={formatCurrency(dashboardData.kpis.ticketMedio.value)}
          subtitle="Valor médio"
          icon={TrendingUp}
          trend={dashboardData.kpis.ticketMedio.trend}
        />
        
        <KPICard
          title="Provedores Ativos"
          value={dashboardData.kpis.provedoresAtivos.value}
          subtitle="Em funcionamento"
          icon={Building2}
          trend={dashboardData.kpis.provedoresAtivos.trend}
        />
      </div>

      {/* Charts Grid - Compacto */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-7">
        {/* Crescimento Mensal */}
        <motion.div 
          className="lg:col-span-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Crescimento da Plataforma</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={dashboardData.charts.crescimentoMensal}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => {
                      if (name === 'receita') return [formatCurrency(value as number), 'Receita']
                      return [value, name === 'provedores' ? 'Provedores' : 'Clientes']
                    }}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="clientes" stackId="1" stroke="hsl(var(--muted-foreground))" fill="hsl(var(--muted))" fillOpacity={0.6} name="clientes" />
                  <Area type="monotone" dataKey="provedores" stackId="2" stroke="hsl(var(--foreground))" fill="hsl(var(--accent))" fillOpacity={0.8} name="provedores" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Distribuição de Planos */}
        <motion.div 
          className="lg:col-span-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Distribuição de Planos</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={dashboardData.charts.distribuicaoPlanos}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="quantidade"
                    label={(entry) => `${entry.nome}: ${entry.quantidade}`}
                  >
                    {dashboardData.charts.distribuicaoPlanos.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [value, 'Quantidade']} />
                </PieChart>
              </ResponsiveContainer>
              
              {/* Legend */}
              <div className="mt-4 space-y-2">
                {dashboardData.charts.distribuicaoPlanos.map((item, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: item.color }}
                      />
                      <span>{item.nome}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{item.quantidade} provedores</div>
                      <div className="text-xs text-muted-foreground">{formatCurrency(item.receita)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Brasil Map + Activity Feed */}
      <div className="grid gap-3 md:grid-cols-3">
        {/* Mapa do Brasil */}
        <motion.div 
          className="md:col-span-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <BrazilMap height={400} />
        </motion.div>

        {/* Activity Feed */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>Atividade Recente</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboardData.recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3 p-2 rounded-lg hover:bg-muted/50">
                    <div className={`rounded-full p-1 mt-0.5 ${
                      activity.severity === 'success' ? 'bg-green-500/10 text-green-600' :
                      activity.severity === 'info' ? 'bg-blue-500/10 text-blue-600' :
                      activity.severity === 'warning' ? 'bg-yellow-500/10 text-yellow-600' :
                      activity.severity === 'celebration' ? 'bg-purple-500/10 text-purple-600' :
                      'bg-gray-500/10 text-gray-600'
                    }`}>
                      <Activity className="h-3 w-3" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">{activity.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 pt-4 border-t">
                <Button variant="outline" size="sm" className="w-full">
                  Ver todas as atividades
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

    </div>
  )
}
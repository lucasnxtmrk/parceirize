import { Calendar, CreditCard, Wallet, BarChart2, TrendingUp, AlertTriangle, Wifi, CheckCircle, Clock, XCircle } from "lucide-react"
import { useEffect, useState } from "react"
import { useSession } from "@/hooks/use-session" 
import { useRouter } from "next/navigation"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"

interface ProviderData {
  provider: {
    id: string
    companyName: string
    status: string
    sgpIntegration: {
      isActive: boolean
      lastSync: string | null
    } | null
  }
}

interface QuickAction {
  title: string
  description: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  disabled?: boolean
}

export default function ContentProvider() {
  const { user } = useSession()
  const router = useRouter()
  const [providerData, setProviderData] = useState<ProviderData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchProviderData()
  }, [])

  const fetchProviderData = async () => {
    try {
      const response = await fetch("/api/provider/me")
      if (response.ok) {
        const data = await response.json()
        setProviderData(data)
      }
    } catch (error) {
      console.error("Error fetching provider data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusInfo = (status: string) => {
    const statusMap = {
      'PENDING': { 
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
        icon: Clock, 
        text: 'Pendente' 
      },
      'ACTIVE': { 
        color: 'bg-green-100 text-green-800 border-green-200', 
        icon: CheckCircle, 
        text: 'Ativo' 
      },
      'SUSPENDED': { 
        color: 'bg-red-100 text-red-800 border-red-200', 
        icon: XCircle, 
        text: 'Suspenso' 
      }
    }
    return statusMap[status as keyof typeof statusMap] || statusMap.PENDING
  }

  const quickActions: QuickAction[] = [
    {
      title: "Módulo Financeiro",
      description: "Acesse receitas, despesas e indicadores financeiros",
      href: "/dashboard/financeiro",
      icon: BarChart2,
      color: "border-blue-200 bg-blue-50 hover:bg-blue-100",
      disabled: !providerData?.provider.sgpIntegration?.isActive
    },
    {
      title: "Receitas",
      description: "Análise de entradas por forma de pagamento",
      href: "/dashboard/financeiro/receitas", 
      icon: TrendingUp,
      color: "border-green-200 bg-green-50 hover:bg-green-100",
      disabled: !providerData?.provider.sgpIntegration?.isActive
    },
    {
      title: "Inadimplência",
      description: "Controle de títulos vencidos e em atraso",
      href: "/dashboard/financeiro/inadimplencia",
      icon: AlertTriangle,
      color: "border-orange-200 bg-orange-50 hover:bg-orange-100",
      disabled: !providerData?.provider.sgpIntegration?.isActive
    },
    {
      title: "Integrações SGP",
      description: providerData?.provider.sgpIntegration?.isActive 
        ? "Gerenciar integração ativa"
        : "Configurar conexão com SGP",
      href: "/dashboard/integracoes",
      icon: Wifi,
      color: "border-purple-200 bg-purple-50 hover:bg-purple-100",
      disabled: false
    }
  ]

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white dark:bg-[#0F0F12] rounded-xl p-6 border border-gray-200 dark:border-[#1F1F23] animate-pulse">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-2"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const statusInfo = getStatusInfo(providerData?.provider.status || 'PENDING')
  const StatusIcon = statusInfo.icon

  return (
    <div className="space-y-6">
      {/* Boas-vindas */}
      <div className="bg-white dark:bg-[#0F0F12] rounded-xl p-6 border border-gray-200 dark:border-[#1F1F23]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Olá, {user?.name}! 👋
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Bem-vindo ao painel BI de {providerData?.provider.companyName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusIcon className="h-5 w-5" />
            <Badge className={statusInfo.color}>
              {statusInfo.text}
            </Badge>
          </div>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl p-6 flex flex-col border border-gray-200 dark:border-[#1F1F23]">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 text-left flex items-center gap-2">
            <Wallet className="w-5 h-5 text-blue-600" />
            Status da Conta
          </h2>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <StatusIcon className="h-8 w-8 text-gray-600" />
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">{statusInfo.text}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {providerData?.provider.status === 'ACTIVE' 
                    ? 'Conta funcionando normalmente'
                    : providerData?.provider.status === 'PENDING'
                    ? 'Aguardando aprovação do admin'
                    : 'Entre em contato com o suporte'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0F0F12] rounded-xl p-6 flex flex-col border border-gray-200 dark:border-[#1F1F23]">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 text-left flex items-center gap-2">
            <Wifi className="w-5 h-5 text-purple-600" />
            Integração SGP
          </h2>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              {providerData?.provider.sgpIntegration?.isActive ? (
                <CheckCircle className="h-8 w-8 text-green-600" />
              ) : (
                <XCircle className="h-8 w-8 text-gray-400" />
              )}
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {providerData?.provider.sgpIntegration?.isActive ? 'Conectado' : 'Não Configurado'}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {providerData?.provider.sgpIntegration?.isActive 
                    ? 'Dados sincronizados automaticamente'
                    : 'Configure para acessar os relatórios'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0F0F12] rounded-xl p-6 flex flex-col border border-gray-200 dark:border-[#1F1F23]">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 text-left flex items-center gap-2">
            <Calendar className="w-5 h-5 text-green-600" />
            Última Sincronização
          </h2>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-gray-600" />
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {providerData?.provider.sgpIntegration?.lastSync 
                    ? new Date(providerData.provider.sgpIntegration.lastSync).toLocaleDateString('pt-BR')
                    : 'Nunca'
                  }
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Sincronização dos dados do SGP
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ações Rápidas */}
      <div className="bg-white dark:bg-[#0F0F12] rounded-xl p-6 border border-gray-200 dark:border-[#1F1F23]">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6 text-left flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-blue-600" />
          Ações Rápidas
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <button
                key={action.title}
                onClick={() => !action.disabled && router.push(action.href)}
                disabled={action.disabled}
                className={`
                  p-4 rounded-lg border-2 text-left transition-colors
                  ${action.disabled 
                    ? 'opacity-50 cursor-not-allowed bg-gray-50 border-gray-200' 
                    : `${action.color} cursor-pointer`
                  }
                `}
              >
                <Icon className={`h-8 w-8 mb-3 ${action.disabled ? 'text-gray-400' : ''}`} />
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  {action.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {action.description}
                </p>
                {action.disabled && (
                  <Badge className="mt-2 bg-gray-100 text-gray-600">
                    Configure SGP
                  </Badge>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
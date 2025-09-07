import { Calendar, CreditCard, Wallet, BarChart2, TrendingUp, AlertTriangle, Wifi, CheckCircle, Clock, XCircle, ArrowUpRight, ArrowDownLeft, DollarSign, Building2, Users2 } from "lucide-react"
import { useEffect, useState } from "react"
import { useSession } from "@/hooks/use-session" 
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

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

// Dados dos indicadores financeiros no estilo do template
const financialIndicators = [
  {
    id: "1",
    title: "Receitas",
    description: "Fluxo de entrada",
    balance: "R$ 125.450,00",
    type: "income",
    href: "/dashboard/financeiro/receitas"
  },
  {
    id: "2", 
    title: "Despesas",
    description: "Fluxo de saída",
    balance: "R$ 45.230,00",
    type: "expense",
    href: "/dashboard/financeiro/despesas"
  },
  {
    id: "3",
    title: "Inadimplência",
    description: "Títulos em atraso",
    balance: "R$ 12.890,00",
    type: "debt",
    href: "/dashboard/financeiro/inadimplencia"
  },
  {
    id: "4",
    title: "Faturamento",
    description: "Total do mês",
    balance: "R$ 185.670,00",
    type: "revenue",
    href: "/dashboard/financeiro/faturamento"
  },
  {
    id: "5",
    title: "Cancelamentos",
    description: "Contratos cancelados",
    balance: "15 clientes",
    type: "churn",
    href: "/dashboard/financeiro/cancelamentos"
  },
]

// Transações recentes no estilo do template
const recentActivity = [
  {
    id: "1",
    title: "Pagamento Boleto",
    amount: "R$ 2.450,00",
    type: "incoming" as const,
    category: "payment",
    icon: CreditCard,
    timestamp: "Hoje, 14:32",
    status: "completed" as const,
  },
  {
    id: "2",
    title: "Taxa SGP",
    amount: "R$ 89,90",
    type: "outgoing" as const,
    category: "subscription",
    icon: Wifi,
    timestamp: "Hoje, 09:15",
    status: "completed" as const,
  },
  {
    id: "3",
    title: "Cobrança Automática",
    amount: "R$ 1.250,00",
    type: "incoming" as const,
    category: "auto-billing",
    icon: Building2,
    timestamp: "Ontem, 18:45",
    status: "pending" as const,
  },
  {
    id: "4",
    title: "Multa por Atraso",
    amount: "R$ 125,50",
    type: "incoming" as const,
    category: "fee",
    icon: AlertTriangle,
    timestamp: "Ontem, 16:20",
    status: "completed" as const,
  },
]

// Metas e objetivos no estilo do template
const businessGoals = [
  {
    id: "1",
    title: "Meta Receita Mensal",
    subtitle: "Objetivo de faturamento para este mês",
    icon: TrendingUp,
    iconStyle: "income",
    date: "Meta: Dez 2024",
    amount: "R$ 200.000",
    status: "in-progress" as const,
    progress: 78,
  },
  {
    id: "2",
    title: "Reduzir Inadimplência",
    subtitle: "Diminuir taxa de inadimplência para 5%",
    icon: AlertTriangle,
    iconStyle: "debt",
    date: "Meta: Mar 2025",
    amount: "5%",
    status: "pending" as const,
    progress: 42,
  },
  {
    id: "3",
    title: "Crescimento Clientes",
    subtitle: "Aumentar base de clientes ativos",
    icon: Users2,
    iconStyle: "growth",
    date: "Meta: Jun 2025",
    amount: "2.500",
    status: "in-progress" as const,
    progress: 65,
  },
]

const iconStyles = {
  income: "bg-emerald-100 dark:bg-emerald-900/30",
  debt: "bg-red-100 dark:bg-red-900/30",
  growth: "bg-blue-100 dark:bg-blue-900/30",
}

const statusConfig = {
  pending: {
    icon: Clock,
    class: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-100 dark:bg-amber-900/30",
  },
  "in-progress": {
    icon: CheckCircle,
    class: "text-blue-600 dark:text-blue-400", 
    bg: "bg-blue-100 dark:bg-blue-900/30",
  },
  completed: {
    icon: CheckCircle,
    class: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
  },
}

export default function ContentProviderNew() {
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

  const totalBalance = "R$ 268.350,00"

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white dark:bg-zinc-900/70 border border-zinc-100 dark:border-zinc-800 rounded-xl shadow-sm backdrop-blur-xl p-6 animate-pulse">
              <div className="h-6 bg-zinc-200 dark:bg-zinc-700 rounded w-1/3 mb-4"></div>
              <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Indicadores Financeiros - Estilo List01 */}
        <div className="bg-white dark:bg-zinc-900/70 rounded-xl p-6 flex flex-col border border-zinc-100 dark:border-zinc-800 shadow-sm backdrop-blur-xl">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-4 text-left flex items-center gap-2">
            <Wallet className="w-4 h-4 text-zinc-900 dark:text-zinc-50" />
            Indicadores Financeiros
          </h2>
          
          {/* Total Balance Section */}
          <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 mb-4">
            <p className="text-xs text-zinc-600 dark:text-zinc-400">Saldo Total</p>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{totalBalance}</h1>
          </div>

          {/* Indicators List */}
          <div className="flex-1">
            <div className="space-y-1">
              {financialIndicators.slice(0, 5).map((indicator) => (
                <div
                  key={indicator.id}
                  className={cn(
                    "group flex items-center justify-between cursor-pointer",
                    "p-2 rounded-lg",
                    "hover:bg-zinc-100 dark:hover:bg-zinc-800/50",
                    "transition-all duration-200",
                  )}
                  onClick={() => router.push(indicator.href)}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={cn("p-1.5 rounded-lg", {
                        "bg-emerald-100 dark:bg-emerald-900/30": indicator.type === "income" || indicator.type === "revenue",
                        "bg-red-100 dark:bg-red-900/30": indicator.type === "expense" || indicator.type === "debt",
                        "bg-blue-100 dark:bg-blue-900/30": indicator.type === "churn",
                      })}
                    >
                      {indicator.type === "income" && (
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      )}
                      {indicator.type === "expense" && (
                        <ArrowDownLeft className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                      )}
                      {indicator.type === "debt" && (
                        <AlertTriangle className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                      )}
                      {indicator.type === "revenue" && (
                        <BarChart2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      )}
                      {indicator.type === "churn" && (
                        <Users2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-xs font-medium text-zinc-900 dark:text-zinc-100">{indicator.title}</h3>
                      <p className="text-[11px] text-zinc-600 dark:text-zinc-400">{indicator.description}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">{indicator.balance}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Atividade Recente - Estilo List02 */}
        <div className="bg-white dark:bg-zinc-900/70 rounded-xl p-6 flex flex-col border border-zinc-100 dark:border-zinc-800 shadow-sm backdrop-blur-xl">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-4 text-left flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-zinc-900 dark:text-zinc-50" />
            Atividade Recente
          </h2>
          
          <div className="flex-1">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Transações
                <span className="text-xs font-normal text-zinc-600 dark:text-zinc-400 ml-1">(156 este mês)</span>
              </h2>
              <span className="text-xs text-zinc-600 dark:text-zinc-400">Últimas 24h</span>
            </div>

            <div className="space-y-1">
              {recentActivity.map((transaction) => (
                <div
                  key={transaction.id}
                  className={cn(
                    "group flex items-center gap-3",
                    "p-2 rounded-lg", 
                    "hover:bg-zinc-100 dark:hover:bg-zinc-800/50",
                    "transition-all duration-200",
                  )}
                >
                  <div
                    className={cn(
                      "p-2 rounded-lg",
                      "bg-zinc-100 dark:bg-zinc-800",
                      "border border-zinc-200 dark:border-zinc-700",
                    )}
                  >
                    <transaction.icon className="w-4 h-4 text-zinc-900 dark:text-zinc-100" />
                  </div>

                  <div className="flex-1 flex items-center justify-between min-w-0">
                    <div className="space-y-0.5">
                      <h3 className="text-xs font-medium text-zinc-900 dark:text-zinc-100">{transaction.title}</h3>
                      <p className="text-[11px] text-zinc-600 dark:text-zinc-400">{transaction.timestamp}</p>
                    </div>

                    <div className="flex items-center gap-1.5 pl-3">
                      <span
                        className={cn(
                          "text-xs font-medium",
                          transaction.type === "incoming"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-600 dark:text-red-400",
                        )}
                      >
                        {transaction.type === "incoming" ? "+" : "-"}
                        {transaction.amount}
                      </span>
                      {transaction.type === "incoming" ? (
                        <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <ArrowUpRight className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Metas e Objetivos - Estilo List03 */}
      <div className="bg-white dark:bg-zinc-900/70 rounded-xl p-6 flex flex-col items-start justify-start border border-zinc-100 dark:border-zinc-800 shadow-sm backdrop-blur-xl">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-4 text-left flex items-center gap-2">
          <Calendar className="w-4 h-4 text-zinc-900 dark:text-zinc-50" />
          Metas e Objetivos
        </h2>
        
        <div className="w-full overflow-x-auto scrollbar-none">
          <div className="flex gap-3 min-w-full p-1">
            {businessGoals.map((goal) => (
              <div
                key={goal.id}
                className={cn(
                  "flex flex-col",
                  "w-[280px] shrink-0",
                  "bg-white dark:bg-zinc-900/70",
                  "rounded-xl",
                  "border border-zinc-100 dark:border-zinc-800",
                  "hover:border-zinc-200 dark:hover:border-zinc-700",
                  "transition-all duration-200",
                  "shadow-sm backdrop-blur-xl",
                )}
              >
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className={cn("p-2 rounded-lg", iconStyles[goal.iconStyle as keyof typeof iconStyles])}>
                      <goal.icon className="w-4 h-4" />
                    </div>
                    <div
                      className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1.5",
                        statusConfig[goal.status].bg,
                        statusConfig[goal.status].class,
                      )}
                    >
                      {(() => {
                        const StatusIcon = statusConfig[goal.status].icon
                        return <StatusIcon className="w-3.5 h-3.5" />
                      })()}
                      {goal.status === 'in-progress' ? 'Em Progresso' : goal.status === 'pending' ? 'Pendente' : 'Concluído'}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-1">{goal.title}</h3>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2">{goal.subtitle}</p>
                  </div>

                  {typeof goal.progress === "number" && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-600 dark:text-zinc-400">Progresso</span>
                        <span className="text-zinc-900 dark:text-zinc-100">{goal.progress}%</span>
                      </div>
                      <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-zinc-900 dark:bg-zinc-100 rounded-full"
                          style={{ width: `${goal.progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {goal.amount && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{goal.amount}</span>
                      <span className="text-xs text-zinc-600 dark:text-zinc-400">meta</span>
                    </div>
                  )}

                  <div className="flex items-center text-xs text-zinc-600 dark:text-zinc-400">
                    <Calendar className="w-3.5 h-3.5 mr-1.5" />
                    <span>{goal.date}</span>
                  </div>
                </div>

                <div className="mt-auto border-t border-zinc-100 dark:border-zinc-800">
                  <button
                    className={cn(
                      "w-full flex items-center justify-center gap-2",
                      "py-2.5 px-3",
                      "text-xs font-medium",
                      "text-zinc-600 dark:text-zinc-400",
                      "hover:text-zinc-900 dark:hover:text-zinc-100",
                      "hover:bg-zinc-100 dark:hover:bg-zinc-800/50",
                      "transition-colors duration-200",
                    )}
                  >
                    Ver Detalhes
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
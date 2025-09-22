'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/superadmin/ui/button'
import { Badge } from '@/components/superadmin/ui/badge'
import { Separator } from '@/components/superadmin/ui/separator'
import { 
  Settings, 
  BarChart3, 
  Building2, 
  CreditCard, 
  Users, 
  Store, 
  FileText, 
  LogOut,
  Shield,
  Database,
  CloudDownload,
  Lock,
  UserCog,
  KeyRound,
  Activity,
  Repeat,
  DollarSign,
  AlertTriangle,
  Wrench,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Eye,
  ShieldCheck
} from 'lucide-react'
import './globals.css'

const MENU_ITEMS = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: BarChart3,
    url: '/superadmin/dashboard'
  },
  {
    key: 'gestao',
    label: 'Gestão',
    icon: FolderOpen,
    hasSubmenu: true,
    submenu: [
      {
        key: 'provedores',
        label: 'Provedores',
        icon: Building2,
        url: '/superadmin/provedores'
      },
      {
        key: 'planos',
        label: 'Planos',
        icon: CreditCard,
        url: '/superadmin/planos'
      },
      {
        key: 'clientes',
        label: 'Clientes',
        icon: Users,
        url: '/superadmin/clientes'
      },
      {
        key: 'parceiros',
        label: 'Parceiros',
        icon: Store,
        url: '/superadmin/parceiros'
      }
    ]
  },
  {
    key: 'monitoramento',
    label: 'Monitoramento',
    icon: Eye,
    hasSubmenu: true,
    submenu: [
      {
        key: 'financeiro',
        label: 'Controle Financeiro',
        icon: DollarSign,
        url: '/superadmin/financeiro'
      },
      {
        key: 'transacoes',
        label: 'Transações',
        icon: TrendingUp,
        url: '/superadmin/transacoes'
      },
      {
        key: 'integracoes',
        label: 'Integrações',
        icon: Repeat,
        url: '/superadmin/integracoes'
      },
      {
        key: 'relatorios',
        label: 'Relatórios',
        icon: FileText,
        url: '/superadmin/relatorios'
      }
    ]
  },
  {
    key: 'seguranca',
    label: 'Segurança',
    icon: ShieldCheck,
    hasSubmenu: true,
    submenu: [
      {
        key: 'auditoria',
        label: 'Logs de Auditoria',
        icon: Lock,
        url: '/superadmin/auditoria'
      },
      {
        key: 'controle-acesso',
        label: 'Controle de Acesso',
        icon: UserCog,
        url: '/superadmin/controle-acesso'
      },
      {
        key: 'sessoes',
        label: 'Sessões',
        icon: KeyRound,
        url: '/superadmin/sessoes'
      }
    ]
  },
  {
    key: 'apis',
    label: 'APIs & Testes',
    icon: Database,
    url: '/superadmin/apis'
  },
  {
    key: 'configuracoes',
    label: 'Configurações',
    icon: Settings,
    url: '/superadmin/configuracoes'
  }
]

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set(['gestao']))
  const [stats, setStats] = useState({
    provedores_pendentes: 0,
    vencimentos_proximos: 0
  })

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/auth/login')
      return
    }

    if (session.user.role !== 'superadmin') {
      router.push('/dashboard')
      return
    }

    // Buscar estatísticas para badges
    fetchStats()
  }, [session, status, router])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/superadmin/dashboard-stats')
      const data = await response.json()
      setStats({
        provedores_pendentes: data.provedoresPendentes || 0,
        vencimentos_proximos: data.vencimentosProximos || 0
      })
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error)
    }
  }

  const handleLogout = async () => {
    const { signOut } = await import('next-auth/react')
    await signOut({ callbackUrl: '/auth/login-admin' })
  }

  const toggleMenu = (key: string) => {
    setExpandedMenus(prev => {
      const newSet = new Set(prev)
      if (newSet.has(key)) {
        newSet.delete(key)
      } else {
        newSet.add(key)
      }
      return newSet
    })
  }

  const isActiveRoute = (url?: string) => {
    if (!url) return false
    if (url === '/superadmin/dashboard') {
      return pathname === '/superadmin/dashboard'
    }
    return pathname.startsWith(url)
  }

  const hasActiveSubmenuItem = (submenu?: any[]) => {
    if (!submenu) return false
    return submenu.some(item => isActiveRoute(item.url))
  }

  if (status === 'loading') {
    return (
      <div className="flex justify-center items-center min-h-screen bg-background">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Carregando SuperAdmin...</p>
        </div>
      </div>
    )
  }

  if (!session || session.user.role !== 'superadmin') {
    return null
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar sempre ativo */}
      <aside className="fixed left-0 top-0 z-50 h-screen w-64 border-r bg-card flex flex-col">
        {/* Logo/Header */}
        <div className="flex h-16 items-center border-b px-4">
          <Link href="/superadmin/dashboard" className="flex items-center space-x-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg text-black/90">SuperAdmin</span>
          </Link>
        </div>
        
        {/* Navigation */}
        <div className="flex flex-col flex-1 px-4 py-4">
          <nav className="sidebar-nav flex-1 space-y-1">
            {MENU_ITEMS.map((item) => {
              const IconComponent = item.icon
              const isActive = isActiveRoute(item.url)
              const isExpanded = expandedMenus.has(item.key)
              const hasActiveChild = hasActiveSubmenuItem(item.submenu)
              
              return (
                <div key={item.key} className="space-y-1">
                  {item.hasSubmenu ? (
                    // Item de menu com submenu
                    <button
                      onClick={() => toggleMenu(item.key)}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none ${
                        hasActiveChild
                          ? 'bg-gray-100 text-primary'
                          : 'text-black hover:bg-gray-100 hover:text-gray-700'
                      }`}
                    >
                      <IconComponent className="h-4 w-4 flex-shrink-0" />
                      <span className="flex-1 text-left">{item.label}</span>
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 flex-shrink-0" />
                      )}
                    </button>
                  ) : (
                    // Item de menu normal
                    <Link
                      href={item.url!}
                      className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none ${
                        isActive
                          ? 'bg-primary text-white'
                          : 'text-black hover:bg-gray-100 hover:text-gray-700'
                      }`}
                    >
                      <IconComponent className="h-4 w-4 flex-shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      
                      {/* Badge para dashboard */}
                      {item.key === 'dashboard' && stats.vencimentos_proximos > 0 && (
                        <Badge variant="destructive" className="ml-auto">
                          {stats.vencimentos_proximos}
                        </Badge>
                      )}
                    </Link>
                  )}
                  
                  {/* Subitens */}
                  {item.hasSubmenu && isExpanded && item.submenu && (
                    <div className="ml-6 space-y-1">
                      {item.submenu.map((subitem) => {
                        const SubIconComponent = subitem.icon
                        const isSubActive = isActiveRoute(subitem.url)
                        
                        return (
                          <Link
                            key={subitem.key}
                            href={subitem.url}
                            className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none ${
                              isSubActive
                                ? 'bg-primary text-white'
                                : 'text-black hover:bg-gray-100 hover:text-gray-700'
                            }`}
                          >
                            <SubIconComponent className="h-3 w-3 flex-shrink-0" />
                            <span className="flex-1">{subitem.label}</span>
                            
                            {/* Badge para provedores */}
                            {subitem.key === 'provedores' && stats.provedores_pendentes > 0 && (
                              <Badge variant="secondary" className="ml-auto">
                                {stats.provedores_pendentes}
                              </Badge>
                            )}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
            
            <Separator className="my-4" />
            
            {/* Link adicional - Backup */}
            <Link
              href="/superadmin/backup"
              className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-black hover:bg-gray-100 hover:text-gray-700 transition-colors focus:outline-none"
            >
              <CloudDownload className="h-4 w-4 flex-shrink-0" />
              <span>Backup & Restore</span>
            </Link>
          </nav>

          {/* Footer da Sidebar */}
          <div className="pt-4 border-t space-y-3">
            <div className="text-xs text-black space-y-1">
              <div>Versão: 2.0.0</div>
              <div>Build: 2025.09.09</div>
              <div>Ambiente: {process.env.NODE_ENV}</div>
            </div>
            
            {/* User info e logout */}
            <div className="space-y-2">
              <div className="text-xs text-black">
                Olá, <span className="font-medium">{session.user.nome}</span>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start text-black border-black/20 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair do Sistema
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 ml-64 flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-14 items-center px-6">
            <div className="flex-1" />
            {/* Header pode ter botões adicionais aqui se necessário */}
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t bg-background py-6 md:py-0">
          <div className="container flex flex-col items-center justify-between gap-4 md:h-14 md:flex-row">
            <div className="text-center text-sm leading-loose text-muted-foreground md:text-left">
              © 2025 Parceirize SuperAdmin - Todos os direitos reservados
            </div>
            <div className="text-center text-sm leading-loose text-muted-foreground md:text-right">
              Sistema de Gestão Multitenant v2.0
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
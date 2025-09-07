"use client"

import {
  BarChart2,
  Receipt,
  Building2,
  CreditCard,
  Folder,
  Wallet,
  Users2,
  Shield,
  MessagesSquare,
  Video,
  Settings,
  HelpCircle,
  Menu,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  PieChart,
  Wifi,
  Home
} from "lucide-react"

import Link from "next/link"
import { useState } from "react"
import Image from "next/image"
import { useSession } from "@/hooks/use-session"
import { usePathname } from "next/navigation"

export default function SidebarProvider() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { user } = useSession()
  const pathname = usePathname()

  function handleNavigation() {
    setIsMobileMenuOpen(false)
  }

  function NavItem({
    href,
    icon: Icon,
    children,
    isActive = false
  }: {
    href: string
    icon: any
    children: React.ReactNode
    isActive?: boolean
  }) {
    return (
      <Link
        href={href}
        onClick={handleNavigation}
        className={`flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
          isActive 
            ? "bg-gray-50 dark:bg-[#1F1F23] text-gray-900 dark:text-white"
            : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#1F1F23]"
        }`}
      >
        <Icon className="h-4 w-4 mr-3 flex-shrink-0" />
        {children}
      </Link>
    )
  }

  return (
    <>
      <button
        type="button"
        className="lg:hidden fixed top-4 left-4 z-[70] p-2 rounded-lg bg-white dark:bg-[#0F0F12] shadow-md"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        <Menu className="h-5 w-5 text-gray-600 dark:text-gray-300" />
      </button>
      <nav
        className={`
                fixed inset-y-0 left-0 z-[70] w-64 bg-white dark:bg-[#0F0F12] transform transition-transform duration-200 ease-in-out
                lg:translate-x-0 lg:static lg:w-64 border-r border-gray-200 dark:border-[#1F1F23]
                ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
            `}
      >
        <div className="h-full flex flex-col">
          <div className="h-16 px-6 flex items-center border-b border-gray-200 dark:border-[#1F1F23]">
            <div className="flex items-center gap-3">
              <BarChart2 className="h-8 w-8 text-blue-600" />
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                BI Provedores
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-4 px-4">
            <div className="space-y-6">
              <div>
                <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Dashboard
                </div>
                <div className="space-y-1">
                  <NavItem 
                    href="/dashboard" 
                    icon={Home}
                    isActive={pathname === "/dashboard"}
                  >
                    Visão Geral
                  </NavItem>
                </div>
              </div>

              <div>
                <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Módulo Financeiro
                </div>
                <div className="space-y-1">
                  <NavItem 
                    href="/dashboard/financeiro" 
                    icon={DollarSign}
                    isActive={pathname === "/dashboard/financeiro"}
                  >
                    Financeiro
                  </NavItem>
                  <NavItem 
                    href="/dashboard/financeiro/receitas" 
                    icon={TrendingUp}
                    isActive={pathname === "/dashboard/financeiro/receitas"}
                  >
                    Receitas
                  </NavItem>
                  <NavItem 
                    href="/dashboard/financeiro/despesas" 
                    icon={TrendingDown}
                    isActive={pathname === "/dashboard/financeiro/despesas"}
                  >
                    Despesas
                  </NavItem>
                  <NavItem 
                    href="/dashboard/financeiro/inadimplencia" 
                    icon={AlertTriangle}
                    isActive={pathname === "/dashboard/financeiro/inadimplencia"}
                  >
                    Inadimplência
                  </NavItem>
                  <NavItem 
                    href="/dashboard/financeiro/faturamento" 
                    icon={BarChart2}
                    isActive={pathname === "/dashboard/financeiro/faturamento"}
                  >
                    Faturamento
                  </NavItem>
                  <NavItem 
                    href="/dashboard/financeiro/cancelamentos" 
                    icon={Users2}
                    isActive={pathname === "/dashboard/financeiro/cancelamentos"}
                  >
                    Cancelamentos
                  </NavItem>
                  <NavItem 
                    href="/dashboard/financeiro/cobrancas" 
                    icon={PieChart}
                    isActive={pathname === "/dashboard/financeiro/cobrancas"}
                  >
                    Cobranças
                  </NavItem>
                </div>
              </div>

              <div>
                <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Configurações
                </div>
                <div className="space-y-1">
                  <NavItem 
                    href="/dashboard/integracoes" 
                    icon={Wifi}
                    isActive={pathname === "/dashboard/integracoes"}
                  >
                    Integrações SGP
                  </NavItem>
                </div>
              </div>
            </div>
          </div>

          <div className="px-4 py-4 border-t border-gray-200 dark:border-[#1F1F23]">
            <div className="space-y-1">
              <NavItem href="#" icon={Settings}>
                Configurações
              </NavItem>
              <NavItem href="#" icon={HelpCircle}>
                Suporte
              </NavItem>
            </div>
          </div>
        </div>
      </nav>

      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-[65] lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  )
}
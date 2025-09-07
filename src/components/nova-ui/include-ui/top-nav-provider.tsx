"use client"

import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import Image from "next/image"
import { Bell, ChevronRight } from "lucide-react"
import ProfileProvider from "./profile-provider"
import Link from "next/link"
import { ThemeToggle } from "../theme-toggle"
import { useSession } from "@/hooks/use-session"
import { usePathname } from "next/navigation"

interface BreadcrumbItem {
  label: string
  href?: string
}

export default function TopNavProvider() {
  const { user } = useSession()
  const pathname = usePathname()

  // Gerar breadcrumbs dinamicamente baseado na rota atual
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const pathSegments = pathname.split('/').filter(Boolean)
    const breadcrumbs: BreadcrumbItem[] = [
      { label: "BI Provedores", href: "/dashboard" }
    ]

    if (pathSegments.includes('dashboard')) {
      if (pathSegments.length === 1) {
        breadcrumbs.push({ label: "Dashboard" })
      } else if (pathSegments.includes('financeiro')) {
        breadcrumbs.push({ label: "Financeiro", href: "/dashboard/financeiro" })
        
        const lastSegment = pathSegments[pathSegments.length - 1]
        if (lastSegment !== 'financeiro') {
          const labelMap: { [key: string]: string } = {
            'receitas': 'Receitas',
            'despesas': 'Despesas', 
            'inadimplencia': 'Inadimplência',
            'faturamento': 'Faturamento',
            'cancelamentos': 'Cancelamentos',
            'cobrancas': 'Cobranças'
          }
          breadcrumbs.push({ label: labelMap[lastSegment] || lastSegment })
        }
      } else if (pathSegments.includes('integracoes')) {
        breadcrumbs.push({ label: "Integrações SGP" })
      }
    }

    return breadcrumbs
  }

  const breadcrumbs = generateBreadcrumbs()

  return (
    <nav className="px-3 sm:px-6 flex items-center justify-between bg-white dark:bg-[#0F0F12] border-b border-gray-200 dark:border-[#1F1F23] h-full">
      <div className="font-medium text-sm hidden sm:flex items-center space-x-1 truncate max-w-[300px]">
        {breadcrumbs.map((item, index) => (
          <div key={item.label} className="flex items-center">
            {index > 0 && <ChevronRight className="h-4 w-4 text-gray-500 dark:text-gray-400 mx-1" />}
            {item.href ? (
              <Link
                href={item.href}
                className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-gray-900 dark:text-gray-100">{item.label}</span>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 sm:gap-4 ml-auto sm:ml-0">
        <button
          type="button"
          className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-[#1F1F23] rounded-full transition-colors"
        >
          <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600 dark:text-gray-300" />
        </button>

        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger className="focus:outline-none">
            <Image
              src="https://ferf1mheo22r9ira.public.blob.vercel-storage.com/avatar-01-n0x8HFv8EUetf9z6ht0wScJKoTHqf8.png"
              alt="User avatar"
              width={28}
              height={28}
              className="rounded-full ring-2 ring-gray-200 dark:ring-[#2B2B30] sm:w-8 sm:h-8 cursor-pointer"
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={8}
            className="w-[280px] sm:w-80 bg-background border-border rounded-lg shadow-lg"
          >
            <ProfileProvider 
              name={user?.name || "Usuário"}
              role={user?.provider?.companyName || "Provedor"}
              avatar="https://ferf1mheo22r9ira.public.blob.vercel-storage.com/avatar-01-n0x8HFv8EUetf9z6ht0wScJKoTHqf8.png"
              subscription="Plano Ativo"
            />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  )
}
"use client"

import type { ReactNode } from "react"
import SidebarProvider from "./sidebar-provider"
import TopNavProvider from "./top-nav-provider"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

interface LayoutProviderProps {
  children: ReactNode
}

export default function LayoutProvider({ children }: LayoutProviderProps) {
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <div className={`flex h-screen ${theme === "dark" ? "dark" : ""}`}>
      <SidebarProvider />
      <div className="w-full flex flex-1 flex-col">
        <header className="h-16 border-b border-gray-200 dark:border-[#1F1F23]">
          <TopNavProvider />
        </header>
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-[#080808] p-4 sm:p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
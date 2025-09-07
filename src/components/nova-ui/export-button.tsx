"use client"

import { useState } from "react"
import { Download, FileSpreadsheet, FileText, Printer } from "lucide-react"
import { cn } from "@/lib/utils"
import { exportToCSV, exportToExcel, exportToPDF } from "@/lib/export-utils"

interface ExportButtonProps {
  data: any[] | (() => any[])
  filename: string
  title?: string
  elementId?: string // Para exportação PDF
  className?: string
  variant?: "default" | "ghost" | "outline"
  prepareData?: () => any // Função para preparar dados antes da exportação
}

export function ExportButton({
  data,
  filename,
  title,
  elementId,
  className,
  variant = "outline",
  prepareData
}: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const getData = () => {
    if (prepareData) {
      return prepareData()
    }
    return typeof data === 'function' ? data() : data
  }

  const handleExportCSV = () => {
    setIsExporting(true)
    try {
      const exportData = getData()
      if (Array.isArray(exportData)) {
        exportToCSV(exportData, filename)
      } else if (exportData && typeof exportData === 'object') {
        // Se não for array, tentar exportar a primeira propriedade que seja array
        const firstArray = Object.values(exportData).find(val => Array.isArray(val)) as any[]
        if (firstArray) {
          exportToCSV(firstArray, filename)
        }
      }
    } catch (error) {
      console.error("Erro ao exportar CSV:", error)
    } finally {
      setIsExporting(false)
      setIsOpen(false)
    }
  }

  const handleExportExcel = () => {
    setIsExporting(true)
    try {
      const exportData = getData()
      if (Array.isArray(exportData)) {
        exportToExcel(exportData, filename, title)
      } else if (exportData && typeof exportData === 'object') {
        // Se não for array, exportar cada propriedade como uma planilha
        Object.entries(exportData).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            exportToExcel(value, `${filename}_${key}`, `${title || filename} - ${key}`)
          }
        })
      }
    } catch (error) {
      console.error("Erro ao exportar Excel:", error)
    } finally {
      setIsExporting(false)
      setIsOpen(false)
    }
  }

  const handleExportPDF = () => {
    setIsExporting(true)
    try {
      if (elementId) {
        exportToPDF(elementId, filename)
      } else {
        // Se não tiver elementId, tentar imprimir a página toda
        window.print()
      }
    } catch (error) {
      console.error("Erro ao exportar PDF:", error)
    } finally {
      setIsExporting(false)
      setIsOpen(false)
    }
  }

  const buttonClasses = {
    default: "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200",
    ghost: "hover:bg-zinc-100 dark:hover:bg-zinc-800",
    outline: "border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800"
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting}
        className={cn(
          "px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
          "flex items-center gap-2",
          buttonClasses[variant],
          isExporting && "opacity-50 cursor-not-allowed",
          className
        )}
      >
        <Download className={cn("w-4 h-4", isExporting && "animate-pulse")} />
        {isExporting ? "Exportando..." : "Exportar"}
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu */}
          <div className="absolute right-0 mt-2 w-48 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-lg z-50">
            <div className="p-1">
              <button
                onClick={handleExportCSV}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
              >
                <FileText className="w-4 h-4" />
                Exportar como CSV
              </button>
              
              <button
                onClick={handleExportExcel}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Exportar como Excel
              </button>
              
              <button
                onClick={handleExportPDF}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
              >
                <Printer className="w-4 h-4" />
                Exportar como PDF
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
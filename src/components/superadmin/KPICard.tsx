'use client'

import { motion } from 'framer-motion'
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'
import { Card, CardContent } from '@/components/superadmin/ui/card'
import { cn } from '@/lib/utils'

interface KPICardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
    period: string
  }
  className?: string
}

export function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  className
}: KPICardProps) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <Card className={cn("kpi-minimal", className)}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <p className="text-sm font-medium text-muted-foreground leading-none">
                {title}
              </p>
              <div className="space-y-1">
                <h3 className="kpi-value">
                  {typeof value === 'number' ? value.toLocaleString('pt-BR') : value}
                </h3>
                {subtitle && (
                  <p className="kpi-subtitle">{subtitle}</p>
                )}
                {trend && (
                  <div className="flex items-center space-x-1">
                    {trend.isPositive ? (
                      <TrendingUp className="h-3 w-3 text-green-600" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-500" />
                    )}
                    <span className={cn(
                      "text-xs font-medium",
                      trend.isPositive ? "kpi-trend-positive" : "kpi-trend-negative"
                    )}>
                      {trend.isPositive ? '+' : ''}{trend.value}%
                    </span>
                    <span className="text-xs text-muted-foreground">
                      vs. {trend.period}
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="kpi-icon-container ml-4 flex-shrink-0">
              <Icon className="h-4 w-4" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
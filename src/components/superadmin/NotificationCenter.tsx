'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Bell, 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  X,
  Clock,
  TrendingUp,
  Users,
  CreditCard
} from 'lucide-react'
import { Button } from '@/components/superadmin/ui/button'
import { Badge } from '@/components/superadmin/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/superadmin/ui/card'
import { cn } from '@/lib/utils'

interface Notification {
  id: string
  type: 'success' | 'warning' | 'error' | 'info' | 'celebration'
  title: string
  message: string
  timestamp: Date
  read: boolean
  priority: 'high' | 'medium' | 'low'
  category: 'system' | 'payment' | 'provider' | 'client' | 'partner'
  action?: {
    label: string
    href: string
  }
}

// Mock notifications
const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'warning',
    title: 'Vencimento Próximo',
    message: 'TechSolutions SP - Plano vence em 3 dias',
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
    read: false,
    priority: 'high',
    category: 'payment',
    action: { label: 'Ver Provedor', href: '/superadmin/provedores/123' }
  },
  {
    id: '2', 
    type: 'success',
    title: 'Novo Provedor',
    message: 'FastDelivery Ltda foi cadastrado com sucesso',
    timestamp: new Date(Date.now() - 15 * 60 * 1000),
    read: false,
    priority: 'medium',
    category: 'provider',
    action: { label: 'Aprovar', href: '/superadmin/provedores/124' }
  },
  {
    id: '3',
    type: 'info',
    title: 'Upgrade de Plano',
    message: 'InnovaCorp RJ migrou para Enterprise',
    timestamp: new Date(Date.now() - 30 * 60 * 1000),
    read: false,
    priority: 'medium',
    category: 'payment'
  },
  {
    id: '4',
    type: 'celebration',
    title: 'Meta Atingida!',
    message: '50.000 clientes ativos na plataforma',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    read: true,
    priority: 'high',
    category: 'system'
  },
  {
    id: '5',
    type: 'error',
    title: 'Falha no Pagamento',
    message: 'CloudPro SC - Cartão recusado',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
    read: true,
    priority: 'high',
    category: 'payment',
    action: { label: 'Notificar Cliente', href: '/superadmin/provedores/125' }
  }
]

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications)
  const [isOpen, setIsOpen] = useState(false)
  const [filter, setFilter] = useState<'all' | 'unread' | 'high'>('all')

  const unreadCount = notifications.filter(n => !n.read).length
  const highPriorityCount = notifications.filter(n => n.priority === 'high' && !n.read).length

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id ? { ...notification, read: true } : notification
      )
    )
  }

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    )
  }

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const getFilteredNotifications = () => {
    switch (filter) {
      case 'unread':
        return notifications.filter(n => !n.read)
      case 'high':
        return notifications.filter(n => n.priority === 'high')
      default:
        return notifications
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'celebration':
        return <TrendingUp className="h-4 w-4 text-purple-500" />
      default:
        return <Info className="h-4 w-4 text-blue-500" />
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'payment':
        return <CreditCard className="h-3 w-3" />
      case 'provider':
        return <Users className="h-3 w-3" />
      case 'client':
        return <Users className="h-3 w-3" />
      default:
        return <Info className="h-3 w-3" />
    }
  }

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date()
    const diff = now.getTime() - timestamp.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}d atrás`
    if (hours > 0) return `${hours}h atrás`
    if (minutes > 0) return `${minutes}min atrás`
    return 'Agora'
  }

  return (
    <div className="relative">
      {/* Notification Bell */}
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-2 -right-2 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.div>
        )}
        {highPriorityCount > 0 && (
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"
          />
        )}
      </Button>

      {/* Notification Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)}
            />
            
            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full right-0 mt-2 w-96 z-50"
            >
              <Card className="shadow-lg border-0 max-h-96 overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Notificações</CardTitle>
                    <div className="flex items-center space-x-2">
                      {unreadCount > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={markAllAsRead}
                          className="text-xs"
                        >
                          Marcar todas como lidas
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsOpen(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Filters */}
                  <div className="flex items-center space-x-2 mt-2">
                    <Button
                      variant={filter === 'all' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setFilter('all')}
                      className="text-xs h-6"
                    >
                      Todas ({notifications.length})
                    </Button>
                    <Button
                      variant={filter === 'unread' ? 'default' : 'ghost'}
                      size="sm" 
                      onClick={() => setFilter('unread')}
                      className="text-xs h-6"
                    >
                      Não lidas ({unreadCount})
                    </Button>
                    <Button
                      variant={filter === 'high' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setFilter('high')}
                      className="text-xs h-6"
                    >
                      Alta prioridade ({highPriorityCount})
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent className="p-0">
                  <div className="max-h-80 overflow-y-auto custom-scrollbar">
                    {getFilteredNotifications().length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Nenhuma notificação</p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {getFilteredNotifications().map((notification) => (
                          <motion.div
                            key={notification.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className={cn(
                              "p-3 hover:bg-accent/50 cursor-pointer border-b border-border transition-colors",
                              !notification.read && "bg-accent/20"
                            )}
                            onClick={() => markAsRead(notification.id)}
                          >
                            <div className="flex items-start space-x-3">
                              <div className="flex-shrink-0 mt-0.5">
                                {getNotificationIcon(notification.type)}
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <p className={cn(
                                    "text-sm font-medium truncate",
                                    !notification.read && "font-semibold"
                                  )}>
                                    {notification.title}
                                  </p>
                                  <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
                                    {notification.priority === 'high' && (
                                      <Badge variant="destructive" className="text-xs px-1.5 py-0">
                                        Alta
                                      </Badge>
                                    )}
                                    {!notification.read && (
                                      <div className="w-2 h-2 bg-primary rounded-full" />
                                    )}
                                  </div>
                                </div>
                                
                                <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                                  {notification.message}
                                </p>
                                
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                                    {getCategoryIcon(notification.category)}
                                    <Clock className="h-3 w-3" />
                                    <span>{formatTimestamp(notification.timestamp)}</span>
                                  </div>
                                  
                                  {notification.action && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-xs h-6 px-2"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        // Handle action click
                                      }}
                                    >
                                      {notification.action.label}
                                    </Button>
                                  )}
                                </div>
                              </div>
                              
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  removeNotification(notification.id)
                                }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Footer */}
                  <div className="border-t p-3">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full text-xs"
                    >
                      Ver todas as notificações
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
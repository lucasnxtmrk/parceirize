"use client"

import { useState, useEffect } from 'react'
import { ListGroup, Badge } from 'react-bootstrap'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  FaUser, 
  FaStore, 
  FaTicketAlt, 
  FaShoppingCart,
  FaClock,
  FaCheck,
  FaExclamationTriangle
} from 'react-icons/fa'
import { Card, LoadingSkeleton } from '../ui'

const ActivityItem = ({ activity, delay = 0 }) => {
  const getIcon = (type) => {
    switch (type) {
      case 'client': return FaUser
      case 'partner': return FaStore
      case 'voucher': return FaTicketAlt
      case 'order': return FaShoppingCart
      default: return FaClock
    }
  }

  const getVariant = (status) => {
    switch (status) {
      case 'success': return 'success'
      case 'warning': return 'warning'
      case 'error': return 'danger'
      default: return 'secondary'
    }
  }

  const getTimeAgo = (timestamp) => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (days > 0) return `${days}d atrás`
    if (hours > 0) return `${hours}h atrás`
    if (minutes > 0) return `${minutes}min atrás`
    return 'Agora'
  }

  const Icon = getIcon(activity.type)

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay }}
    >
      <ListGroup.Item className="border-0 px-0 py-3">
        <div className="d-flex align-items-center">
          <div className={`rounded-circle d-flex align-items-center justify-content-center me-3 bg-${getVariant(activity.status)}-subtle`}
               style={{ width: '40px', height: '40px', minWidth: '40px' }}>
            <Icon className={`text-${getVariant(activity.status)}`} size={16} />
          </div>
          
          <div className="flex-grow-1 min-width-0">
            <div className="d-flex justify-content-between align-items-start mb-1">
              <h6 className="mb-0 text-truncate">{activity.title}</h6>
              <Badge bg={getVariant(activity.status)} className="ms-2">
                {activity.status}
              </Badge>
            </div>
            <p className="text-muted small mb-1 text-truncate">
              {activity.description}
            </p>
            <div className="d-flex justify-content-between align-items-center">
              <small className="text-muted">
                <FaClock size={12} className="me-1" />
                {getTimeAgo(activity.timestamp)}
              </small>
              {activity.user && (
                <small className="text-muted">
                  por {activity.user}
                </small>
              )}
            </div>
          </div>
        </div>
      </ListGroup.Item>
    </motion.div>
  )
}

const RecentActivity = () => {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchActivities()
    
    // Atualizar atividades a cada 30 segundos
    const interval = setInterval(fetchActivities, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchActivities = async () => {
    try {
      const response = await fetch('/api/admin/recent-activities')
      
      if (!response.ok) {
        throw new Error('Falha ao carregar atividades')
      }
      
      const data = await response.json()
      setActivities(data)
    } catch (err) {
      setError(err.message)
      // Mock data for development
      setActivities([
        {
          id: 1,
          type: 'client',
          title: 'Novo cliente cadastrado',
          description: 'Maria Silva se cadastrou na plataforma',
          status: 'success',
          timestamp: Date.now() - 300000,
          user: 'Sistema'
        },
        {
          id: 2,
          type: 'voucher',
          title: 'Voucher utilizado',
          description: 'Desconto de 20% usado na Farmácia Central',
          status: 'success',
          timestamp: Date.now() - 600000,
          user: 'João Santos'
        },
        {
          id: 3,
          type: 'partner',
          title: 'Parceiro aprovado',
          description: 'Restaurante Sabor & Arte foi aprovado',
          status: 'success',
          timestamp: Date.now() - 1800000,
          user: 'Admin'
        },
        {
          id: 4,
          type: 'order',
          title: 'Pedido cancelado',
          description: 'Pedido #1234 foi cancelado pelo cliente',
          status: 'warning',
          timestamp: Date.now() - 3600000,
          user: 'Ana Costa'
        },
        {
          id: 5,
          type: 'voucher',
          title: 'Erro na validação',
          description: 'Falha ao validar voucher - código inválido',
          status: 'error',
          timestamp: Date.now() - 7200000,
          user: 'Sistema'
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card title="Atividades Recentes" className="h-100">
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="d-flex align-items-center mb-3">
              <LoadingSkeleton variant="avatar" className="me-3" />
              <div className="flex-grow-1">
                <LoadingSkeleton variant="text" width="80%" className="mb-1" />
                <LoadingSkeleton variant="text" width="60%" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    )
  }

  return (
    <Card title="Atividades Recentes" className="h-100">
      {error && (
        <div className="text-center text-muted py-4">
          <FaExclamationTriangle size={24} className="mb-2" />
          <p>Não foi possível carregar as atividades</p>
        </div>
      )}
      
      {activities.length === 0 ? (
        <div className="text-center text-muted py-4">
          <FaClock size={24} className="mb-2" />
          <p>Nenhuma atividade recente</p>
        </div>
      ) : (
        <ListGroup variant="flush">
          <AnimatePresence>
            {activities.slice(0, 10).map((activity, index) => (
              <ActivityItem 
                key={activity.id} 
                activity={activity} 
                delay={index * 0.1}
              />
            ))}
          </AnimatePresence>
        </ListGroup>
      )}
      
      {activities.length > 10 && (
        <div className="text-center pt-3 border-top">
          <small className="text-muted">
            Mostrando 10 de {activities.length} atividades
          </small>
        </div>
      )}
    </Card>
  )
}

export default RecentActivity
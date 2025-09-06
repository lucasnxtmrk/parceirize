"use client"

import { useState, useEffect } from 'react'
import { Row, Col } from 'react-bootstrap'
import { motion } from 'framer-motion'
import { 
  FaUsers, 
  FaStore, 
  FaTicketAlt, 
  FaTrendingUp,
  FaMoneyBillWave,
  FaPercentage,
  FaCalendarCheck,
  FaChartLine
} from 'react-icons/fa'
import { Card, LoadingSkeleton, Badge } from '../ui'

const StatCard = ({ title, value, subtitle, icon: Icon, color, trend, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
  >
    <Card className="h-100" hover>
      <div className="d-flex align-items-center">
        <div className={`rounded-3 p-3 me-3 bg-${color}-subtle`}>
          <Icon className={`text-${color}`} size={24} />
        </div>
        <div className="flex-grow-1">
          <div className="small text-muted mb-1">{title}</div>
          <div className="h4 mb-1 fw-bold">{value}</div>
          {subtitle && <div className="small text-muted">{subtitle}</div>}
          {trend && (
            <div className="d-flex align-items-center mt-2">
              <FaTrendingUp 
                size={12} 
                className={trend > 0 ? 'text-success' : 'text-danger'} 
              />
              <span className={`small ms-1 ${trend > 0 ? 'text-success' : 'text-danger'}`}>
                {trend > 0 ? '+' : ''}{trend}%
              </span>
            </div>
          )}
        </div>
      </div>
    </Card>
  </motion.div>
)

const DashboardStats = () => {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/dashboard-stats')
      
      if (!response.ok) {
        throw new Error('Falha ao carregar estatísticas')
      }
      
      const data = await response.json()
      setStats(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  if (loading) {
    return (
      <Row className="g-4">
        {[...Array(8)].map((_, i) => (
          <Col lg={3} md={6} key={i}>
            <LoadingSkeleton variant="card" height="120px" />
          </Col>
        ))}
      </Row>
    )
  }

  if (error) {
    return (
      <Card>
        <div className="text-center text-danger py-4">
          <p>Erro ao carregar estatísticas: {error}</p>
        </div>
      </Card>
    )
  }

  return (
    <Row className="g-4">
      <Col lg={3} md={6}>
        <StatCard
          title="Total de Clientes"
          value={stats?.totalClientes?.toLocaleString() || '0'}
          subtitle={`${stats?.clientesAtivos || 0} ativos`}
          icon={FaUsers}
          color="primary"
          trend={stats?.crescimentoClientes}
          delay={0.1}
        />
      </Col>
      
      <Col lg={3} md={6}>
        <StatCard
          title="Parceiros Ativos"
          value={stats?.parceirosAtivos?.toLocaleString() || '0'}
          subtitle={`${stats?.totalParceiros || 0} total`}
          icon={FaStore}
          color="success"
          trend={stats?.crescimentoParceiros}
          delay={0.2}
        />
      </Col>
      
      <Col lg={3} md={6}>
        <StatCard
          title="Vouchers Utilizados"
          value={stats?.vouchersUtilizados?.toLocaleString() || '0'}
          subtitle="Este mês"
          icon={FaTicketAlt}
          color="warning"
          trend={stats?.crescimentoVouchers}
          delay={0.3}
        />
      </Col>
      
      <Col lg={3} md={6}>
        <StatCard
          title="Receita Total"
          value={formatCurrency(stats?.receitaTotal || 0)}
          subtitle="Acumulado"
          icon={FaMoneyBillWave}
          color="info"
          trend={stats?.crescimentoReceita}
          delay={0.4}
        />
      </Col>
      
      <Col lg={3} md={6}>
        <StatCard
          title="Economia Gerada"
          value={formatCurrency(stats?.economiaTotal || 0)}
          subtitle="Para clientes"
          icon={FaPercentage}
          color="success"
          trend={stats?.crescimentoEconomia}
          delay={0.5}
        />
      </Col>
      
      <Col lg={3} md={6}>
        <StatCard
          title="Taxa de Conversão"
          value={`${(stats?.taxaConversao || 0).toFixed(1)}%`}
          subtitle="Vouchers/Visitas"
          icon={FaChartLine}
          color="primary"
          trend={stats?.crescimentoConversao}
          delay={0.6}
        />
      </Col>
      
      <Col lg={3} md={6}>
        <StatCard
          title="Pedidos Hoje"
          value={stats?.pedidosHoje?.toLocaleString() || '0'}
          subtitle={formatCurrency(stats?.vendasHoje || 0)}
          icon={FaCalendarCheck}
          color="warning"
          delay={0.7}
        />
      </Col>
      
      <Col lg={3} md={6}>
        <StatCard
          title="Ticket Médio"
          value={formatCurrency(stats?.ticketMedio || 0)}
          subtitle="Por pedido"
          icon={FaTrendingUp}
          color="info"
          trend={stats?.crescimentoTicket}
          delay={0.8}
        />
      </Col>
    </Row>
  )
}

export default DashboardStats
"use client"

import { useState } from 'react'
import { Row, Col } from 'react-bootstrap'
import { motion } from 'framer-motion'
import { 
  FaUserPlus, 
  FaStore, 
  FaTicketAlt, 
  FaQrcode,
  FaFileExport,
  FaCog,
  FaChartBar,
  FaBell
} from 'react-icons/fa'
import { Card, Button, Badge } from '../ui'

const ActionCard = ({ title, description, icon: Icon, color, onClick, badge, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.3, delay }}
  >
    <Card 
      className="h-100 text-center" 
      hover
      style={{ cursor: 'pointer' }}
      onClick={onClick}
    >
      <div className="py-4">
        <div className={`rounded-circle d-inline-flex align-items-center justify-content-center mb-3 bg-${color}-subtle`}
             style={{ width: '60px', height: '60px' }}>
          <Icon className={`text-${color}`} size={24} />
        </div>
        <div className="position-relative">
          <h5 className="mb-2">{title}</h5>
          {badge && (
            <Badge variant={badge.variant} className="position-absolute top-0 start-100 translate-middle">
              {badge.text}
            </Badge>
          )}
        </div>
        <p className="text-muted small mb-3">{description}</p>
        <Button
          variant={`outline-${color}`}
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onClick()
          }}
        >
          Acessar
        </Button>
      </div>
    </Card>
  </motion.div>
)

const QuickActions = ({ onActionClick }) => {
  const actions = [
    {
      id: 'add-client',
      title: 'Novo Cliente',
      description: 'Cadastrar novo cliente no sistema',
      icon: FaUserPlus,
      color: 'primary',
      onClick: () => onActionClick('/admin-cliente')
    },
    {
      id: 'add-partner',
      title: 'Novo Parceiro',
      description: 'Cadastrar nova loja parceira',
      icon: FaStore,
      color: 'success',
      onClick: () => onActionClick('/admin-parceiro')
    },
    {
      id: 'create-voucher',
      title: 'Criar Voucher',
      description: 'Criar novo voucher de desconto',
      icon: FaTicketAlt,
      color: 'warning',
      onClick: () => onActionClick('/admin-vouchers/cadastrar')
    },
    {
      id: 'validate-voucher',
      title: 'Validar Voucher',
      description: 'Validar vouchers via QR Code',
      icon: FaQrcode,
      color: 'info',
      onClick: () => onActionClick('/admin-validacao'),
      badge: { text: 'Novo', variant: 'success' }
    },
    {
      id: 'reports',
      title: 'Relatórios',
      description: 'Ver relatórios e estatísticas',
      icon: FaChartBar,
      color: 'secondary',
      onClick: () => onActionClick('/admin-relatorios')
    },
    {
      id: 'export-data',
      title: 'Exportar Dados',
      description: 'Exportar relatórios em Excel/PDF',
      icon: FaFileExport,
      color: 'primary',
      onClick: () => handleExport()
    },
    {
      id: 'notifications',
      title: 'Notificações',
      description: 'Gerenciar notificações do sistema',
      icon: FaBell,
      color: 'warning',
      onClick: () => onActionClick('/admin-notifications'),
      badge: { text: '3', variant: 'danger' }
    },
    {
      id: 'settings',
      title: 'Configurações',
      description: 'Configurações gerais do sistema',
      icon: FaCog,
      color: 'secondary',
      onClick: () => onActionClick('/admin-configuracoes')
    }
  ]

  const handleExport = () => {
    // Implementar exportação de dados
    console.log('Exportar dados')
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0">Ações Rápidas</h4>
        <Button variant="outline-primary" size="sm">
          Personalizar
        </Button>
      </div>
      
      <Row className="g-4">
        {actions.map((action, index) => (
          <Col lg={3} md={4} sm={6} key={action.id}>
            <ActionCard
              {...action}
              delay={index * 0.1}
            />
          </Col>
        ))}
      </Row>
    </div>
  )
}

export default QuickActions
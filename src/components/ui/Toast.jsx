"use client"

import { useState, useEffect } from 'react'
import { Toast as BootstrapToast, ToastContainer } from 'react-bootstrap'
import { motion, AnimatePresence } from 'framer-motion'
import IconifyIcon from '@/components/wrappers/IconifyIcon'

const toastIcons = {
  success: 'heroicons:check-circle',
  error: 'heroicons:x-circle',
  warning: 'heroicons:exclamation-triangle',
  info: 'heroicons:information-circle'
}

const toastColors = {
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6'
}

const Toast = ({ 
  id,
  type = 'info', 
  title, 
  message, 
  duration = 5000,
  position = 'top-end',
  onClose 
}) => {
  const [show, setShow] = useState(true)

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setShow(false)
        setTimeout(() => onClose?.(id), 300)
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [duration, id, onClose])

  const handleClose = () => {
    setShow(false)
    setTimeout(() => onClose?.(id), 300)
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: position.includes('end') ? 100 : -100, scale: 0.8 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: position.includes('end') ? 100 : -100, scale: 0.8 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <BootstrapToast
        show={show}
        onClose={handleClose}
        className="shadow-lg border-0"
        style={{
          minWidth: '320px',
          borderLeft: `4px solid ${toastColors[type]}`
        }}
      >
        <BootstrapToast.Header 
          className="d-flex align-items-center gap-2 border-0 pb-1"
          style={{ background: 'transparent' }}
        >
          <div 
            className="d-flex align-items-center justify-content-center rounded-circle"
            style={{
              width: '24px',
              height: '24px',
              backgroundColor: `${toastColors[type]}20`,
              color: toastColors[type]
            }}
          >
            <IconifyIcon icon={toastIcons[type]} width={14} />
          </div>
          <strong className="me-auto text-dark">{title}</strong>
          <small className="text-muted">agora</small>
        </BootstrapToast.Header>
        
        {message && (
          <BootstrapToast.Body className="pt-0 text-muted small">
            {message}
          </BootstrapToast.Body>
        )}
      </BootstrapToast>
    </motion.div>
  )
}

// Container principal para os toasts
export const ToastProvider = ({ children, position = 'top-end' }) => {
  const [toasts, setToasts] = useState([])

  const addToast = (toast) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { ...toast, id }])
  }

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  // Disponibilizar globalmente
  useEffect(() => {
    window.addToast = addToast
  }, [])

  return (
    <>
      {children}
      
      <ToastContainer 
        position={position} 
        className="p-3"
        style={{ zIndex: 9999 }}
      >
        <AnimatePresence>
          {toasts.map((toast) => (
            <Toast
              key={toast.id}
              {...toast}
              position={position}
              onClose={removeToast}
            />
          ))}
        </AnimatePresence>
      </ToastContainer>
    </>
  )
}

// Hook para usar toasts
export const useToast = () => {
  const toast = {
    success: (title, message, options = {}) => {
      window.addToast?.({ type: 'success', title, message, ...options })
    },
    error: (title, message, options = {}) => {
      window.addToast?.({ type: 'error', title, message, ...options })
    },
    warning: (title, message, options = {}) => {
      window.addToast?.({ type: 'warning', title, message, ...options })
    },
    info: (title, message, options = {}) => {
      window.addToast?.({ type: 'info', title, message, ...options })
    }
  }

  return toast
}

export default Toast
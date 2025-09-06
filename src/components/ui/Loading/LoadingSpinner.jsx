"use client"

import { forwardRef } from 'react'
import { Spinner } from 'react-bootstrap'
import { motion } from 'framer-motion'
import IconifyIcon from '@/components/wrappers/IconifyIcon'

const LoadingSpinner = forwardRef(({
  // Configurações básicas
  size = 'md', // xs, sm, md, lg, xl
  variant = 'primary',
  
  // Texto e layout
  text,
  textPosition = 'bottom', // top, bottom, right, left
  
  // Tipos de spinner
  type = 'border', // border, grow, pulse, custom
  
  // Ícone customizado (para type='custom')
  icon = 'heroicons:arrow-path',
  
  // Layout e espaçamento
  centered = false,
  className = '',
  textClassName = '',
  
  // Animação
  animated = true,
  
  ...props
}, ref) => {
  
  const sizeMap = {
    xs: { spinner: 'sm', text: 'small', icon: 14 },
    sm: { spinner: 'sm', text: 'small', icon: 16 },
    md: { spinner: undefined, text: undefined, icon: 20 },
    lg: { spinner: undefined, text: 'fs-5', icon: 24 },
    xl: { spinner: undefined, text: 'fs-4', icon: 28 }
  }
  
  const currentSize = sizeMap[size] || sizeMap.md
  
  const renderSpinner = () => {
    if (type === 'custom') {
      return (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ 
            duration: 1, 
            repeat: Infinity, 
            ease: "linear" 
          }}
          className="d-inline-block"
        >
          <IconifyIcon 
            icon={icon} 
            width={currentSize.icon} 
            className={`text-${variant}`} 
          />
        </motion.div>
      )
    }
    
    if (type === 'pulse') {
      return (
        <motion.div
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{ 
            duration: 1.5, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
          className="d-inline-block"
        >
          <IconifyIcon 
            icon="heroicons:heart" 
            width={currentSize.icon} 
            className={`text-${variant}`} 
          />
        </motion.div>
      )
    }
    
    return (
      <Spinner
        animation={type}
        variant={variant}
        size={currentSize.spinner}
        role="status"
        aria-hidden="true"
        {...props}
      />
    )
  }
  
  const renderText = () => {
    if (!text) return null
    
    return (
      <span className={`${currentSize.text || ''} text-muted ${textClassName}`}>
        {text}
      </span>
    )
  }
  
  const renderContent = () => {
    const flexDirection = {
      top: 'flex-column-reverse',
      bottom: 'flex-column',
      left: 'flex-row-reverse', 
      right: 'flex-row'
    }
    
    const gap = text ? 'gap-2' : ''
    
    return (
      <div className={`d-flex align-items-center ${flexDirection[textPosition]} ${gap}`}>
        {renderSpinner()}
        {renderText()}
      </div>
    )
  }
  
  const wrapperClasses = [
    centered && 'd-flex justify-content-center align-items-center',
    className
  ].filter(Boolean).join(' ')
  
  if (animated) {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.2 }}
        className={wrapperClasses}
      >
        {renderContent()}
      </motion.div>
    )
  }
  
  return (
    <div ref={ref} className={wrapperClasses}>
      {renderContent()}
    </div>
  )
})

LoadingSpinner.displayName = 'LoadingSpinner'

export default LoadingSpinner
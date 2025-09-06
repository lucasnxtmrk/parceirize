"use client"

import { forwardRef } from 'react'
import { motion } from 'framer-motion'

const LoadingSkeleton = forwardRef(({
  // Dimensões
  width = "100%",
  height = "1rem",
  
  // Formato
  variant = "text", // text, circular, rectangular, card
  
  // Configurações de animação
  animated = true,
  animationType = "pulse", // pulse, wave, shimmer
  
  // Estilos
  className = "",
  borderRadius,
  
  // Props específicas para variantes
  lines = 3, // Para variant="card"
  
  ...props
}, ref) => {
  
  const variantStyles = {
    text: { 
      borderRadius: borderRadius || "4px" 
    },
    circular: { 
      borderRadius: "50%",
      width: height, // Manter circular
    },
    rectangular: { 
      borderRadius: borderRadius || "8px" 
    },
    card: {
      borderRadius: borderRadius || "12px"
    }
  }
  
  const getAnimationProps = () => {
    switch (animationType) {
      case 'pulse':
        return {
          animate: { opacity: [0.4, 0.8, 0.4] },
          transition: {
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut"
          }
        }
      
      case 'wave':
        return {
          animate: { 
            backgroundPosition: ['200% 0', '-200% 0']
          },
          transition: {
            duration: 2,
            repeat: Infinity,
            ease: "linear"
          },
          style: {
            background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
            backgroundSize: '400% 100%'
          }
        }
      
      case 'shimmer':
        return {
          animate: {
            backgroundPosition: ['-200px 0', '200px 0']
          },
          transition: {
            duration: 1.2,
            repeat: Infinity,
            ease: "easeInOut"
          },
          style: {
            background: 'linear-gradient(90deg, #f0f0f0 0px, #e0e0e0 40px, #f0f0f0 80px)',
            backgroundSize: '200px'
          }
        }
      
      default:
        return {}
    }
  }
  
  const baseStyles = {
    width,
    height,
    backgroundColor: animationType === 'wave' || animationType === 'shimmer' ? 'transparent' : '#f0f0f0',
    ...variantStyles[variant]
  }
  
  const renderSkeleton = () => {
    const skeletonProps = {
      ref,
      className: `${className}`,
      style: baseStyles,
      ...props
    }
    
    if (animated) {
      return (
        <motion.div
          {...skeletonProps}
          {...getAnimationProps()}
        />
      )
    }
    
    return <div {...skeletonProps} />
  }
  
  // Variante card com múltiplas linhas
  if (variant === 'card') {
    return (
      <div className={`${className}`} ref={ref}>
        {Array.from({ length: lines }).map((_, index) => (
          <div key={index} className="mb-2 last:mb-0">
            <motion.div
              style={{
                ...baseStyles,
                width: index === lines - 1 ? '60%' : '100%', // Última linha menor
                height: '1rem'
              }}
              {...(animated ? getAnimationProps() : {})}
            />
          </div>
        ))}
      </div>
    )
  }
  
  return renderSkeleton()
})

LoadingSkeleton.displayName = 'LoadingSkeleton'

// Componentes pré-configurados para casos comuns
export const SkeletonText = (props) => (
  <LoadingSkeleton variant="text" height="1rem" {...props} />
)

export const SkeletonTitle = (props) => (
  <LoadingSkeleton variant="text" height="1.5rem" {...props} />
)

export const SkeletonAvatar = ({ size = 40, ...props }) => (
  <LoadingSkeleton 
    variant="circular" 
    width={size} 
    height={size} 
    {...props} 
  />
)

export const SkeletonButton = (props) => (
  <LoadingSkeleton 
    variant="rectangular" 
    width="120px" 
    height="38px" 
    borderRadius="6px"
    {...props} 
  />
)

export const SkeletonCard = ({ lines = 3, ...props }) => (
  <div className="p-3">
    <LoadingSkeleton 
      variant="rectangular" 
      height="150px" 
      className="mb-3"
      {...props} 
    />
    <LoadingSkeleton variant="card" lines={lines} />
  </div>
)

export default LoadingSkeleton
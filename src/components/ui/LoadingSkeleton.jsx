"use client"

import { forwardRef } from 'react'
import { motion } from 'framer-motion'

const LoadingSkeleton = forwardRef(({
  variant = 'text',
  width = '100%',
  height,
  lines = 3,
  className = '',
  animate = true,
  ...props
}, ref) => {
  const skeletonVariants = {
    animate: {
      opacity: [0.6, 1, 0.6],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  }

  const getSkeletonHeight = () => {
    if (height) return height
    switch (variant) {
      case 'title': return '28px'
      case 'subtitle': return '20px'
      case 'text': return '16px'
      case 'button': return '38px'
      case 'card': return '200px'
      case 'avatar': return '40px'
      case 'avatar-lg': return '64px'
      default: return '16px'
    }
  }

  const getSkeletonClass = () => {
    let classes = ['skeleton', `skeleton-${variant}`, className]
    if (variant === 'avatar' || variant === 'avatar-lg') {
      classes.push('rounded-circle')
    }
    return classes.filter(Boolean).join(' ')
  }

  const skeletonStyle = {
    width,
    height: getSkeletonHeight(),
    backgroundColor: '#e9ecef',
    borderRadius: variant === 'avatar' || variant === 'avatar-lg' ? '50%' : '4px',
    display: 'block',
    marginBottom: variant === 'text' ? '8px' : '0'
  }

  if (variant === 'text' && lines > 1) {
    return (
      <div ref={ref} {...props}>
        {Array.from({ length: lines }, (_, index) => (
          <motion.div
            key={index}
            className={getSkeletonClass()}
            style={{
              ...skeletonStyle,
              width: index === lines - 1 ? '75%' : width,
              marginBottom: index === lines - 1 ? '0' : '8px'
            }}
            variants={animate ? skeletonVariants : undefined}
            animate={animate ? "animate" : undefined}
          />
        ))}
      </div>
    )
  }

  if (variant === 'card') {
    return (
      <div ref={ref} className={`skeleton-card ${className}`} {...props}>
        <motion.div
          className="skeleton skeleton-card-header"
          style={{ width: '100%', height: '60%', marginBottom: '12px' }}
          variants={animate ? skeletonVariants : undefined}
          animate={animate ? "animate" : undefined}
        />
        <div className="skeleton-card-content">
          <motion.div
            className="skeleton skeleton-title"
            style={{ width: '80%', height: '20px', marginBottom: '8px' }}
            variants={animate ? skeletonVariants : undefined}
            animate={animate ? "animate" : undefined}
          />
          <motion.div
            className="skeleton skeleton-text"
            style={{ width: '100%', height: '14px', marginBottom: '6px' }}
            variants={animate ? skeletonVariants : undefined}
            animate={animate ? "animate" : undefined}
          />
          <motion.div
            className="skeleton skeleton-text"
            style={{ width: '70%', height: '14px' }}
            variants={animate ? skeletonVariants : undefined}
            animate={animate ? "animate" : undefined}
          />
        </div>
      </div>
    )
  }

  return (
    <motion.div
      ref={ref}
      className={getSkeletonClass()}
      style={skeletonStyle}
      variants={animate ? skeletonVariants : undefined}
      animate={animate ? "animate" : undefined}
      {...props}
    />
  )
})

LoadingSkeleton.displayName = 'LoadingSkeleton'

export default LoadingSkeleton
"use client"

import { forwardRef } from 'react'
import { Badge as BootstrapBadge } from 'react-bootstrap'
import { motion } from 'framer-motion'

const Badge = forwardRef(({
  children,
  variant = 'primary',
  size = 'normal',
  pill = false,
  dot = false,
  pulse = false,
  className = '',
  icon: Icon,
  ...props
}, ref) => {
  const badgeClasses = [
    className,
    `badge-${size}`,
    pulse && 'badge-pulse',
    dot && 'badge-dot'
  ].filter(Boolean).join(' ')

  const MotionBadge = motion(BootstrapBadge)

  if (dot) {
    return (
      <MotionBadge
        ref={ref}
        bg={variant}
        className={badgeClasses}
        animate={pulse ? { scale: [1, 1.1, 1] } : undefined}
        transition={pulse ? { duration: 1.5, repeat: Infinity } : undefined}
        {...props}
      />
    )
  }

  return (
    <MotionBadge
      ref={ref}
      bg={variant}
      pill={pill}
      className={badgeClasses}
      animate={pulse ? { scale: [1, 1.05, 1] } : undefined}
      transition={pulse ? { duration: 2, repeat: Infinity } : undefined}
      {...props}
    >
      {Icon && <Icon size={12} className="me-1" />}
      {children}
    </MotionBadge>
  )
})

Badge.displayName = 'Badge'

export default Badge
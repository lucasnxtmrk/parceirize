"use client"

import { forwardRef } from 'react'
import { Badge } from 'react-bootstrap'
import { motion } from 'framer-motion'

const NotificationBadge = forwardRef(({
  count = 0,
  maxCount = 99,
  dot = false,
  variant = 'danger',
  position = 'top-end',
  offset = 0,
  className = '',
  children,
  ...props
}, ref) => {
  const displayCount = count > maxCount ? `${maxCount}+` : count
  const hasCount = count > 0

  if (!hasCount && !dot) {
    return children
  }

  const positionClasses = {
    'top-start': 'top-0 start-0',
    'top-end': 'top-0 end-0',
    'bottom-start': 'bottom-0 start-0',
    'bottom-end': 'bottom-0 end-0'
  }

  const offsetStyles = {
    transform: `translate(${offset}px, ${offset}px)`
  }

  return (
    <div ref={ref} className="position-relative d-inline-block" {...props}>
      {children}
      {hasCount && (
        <motion.div
          className={`position-absolute ${positionClasses[position]} ${className}`}
          style={offsetStyles}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 15 }}
        >
          <Badge
            bg={variant}
            pill
            className={`notification-badge ${dot ? 'notification-badge-dot' : ''}`}
          >
            {dot ? '' : displayCount}
          </Badge>
        </motion.div>
      )}
    </div>
  )
})

NotificationBadge.displayName = 'NotificationBadge'

export default NotificationBadge
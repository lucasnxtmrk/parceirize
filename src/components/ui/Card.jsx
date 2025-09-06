"use client"

import { forwardRef } from 'react'
import { Card as BootstrapCard } from 'react-bootstrap'
import { motion } from 'framer-motion'

const Card = forwardRef(({
  children,
  title,
  subtitle,
  className = '',
  hover = false,
  loading = false,
  actions,
  ...props
}, ref) => {
  const cardClasses = [
    className,
    hover && 'card-hover',
    loading && 'card-loading'
  ].filter(Boolean).join(' ')

  const MotionCard = motion(BootstrapCard)

  if (loading) {
    return (
      <BootstrapCard className={cardClasses} ref={ref} {...props}>
        <BootstrapCard.Body>
          <div className="skeleton-loader">
            <div className="skeleton skeleton-title"></div>
            <div className="skeleton skeleton-text"></div>
            <div className="skeleton skeleton-text"></div>
          </div>
        </BootstrapCard.Body>
      </BootstrapCard>
    )
  }

  return (
    <MotionCard
      ref={ref}
      className={cardClasses}
      {...props}
    >
      {(title || subtitle || actions) && (
        <BootstrapCard.Header className="d-flex justify-content-between align-items-start">
          <div>
            {title && <BootstrapCard.Title className="mb-1">{title}</BootstrapCard.Title>}
            {subtitle && <BootstrapCard.Subtitle className="text-muted">{subtitle}</BootstrapCard.Subtitle>}
          </div>
          {actions && <div className="card-actions">{actions}</div>}
        </BootstrapCard.Header>
      )}
      <BootstrapCard.Body>
        {children}
      </BootstrapCard.Body>
    </MotionCard>
  )
})

Card.displayName = 'Card'

Card.Header = BootstrapCard.Header
Card.Body = BootstrapCard.Body
Card.Footer = BootstrapCard.Footer
Card.Title = BootstrapCard.Title
Card.Subtitle = BootstrapCard.Subtitle
Card.Text = BootstrapCard.Text
Card.Link = BootstrapCard.Link

export default Card
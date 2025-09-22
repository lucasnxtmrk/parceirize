"use client"

import { forwardRef } from 'react'
import { Button as BootstrapButton, Spinner } from 'react-bootstrap'
import { motion } from 'framer-motion'

const Button = forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon: Icon,
  iconPosition = 'left',
  fullWidth = false,
  className = '',
  onClick,
  disabled = false,
  ...props
}, ref) => {
  const handleClick = (e) => {
    if (loading || disabled) return
    onClick?.(e)
  }

  const buttonClasses = [
    className,
    fullWidth && 'w-100',
    loading && 'loading'
  ].filter(Boolean).join(' ')

  const MotionButton = motion(BootstrapButton)

  return (
    <MotionButton
      ref={ref}
      variant={variant}
      size={size}
      className={buttonClasses}
      onClick={handleClick}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <Spinner
            as="span"
            animation="border"
            size="sm"
            role="status"
            aria-hidden="true"
            className="me-2"
          />
          Carregando...
        </>
      ) : (
        <>
          {Icon && iconPosition === 'left' && <Icon className="me-2" size={16} />}
          {children}
          {Icon && iconPosition === 'right' && <Icon className="ms-2" size={16} />}
        </>
      )}
    </MotionButton>
  )
})

Button.displayName = 'Button'

export default Button
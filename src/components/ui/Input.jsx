"use client"

import { forwardRef, useState } from 'react'
import { Form, InputGroup } from 'react-bootstrap'
import { motion } from 'framer-motion'

const Input = forwardRef(({
  label,
  type = 'text',
  placeholder,
  error,
  success,
  helpText,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  onRightIconClick,
  className = '',
  required = false,
  disabled = false,
  loading = false,
  fullWidth = true,
  ...props
}, ref) => {
  const [focused, setFocused] = useState(false)

  const inputClasses = [
    className,
    error && 'is-invalid',
    success && 'is-valid',
    fullWidth && 'w-100'
  ].filter(Boolean).join(' ')

  const handleFocus = (e) => {
    setFocused(true)
    props.onFocus?.(e)
  }

  const handleBlur = (e) => {
    setFocused(false)
    props.onBlur?.(e)
  }

  return (
    <motion.div
      className="mb-3"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {label && (
        <Form.Label className={`form-label ${required ? 'required' : ''}`}>
          {label}
          {required && <span className="text-danger ms-1">*</span>}
        </Form.Label>
      )}
      
      <InputGroup className={focused ? 'input-group-focused' : ''}>
        {LeftIcon && (
          <InputGroup.Text>
            <LeftIcon size={16} className="text-muted" />
          </InputGroup.Text>
        )}
        
        <Form.Control
          ref={ref}
          type={type}
          placeholder={placeholder}
          className={inputClasses}
          disabled={disabled || loading}
          required={required}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />
        
        {RightIcon && (
          <InputGroup.Text 
            className={onRightIconClick ? 'cursor-pointer' : ''}
            onClick={onRightIconClick}
          >
            {loading ? (
              <div className="spinner-border spinner-border-sm" role="status">
                <span className="visually-hidden">Carregando...</span>
              </div>
            ) : (
              <RightIcon size={16} className="text-muted" />
            )}
          </InputGroup.Text>
        )}
      </InputGroup>
      
      {error && (
        <motion.div 
          className="invalid-feedback d-block"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
        >
          {error}
        </motion.div>
      )}
      
      {success && (
        <motion.div 
          className="valid-feedback d-block"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
        >
          {success}
        </motion.div>
      )}
      
      {helpText && !error && !success && (
        <Form.Text className="text-muted">
          {helpText}
        </Form.Text>
      )}
    </motion.div>
  )
})

Input.displayName = 'Input'

export default Input
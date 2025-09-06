"use client"

import { forwardRef } from 'react'
import { Form as BootstrapForm } from 'react-bootstrap'
import { motion } from 'framer-motion'
import Button from '../Button'
import FormField from './FormField'
import FormGroup from './FormGroup'

const Form = forwardRef(({
  children,
  
  // Props do formulário
  onSubmit,
  noValidate = true,
  validated = false,
  
  // Loading e estados
  loading = false,
  disabled = false,
  
  // Layout e visual
  className = '',
  animated = true,
  
  // Botões de ação
  submitLabel = "Enviar",
  submitIcon,
  submitVariant = "primary",
  cancelLabel,
  cancelIcon,
  onCancel,
  
  // Configurações avançadas
  showActions = true,
  actionsAlign = 'start', // start, center, end, between
  
  ...props
}, ref) => {
  
  const handleSubmit = (e) => {
    e.preventDefault()
    if (loading || disabled) return
    onSubmit?.(e)
  }
  
  const renderActions = () => {
    if (!showActions) return null
    
    const alignClasses = {
      start: 'justify-content-start',
      center: 'justify-content-center', 
      end: 'justify-content-end',
      between: 'justify-content-between'
    }
    
    return (
      <div className={`d-flex gap-2 ${alignClasses[actionsAlign]} mt-4 pt-3 border-top`}>
        {onCancel && cancelLabel && (
          <Button
            type="button"
            variant="outline-secondary"
            icon={cancelIcon}
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
        )}
        
        <Button
          type="submit"
          variant={submitVariant}
          icon={submitIcon}
          loading={loading}
          disabled={disabled}
        >
          {submitLabel}
        </Button>
      </div>
    )
  }
  
  const formContent = (
    <BootstrapForm
      ref={ref}
      onSubmit={handleSubmit}
      noValidate={noValidate}
      validated={validated}
      className={className}
      {...props}
    >
      {children}
      {renderActions()}
    </BootstrapForm>
  )
  
  if (animated) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {formContent}
      </motion.div>
    )
  }
  
  return formContent
})

Form.displayName = 'Form'

// Exportar sub-componentes
Form.Field = FormField
Form.Group = FormGroup

export default Form
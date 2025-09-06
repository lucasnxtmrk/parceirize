"use client"

import { forwardRef } from 'react'
import { Form, InputGroup } from 'react-bootstrap'
import IconifyIcon from '@/components/wrappers/IconifyIcon'

const FormField = forwardRef(({
  // Props básicas
  label,
  name,
  type = 'text',
  placeholder,
  helpText,
  required = false,
  disabled = false,
  readOnly = false,
  
  // Validação
  error,
  isValid,
  isInvalid,
  
  // Layout e visual
  size = 'md', // sm, md, lg
  className = '',
  controlClassName = '',
  
  // Ícones
  leftIcon,
  rightIcon,
  
  // Valor e mudanças
  value,
  defaultValue,
  onChange,
  onBlur,
  onFocus,
  
  // Props específicas para diferentes tipos
  rows, // para textarea
  options = [], // para select
  accept, // para file
  multiple, // para file/select
  
  // Componente personalizado
  as,
  children,
  
  ...props
}, ref) => {
  
  const fieldId = name || `field-${Date.now()}`
  
  const renderLabel = () => {
    if (!label) return null
    
    return (
      <Form.Label htmlFor={fieldId} className="fw-medium mb-2">
        {label}
        {required && <span className="text-danger ms-1">*</span>}
      </Form.Label>
    )
  }
  
  const renderControl = () => {
    const controlProps = {
      ref,
      id: fieldId,
      name,
      type,
      placeholder,
      required,
      disabled,
      readOnly,
      size,
      value,
      defaultValue,
      onChange,
      onBlur,
      onFocus,
      isValid: isValid || undefined,
      isInvalid: isInvalid || !!error,
      className: controlClassName,
      ...props
    }

    // Campo customizado
    if (as) {
      return <Form.Control as={as} {...controlProps} />
    }

    // Textarea
    if (type === 'textarea') {
      return <Form.Control as="textarea" rows={rows || 3} {...controlProps} />
    }
    
    // Select
    if (type === 'select') {
      return (
        <Form.Select {...controlProps} multiple={multiple}>
          {options.map((option, idx) => (
            <option key={idx} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </Form.Select>
      )
    }
    
    // File input
    if (type === 'file') {
      return (
        <Form.Control 
          type="file" 
          accept={accept}
          multiple={multiple}
          {...controlProps} 
        />
      )
    }
    
    // Checkbox/Radio
    if (type === 'checkbox' || type === 'radio') {
      return (
        <Form.Check
          type={type}
          id={fieldId}
          label={placeholder || label}
          {...controlProps}
        />
      )
    }
    
    // Campo padrão
    return <Form.Control {...controlProps} />
  }
  
  const renderInputWithIcons = () => {
    if (!leftIcon && !rightIcon) {
      return renderControl()
    }
    
    return (
      <InputGroup>
        {leftIcon && (
          <InputGroup.Text className="border-end-0 bg-transparent">
            <IconifyIcon icon={leftIcon} width={16} className="text-muted" />
          </InputGroup.Text>
        )}
        
        {renderControl()}
        
        {rightIcon && (
          <InputGroup.Text className="border-start-0 bg-transparent">
            <IconifyIcon icon={rightIcon} width={16} className="text-muted" />
          </InputGroup.Text>
        )}
      </InputGroup>
    )
  }
  
  const renderFeedback = () => {
    if (error) {
      return <Form.Control.Feedback type="invalid">{error}</Form.Control.Feedback>
    }
    
    if (helpText) {
      return <Form.Text className="text-muted">{helpText}</Form.Text>
    }
    
    return null
  }
  
  return (
    <Form.Group className={`mb-3 ${className}`}>
      {renderLabel()}
      {renderInputWithIcons()}
      {renderFeedback()}
      {children}
    </Form.Group>
  )
})

FormField.displayName = 'FormField'

export default FormField
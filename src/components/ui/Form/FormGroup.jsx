"use client"

import { forwardRef } from 'react'
import { Row, Col } from 'react-bootstrap'

const FormGroup = forwardRef(({
  children,
  title,
  subtitle,
  className = '',
  layout = 'vertical', // vertical, horizontal, inline
  spacing = 'md', // sm, md, lg
  columns = 1, // Para layout de colunas
  ...props
}, ref) => {
  
  const spacingClasses = {
    sm: 'mb-3',
    md: 'mb-4',
    lg: 'mb-5'
  }
  
  const renderHeader = () => {
    if (!title && !subtitle) return null
    
    return (
      <div className="mb-3">
        {title && (
          <h6 className="fw-bold mb-1 text-dark">
            {title}
          </h6>
        )}
        {subtitle && (
          <p className="text-muted small mb-0">
            {subtitle}
          </p>
        )}
      </div>
    )
  }
  
  const renderChildren = () => {
    if (layout === 'horizontal') {
      // Layout horizontal - campos lado a lado
      return (
        <Row className="g-3">
          {Array.isArray(children) ? (
            children.map((child, index) => (
              <Col key={index} md={12 / children.length}>
                {child}
              </Col>
            ))
          ) : (
            <Col>{children}</Col>
          )}
        </Row>
      )
    }
    
    if (layout === 'inline') {
      // Layout inline - campos em linha
      return (
        <div className="d-flex flex-wrap gap-3 align-items-end">
          {children}
        </div>
      )
    }
    
    if (columns > 1) {
      // Layout de colunas específicas
      return (
        <Row className="g-3">
          {Array.isArray(children) ? (
            children.map((child, index) => (
              <Col key={index} md={12 / columns} lg={12 / columns}>
                {child}
              </Col>
            ))
          ) : (
            <Col>{children}</Col>
          )}
        </Row>
      )
    }
    
    // Layout vertical padrão
    return children
  }
  
  return (
    <div 
      ref={ref}
      className={`form-group ${spacingClasses[spacing]} ${className}`}
      {...props}
    >
      {renderHeader()}
      {renderChildren()}
    </div>
  )
})

FormGroup.displayName = 'FormGroup'

export default FormGroup
"use client"

import { forwardRef } from 'react'
import { Row, Col } from 'react-bootstrap'

const ResponsiveGrid = forwardRef(({
  children,
  columns = {
    xs: 1,
    sm: 2,
    md: 3,
    lg: 4,
    xl: 4,
    xxl: 4
  },
  gap = 3,
  className = '',
  ...props
}, ref) => {
  const getColProps = () => {
    return Object.keys(columns).reduce((acc, breakpoint) => {
      const colCount = 12 / columns[breakpoint]
      acc[breakpoint] = colCount
      return acc
    }, {})
  }

  const colProps = getColProps()

  return (
    <Row ref={ref} className={`g-${gap} ${className}`} {...props}>
      {Array.isArray(children) 
        ? children.map((child, index) => (
            <Col key={index} {...colProps}>
              {child}
            </Col>
          ))
        : <Col {...colProps}>{children}</Col>
      }
    </Row>
  )
})

ResponsiveGrid.displayName = 'ResponsiveGrid'

export default ResponsiveGrid
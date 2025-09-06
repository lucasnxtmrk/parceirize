"use client"

import { forwardRef } from 'react'
import { Container, Row, Col } from 'react-bootstrap'
import LoadingSpinner from './LoadingSpinner'
import LoadingSkeleton, { SkeletonCard } from './LoadingSkeleton'

const LoadingState = forwardRef(({
  // Tipo de loading
  type = 'spinner', // spinner, skeleton, custom
  
  // Configurações do spinner
  spinnerSize = 'lg',
  spinnerVariant = 'primary',
  spinnerText = 'Carregando...',
  
  // Configurações do skeleton
  skeletonType = 'cards', // cards, list, table, custom
  skeletonCount = 6,
  
  // Layout
  fullHeight = false,
  centered = true,
  className = '',
  
  // Componente personalizado
  children,
  
  ...props
}, ref) => {
  
  const renderSpinner = () => (
    <LoadingSpinner
      size={spinnerSize}
      variant={spinnerVariant}
      text={spinnerText}
      centered={true}
    />
  )
  
  const renderSkeletonCards = () => (
    <Row className="g-4">
      {Array.from({ length: skeletonCount }).map((_, index) => (
        <Col lg={4} md={6} key={index}>
          <SkeletonCard />
        </Col>
      ))}
    </Row>
  )
  
  const renderSkeletonList = () => (
    <div className="d-flex flex-column gap-3">
      {Array.from({ length: skeletonCount }).map((_, index) => (
        <div key={index} className="d-flex align-items-center gap-3 p-3 border rounded">
          <LoadingSkeleton variant="circular" width="60px" height="60px" />
          <div className="flex-grow-1">
            <LoadingSkeleton variant="text" height="1.25rem" width="70%" className="mb-2" />
            <LoadingSkeleton variant="text" height="1rem" width="50%" />
          </div>
        </div>
      ))}
    </div>
  )
  
  const renderSkeletonTable = () => (
    <div className="border rounded overflow-hidden">
      {/* Header */}
      <div className="bg-light p-3 border-bottom">
        <div className="d-flex gap-3">
          <LoadingSkeleton width="20%" height="1rem" />
          <LoadingSkeleton width="30%" height="1rem" />
          <LoadingSkeleton width="25%" height="1rem" />
          <LoadingSkeleton width="25%" height="1rem" />
        </div>
      </div>
      
      {/* Rows */}
      {Array.from({ length: skeletonCount }).map((_, index) => (
        <div key={index} className="p-3 border-bottom">
          <div className="d-flex gap-3 align-items-center">
            <LoadingSkeleton width="20%" height="1rem" />
            <LoadingSkeleton width="30%" height="1rem" />
            <LoadingSkeleton width="25%" height="1rem" />
            <LoadingSkeleton width="25%" height="1rem" />
          </div>
        </div>
      ))}
    </div>
  )
  
  const renderSkeleton = () => {
    switch (skeletonType) {
      case 'cards':
        return renderSkeletonCards()
      case 'list':
        return renderSkeletonList()
      case 'table':
        return renderSkeletonTable()
      case 'custom':
        return children
      default:
        return renderSkeletonCards()
    }
  }
  
  const renderContent = () => {
    if (type === 'custom' && children) {
      return children
    }
    
    if (type === 'skeleton') {
      return renderSkeleton()
    }
    
    return renderSpinner()
  }
  
  const containerClasses = [
    fullHeight && 'min-vh-100',
    centered && fullHeight && 'd-flex align-items-center justify-content-center',
    centered && !fullHeight && 'text-center py-5',
    className
  ].filter(Boolean).join(' ')
  
  if (fullHeight) {
    return (
      <Container fluid className={containerClasses} ref={ref} {...props}>
        <div style={{ width: '100%', maxWidth: type === 'skeleton' ? '1200px' : 'auto' }}>
          {renderContent()}
        </div>
      </Container>
    )
  }
  
  return (
    <div ref={ref} className={containerClasses} {...props}>
      {renderContent()}
    </div>
  )
})

LoadingState.displayName = 'LoadingState'

// Componentes pré-configurados para casos específicos
export const PageLoading = (props) => (
  <LoadingState 
    type="spinner"
    fullHeight={true}
    spinnerSize="xl"
    spinnerText="Carregando página..."
    {...props} 
  />
)

export const CardLoading = ({ count = 6, ...props }) => (
  <LoadingState 
    type="skeleton"
    skeletonType="cards"
    skeletonCount={count}
    centered={false}
    {...props} 
  />
)

export const ListLoading = ({ count = 5, ...props }) => (
  <LoadingState 
    type="skeleton"
    skeletonType="list"
    skeletonCount={count}
    centered={false}
    {...props} 
  />
)

export const TableLoading = ({ rows = 8, ...props }) => (
  <LoadingState 
    type="skeleton"
    skeletonType="table"
    skeletonCount={rows}
    centered={false}
    {...props} 
  />
)

export default LoadingState
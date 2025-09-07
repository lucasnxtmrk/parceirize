"use client"

import { forwardRef } from 'react'
import { Card, CardBody, Badge } from 'react-bootstrap'
import { motion } from 'framer-motion'
import Image from 'next/image'
import Button from './button'
import IconifyIcon from '@/components/wrappers/IconifyIcon'

const ProductCard = forwardRef(({
  // Dados básicos
  id,
  title,
  subtitle,
  description,
  image,
  category,
  
  // Preços e valores
  price,
  originalPrice,
  discount,
  priceRange,
  
  // Badges e tags
  badges = [],
  tags = [],
  
  // Status e estados
  status = 'available', // available, unavailable, coming_soon
  featured = false,
  
  // Ações
  onAction,
  actionLabel = "Ver mais",
  actionIcon,
  actionVariant = "primary",
  secondaryAction,
  secondaryLabel,
  secondaryIcon,
  
  // Estilos e layout
  variant = "default", // default, compact, featured
  className = '',
  imageHeight = "120px",
  
  // Animação
  index = 0,
  animationDelay = 0.1,
  
  ...props
}, ref) => {
  const isUnavailable = status === 'unavailable'
  const isComingSoon = status === 'coming_soon'
  
  const cardClasses = [
    'border-0 h-100 position-relative overflow-hidden',
    featured && 'featured-card',
    variant === 'compact' && 'compact-card',
    className
  ].filter(Boolean).join(' ')

  const cardStyles = {
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    transition: 'all 0.3s ease'
  }

  const renderBadges = () => (
    <>
      {/* Badge de destaque */}
      {featured && (
        <motion.div 
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: (index * animationDelay) + 0.3, type: "spring" }}
          className="position-absolute top-0 start-0 m-3"
        >
          <Badge 
            bg="warning" 
            className="px-2 py-1 fw-semibold shadow-sm"
            style={{ borderRadius: '6px', fontSize: '0.7rem' }}
          >
            <IconifyIcon icon="heroicons:star" width={14} className="me-1" />
            Destaque
          </Badge>
        </motion.div>
      )}
      
      {/* Badge de desconto */}
      {discount && discount > 0 && (
        <motion.div 
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: (index * animationDelay) + 0.4, type: "spring" }}
          className="position-absolute top-0 end-0 m-3"
        >
          <Badge 
            bg="danger" 
            className="px-2 py-1 fw-semibold shadow-sm"
            style={{ borderRadius: '6px', fontSize: '0.7rem' }}
          >
            -{discount}%
          </Badge>
        </motion.div>
      )}
      
      {/* Badges customizados */}
      {badges.map((badge, idx) => (
        <motion.div 
          key={idx}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: (index * animationDelay) + 0.5 + (idx * 0.1), type: "spring" }}
          className={`position-absolute ${badge.position || 'top-0 start-0'} m-3`}
        >
          <Badge 
            bg={badge.variant || 'primary'}
            className="px-3 py-2 fw-semibold shadow-sm"
            style={{ borderRadius: '20px', fontSize: '0.75rem' }}
          >
            {badge.icon && <IconifyIcon icon={badge.icon} width={14} className="me-1" />}
            {badge.label}
          </Badge>
        </motion.div>
      ))}
    </>
  )

  const renderPrice = () => {
    if (priceRange) {
      return (
        <div className="mb-2">
          <div className="d-flex align-items-baseline gap-2">
            <span className="text-muted small">A partir de</span>
            <span className="h6 mb-0 fw-bold text-success">
              {priceRange.min}
            </span>
          </div>
          {priceRange.max && priceRange.max !== priceRange.min && (
            <div className="text-muted small">
              Até {priceRange.max}
            </div>
          )}
        </div>
      )
    }

    if (price) {
      return (
        <div className="mb-2">
          <div className="d-flex align-items-center gap-2">
            <span className="h6 mb-0 fw-bold text-success">
              {price}
            </span>
            {originalPrice && (
              <span className="text-muted text-decoration-line-through small">
                {originalPrice}
              </span>
            )}
          </div>
        </div>
      )
    }

    return null
  }

  const renderActions = () => (
    <div className={secondaryAction ? "d-flex gap-2" : "d-grid"}>
      {/* Ação principal */}
      <Button
        variant={isUnavailable ? "outline-secondary" : actionVariant}
        icon={actionIcon}
        iconPosition="left"
        onClick={onAction}
        disabled={isUnavailable}
        className="fw-semibold"
        fullWidth={!secondaryAction}
      >
        {isComingSoon ? 'Em breve' : isUnavailable ? 'Indisponível' : actionLabel}
        {!isUnavailable && !isComingSoon && (
          <IconifyIcon icon="heroicons:arrow-right" width={16} className="ms-2" />
        )}
      </Button>
      
      {/* Ação secundária */}
      {secondaryAction && (
        <Button
          variant="outline-secondary"
          icon={secondaryIcon}
          iconPosition="left"
          onClick={secondaryAction}
          disabled={isUnavailable}
          className="fw-medium"
        >
          {secondaryLabel}
        </Button>
      )}
    </div>
  )

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.5, 
        delay: index * animationDelay,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
      whileHover={{ 
        y: -2,
        transition: { duration: 0.2, ease: "easeOut" }
      }}
      style={{ pointerEvents: 'auto' }}
      {...props}
    >
      <Card className={cardClasses} style={cardStyles}>
        {/* Imagem com overlay */}
        <div className="position-relative" style={{ height: imageHeight, overflow: "hidden" }}>
          <Image
            src={image || "/assets/images/avatar.jpg"}
            alt={title}
            className="w-100 h-100"
            width={400}
            height={200}
            style={{ 
              objectFit: "cover",
              transition: 'transform 0.3s ease',
              filter: isUnavailable ? 'grayscale(100%)' : 'none'
            }}
          />
          
          {/* Overlay gradiente */}
          <div className="position-absolute bottom-0 start-0 w-100 h-50" style={{
            background: 'linear-gradient(transparent, rgba(0,0,0,0.7))'
          }} />
          
          {renderBadges()}
          
          {/* Título sobreposto */}
          <div className="position-absolute bottom-0 start-0 p-3 text-white">
            <h6 className="fw-bold mb-1" style={{ 
              textShadow: '0 2px 4px rgba(0,0,0,0.5)',
              fontSize: variant === 'compact' ? '0.9rem' : '1rem'
            }}>
              {title}
            </h6>
            {subtitle && (
              <p className="mb-0 small opacity-75">{subtitle}</p>
            )}
          </div>
        </div>

        <CardBody className="p-2">
          {/* Categoria */}
          {category && (
            <div className="mb-2">
              <Badge 
                bg="light" 
                text="dark" 
                className="px-2 py-1 fw-medium border"
                style={{ borderRadius: '10px', fontSize: '0.7rem' }}
              >
                {category.icon && <span className="me-1">{category.icon}</span>}
                {category.name || category}
              </Badge>
            </div>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="mb-3 d-flex flex-wrap gap-1">
              {tags.map((tag, idx) => (
                <Badge 
                  key={idx}
                  bg="outline-secondary" 
                  className="px-1 py-0 small border"
                  style={{ borderRadius: '6px', fontSize: '0.7rem' }}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Descrição */}
          {description && (
            <div className="mb-2">
              <p className="text-muted small mb-0" style={{ 
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}>
                {description}
              </p>
            </div>
          )}

          {/* Preços */}
          {renderPrice()}

          {/* Ações */}
          <div className="mt-auto">
            {renderActions()}
          </div>
        </CardBody>
      </Card>
    </motion.div>
  )
})

ProductCard.displayName = 'ProductCard'

export default ProductCard
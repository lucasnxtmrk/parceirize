"use client"

import { useState, useRef, useEffect, forwardRef } from 'react'
import { motion } from 'framer-motion'
import LoadingSkeleton from './LoadingSkeleton'

const OptimizedImage = forwardRef(({
  src,
  alt,
  width,
  height,
  className = '',
  fallback = '/images/placeholder.png',
  lazy = true,
  quality = 75,
  blur = true,
  priority = false,
  onLoad,
  onError,
  ...props
}, ref) => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [inView, setInView] = useState(!lazy)
  const imgRef = useRef(null)

  useEffect(() => {
    if (!lazy || priority) {
      setInView(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    )

    if (imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => observer.disconnect()
  }, [lazy, priority])

  const handleLoad = (e) => {
    setLoading(false)
    onLoad?.(e)
  }

  const handleError = (e) => {
    setLoading(false)
    setError(true)
    onError?.(e)
  }

  const optimizeSrc = (originalSrc) => {
    if (!originalSrc || originalSrc.startsWith('data:')) return originalSrc
    
    // Se for uma URL externa, retorna como está
    if (originalSrc.startsWith('http')) return originalSrc
    
    // Para imagens locais, você pode implementar otimização aqui
    // Por exemplo, adicionar parâmetros de quality, format, etc.
    const params = new URLSearchParams()
    if (quality) params.set('q', quality)
    if (width) params.set('w', width)
    if (height) params.set('h', height)
    
    return params.toString() ? `${originalSrc}?${params}` : originalSrc
  }

  const imageClasses = [
    className,
    loading && blur ? 'image-blur' : '',
    'optimized-image'
  ].filter(Boolean).join(' ')

  return (
    <div 
      ref={imgRef}
      className="position-relative d-inline-block"
      style={{ width, height }}
    >
      {loading && (
        <LoadingSkeleton
          variant="card"
          width={width || '100%'}
          height={height || '200px'}
          className="position-absolute top-0 start-0"
        />
      )}
      
      {inView && (
        <motion.img
          ref={ref}
          src={error ? fallback : optimizeSrc(src)}
          alt={alt}
          width={width}
          height={height}
          className={imageClasses}
          onLoad={handleLoad}
          onError={handleError}
          loading={lazy && !priority ? 'lazy' : 'eager'}
          initial={{ opacity: 0 }}
          animate={{ opacity: loading ? 0 : 1 }}
          transition={{ duration: 0.3 }}
          {...props}
        />
      )}
    </div>
  )
})

OptimizedImage.displayName = 'OptimizedImage'

export default OptimizedImage
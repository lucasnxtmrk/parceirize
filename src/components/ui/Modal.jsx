"use client"

import { forwardRef } from 'react'
import { Modal as BootstrapModal } from 'react-bootstrap'
import { motion, AnimatePresence } from 'framer-motion'
import Button from './Button'

const Modal = forwardRef(({
  children,
  show = false,
  onHide,
  title,
  size = 'lg',
  centered = true,
  backdrop = true,
  keyboard = true,
  className = '',
  loading = false,
  actions,
  ...props
}, ref) => {
  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  }

  const modalVariants = {
    hidden: { 
      opacity: 0,
      scale: 0.8,
      y: -50
    },
    visible: { 
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 25
      }
    },
    exit: {
      opacity: 0,
      scale: 0.8,
      y: -50,
      transition: {
        duration: 0.2
      }
    }
  }

  return (
    <AnimatePresence>
      {show && (
        <BootstrapModal
          show={show}
          onHide={onHide}
          size={size}
          centered={centered}
          backdrop={backdrop}
          keyboard={keyboard}
          className={className}
          ref={ref}
          {...props}
        >
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {title && (
              <BootstrapModal.Header closeButton>
                <BootstrapModal.Title>{title}</BootstrapModal.Title>
              </BootstrapModal.Header>
            )}
            
            <BootstrapModal.Body>
              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Carregando...</span>
                  </div>
                </div>
              ) : (
                children
              )}
            </BootstrapModal.Body>

            {actions && (
              <BootstrapModal.Footer>
                {actions}
              </BootstrapModal.Footer>
            )}
          </motion.div>
        </BootstrapModal>
      )}
    </AnimatePresence>
  )
})

Modal.displayName = 'Modal'

Modal.Header = BootstrapModal.Header
Modal.Body = BootstrapModal.Body
Modal.Footer = BootstrapModal.Footer
Modal.Title = BootstrapModal.Title

export default Modal
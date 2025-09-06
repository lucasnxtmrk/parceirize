"use client";

import { motion } from "framer-motion";
import { Spinner } from "react-bootstrap";

const LoadingSpinner = ({ 
  size = "md", 
  text = "Carregando...", 
  variant = "primary",
  fullScreen = false,
  overlay = false 
}) => {
  const spinnerSizes = {
    sm: { width: "1rem", height: "1rem" },
    md: { width: "2rem", height: "2rem" },
    lg: { width: "3rem", height: "3rem" }
  };

  const LoadingContent = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.3 }}
      className="d-flex flex-column align-items-center justify-content-center"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      >
        <Spinner 
          animation="border" 
          variant={variant}
          style={spinnerSizes[size]}
        />
      </motion.div>
      {text && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-3 mb-0 text-muted"
        >
          {text}
        </motion.p>
      )}
    </motion.div>
  );

  if (fullScreen) {
    return (
      <div 
        className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-white"
        style={{ zIndex: 9999 }}
      >
        <LoadingContent />
      </div>
    );
  }

  if (overlay) {
    return (
      <div 
        className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
        style={{ 
          backgroundColor: "rgba(255, 255, 255, 0.8)",
          zIndex: 1000,
          backdropFilter: "blur(2px)"
        }}
      >
        <LoadingContent />
      </div>
    );
  }

  return <LoadingContent />;
};

export default LoadingSpinner;
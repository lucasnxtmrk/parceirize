"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";

const SplashScreen = ({ onComplete, duration = 2000 }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        onComplete?.();
      }, 500); // Aguarda animação de saída
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="position-fixed top-0 start-0 w-100 h-100 d-flex flex-column align-items-center justify-content-center"
      style={{
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        zIndex: 9999
      }}
    >
      {/* Logo ou Ícone Principal */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ 
          duration: 0.8, 
          ease: "easeOut",
          type: "spring",
          stiffness: 200 
        }}
        className="mb-4"
      >
        <div
          className="rounded-circle d-flex align-items-center justify-content-center shadow-lg"
          style={{
            width: "120px",
            height: "120px",
            background: "white",
            fontSize: "3rem"
          }}
        >
          🏪
        </div>
      </motion.div>

      {/* Nome da Aplicação */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="text-white fw-bold mb-2"
        style={{ fontSize: "2.5rem" }}
      >
        Parceirize
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.6 }}
        className="text-white-50"
      >
        Seu clube de descontos
      </motion.p>

      {/* Barra de Loading */}
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: "200px" }}
        transition={{ 
          delay: 0.8, 
          duration: (duration - 1000) / 1000,
          ease: "easeInOut" 
        }}
        className="mt-4 bg-white rounded-pill"
        style={{ height: "4px" }}
      />

      {/* Partículas flutuantes */}
      <div className="position-absolute w-100 h-100" style={{ overflow: "hidden" }}>
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ 
              opacity: 0,
              x: Math.random() * window.innerWidth,
              y: window.innerHeight + 50
            }}
            animate={{
              opacity: [0, 1, 0],
              y: -50,
              x: Math.random() * window.innerWidth
            }}
            transition={{
              duration: 4,
              delay: i * 0.5,
              repeat: Infinity,
              ease: "linear"
            }}
            className="position-absolute"
            style={{ fontSize: "1.5rem" }}
          >
            ✨
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default SplashScreen;
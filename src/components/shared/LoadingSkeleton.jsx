"use client";

import { motion } from "framer-motion";

const LoadingSkeleton = ({ 
  width = "100%", 
  height = "1rem", 
  className = "",
  variant = "text" 
}) => {
  const skeletonVariants = {
    text: { borderRadius: "4px" },
    circular: { borderRadius: "50%" },
    rectangular: { borderRadius: "8px" }
  };

  return (
    <motion.div
      className={`bg-light ${className}`}
      style={{
        width,
        height,
        ...skeletonVariants[variant]
      }}
      animate={{
        opacity: [0.5, 1, 0.5],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    />
  );
};

// Skeleton específico para cards de produto
export const ProductCardSkeleton = () => (
  <div className="card h-100">
    <LoadingSkeleton height="200px" variant="rectangular" className="card-img-top" />
    <div className="card-body">
      <LoadingSkeleton height="1.5rem" className="mb-2" />
      <LoadingSkeleton height="1rem" width="70%" className="mb-2" />
      <LoadingSkeleton height="1rem" width="50%" className="mb-3" />
      <div className="d-flex justify-content-between align-items-center">
        <LoadingSkeleton height="1.25rem" width="80px" />
        <LoadingSkeleton height="38px" width="120px" variant="rectangular" />
      </div>
    </div>
  </div>
);

// Skeleton para lista de lojas
export const StoreCardSkeleton = () => (
  <div className="card h-100">
    <LoadingSkeleton height="150px" variant="rectangular" className="card-img-top" />
    <div className="card-body d-flex flex-column">
      <div className="flex-grow-1">
        <LoadingSkeleton height="1.5rem" className="mb-2" />
        <LoadingSkeleton height="1rem" width="60%" className="mb-2" />
        <LoadingSkeleton height="1rem" width="80%" className="mb-2" />
        <LoadingSkeleton height="1rem" width="40%" />
      </div>
    </div>
    <div className="card-footer text-center">
      <LoadingSkeleton height="32px" width="120px" variant="rectangular" />
    </div>
  </div>
);

export default LoadingSkeleton;
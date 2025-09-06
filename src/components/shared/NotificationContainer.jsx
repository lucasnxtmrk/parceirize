"use client";

import { Alert } from "react-bootstrap";
import { motion, AnimatePresence } from "framer-motion";

const NotificationContainer = ({ alerts, onDismiss }) => {
  if (!alerts || alerts.length === 0) return null;

  return (
    <div 
      className="position-fixed top-0 end-0 p-3" 
      style={{ zIndex: 1060, maxWidth: "400px" }}
    >
      <AnimatePresence>
        {alerts.map((alert) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <Alert
              variant={alert.variant}
              dismissible
              onClose={() => onDismiss(alert.id)}
              className="mb-2 shadow-sm"
            >
              <div className="d-flex align-items-center">
                <div className="flex-grow-1">
                  {alert.message}
                </div>
              </div>
            </Alert>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default NotificationContainer;
"use client";

import { useState, useCallback } from "react";

export const useNotifications = () => {
  const [alerts, setAlerts] = useState([]);

  const showAlert = useCallback((message, variant = 'info', duration = 3000) => {
    const id = Date.now() + Math.random();
    const alert = { id, message, variant, show: true };
    
    setAlerts(prev => [...prev, alert]);

    // Auto-dismiss após duração especificada
    setTimeout(() => {
      hideAlert(id);
    }, duration);

    return id;
  }, []);

  const hideAlert = useCallback((id) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  }, []);

  const showSuccess = useCallback((message, duration) => 
    showAlert(message, 'success', duration), [showAlert]);

  const showError = useCallback((message, duration) => 
    showAlert(message, 'danger', duration), [showAlert]);

  const showWarning = useCallback((message, duration) => 
    showAlert(message, 'warning', duration), [showAlert]);

  const showInfo = useCallback((message, duration) => 
    showAlert(message, 'info', duration), [showAlert]);

  const clearAll = useCallback(() => setAlerts([]), []);

  return {
    alerts,
    showAlert,
    hideAlert,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    clearAll
  };
};
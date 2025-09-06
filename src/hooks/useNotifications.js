"use client";

import { useState, useCallback, createContext, useContext } from "react";
import { toast } from 'react-toastify';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context) {
    return context;
  }

  // Fallback for when not using provider
  const [alerts, setAlerts] = useState([]);

  const showAlert = useCallback((message, variant = 'info', duration = 3000) => {
    const id = Date.now() + Math.random();
    const alert = { id, message, variant, show: true };
    
    setAlerts(prev => [...prev, alert]);

    // Show toast notification
    const toastOptions = {
      position: "top-right",
      autoClose: duration,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    };

    switch (variant) {
      case 'success':
        toast.success(message, toastOptions);
        break;
      case 'danger':
      case 'error':
        toast.error(message, toastOptions);
        break;
      case 'warning':
        toast.warning(message, toastOptions);
        break;
      case 'info':
        toast.info(message, toastOptions);
        break;
      default:
        toast(message, toastOptions);
    }

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

  // Enhanced notifications for specific actions
  const notifyCartUpdate = useCallback((product, action) => {
    const messages = {
      add: `${product.nome || product.name} foi adicionado ao carrinho`,
      remove: `${product.nome || product.name} foi removido do carrinho`,
      update: `Quantidade de ${product.nome || product.name} foi atualizada`
    };

    showSuccess(messages[action] || 'Carrinho foi atualizado', 3000);
  }, [showSuccess]);

  const notifyOrderStatus = useCallback((order, status) => {
    const messages = {
      confirmed: 'Pedido confirmado com sucesso',
      processing: 'Seu pedido está sendo processado',
      shipped: 'Seu pedido foi enviado',
      delivered: 'Seu pedido foi entregue',
      cancelled: 'Seu pedido foi cancelado'
    };

    const types = {
      confirmed: 'success',
      processing: 'info',
      shipped: 'info',
      delivered: 'success',
      cancelled: 'warning'
    };

    showAlert(messages[status] || 'Status do pedido foi atualizado', types[status] || 'info', 5000);
  }, [showAlert]);

  const notifyVoucherUsed = useCallback((voucher, partner) => {
    showSuccess(`Voucher de ${partner?.nome || 'parceiro'} foi usado com sucesso!`, 4000);
  }, [showSuccess]);

  return {
    alerts,
    showAlert,
    hideAlert,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    clearAll,
    notifyCartUpdate,
    notifyOrderStatus,
    notifyVoucherUsed
  };
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback((notification) => {
    const id = Date.now() + Math.random();
    const newNotification = {
      id,
      timestamp: Date.now(),
      ...notification
    };

    setNotifications(prev => [newNotification, ...prev.slice(0, 49)]);

    setTimeout(() => {
      removeNotification(id);
    }, notification.timeout || 10000);

    return id;
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const value = {
    notifications,
    addNotification,
    removeNotification,
    clearNotifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
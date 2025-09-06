"use client";

import { useState, useCallback } from "react";

export const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const request = useCallback(async (url, options = {}) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (err) {
      const errorMessage = err.message || "Erro na requisição";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const get = useCallback((url) => request(url), [request]);
  
  const post = useCallback((url, data) => 
    request(url, { 
      method: 'POST', 
      body: JSON.stringify(data) 
    }), [request]);
  
  const put = useCallback((url, data) => 
    request(url, { 
      method: 'PUT', 
      body: JSON.stringify(data) 
    }), [request]);
  
  const del = useCallback((url) => 
    request(url, { method: 'DELETE' }), [request]);

  const clearError = useCallback(() => setError(null), []);

  return {
    loading,
    error,
    request,
    get,
    post,
    put,
    delete: del,
    clearError
  };
};
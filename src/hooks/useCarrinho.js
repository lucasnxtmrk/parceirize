"use client";

import { useState, useCallback } from "react";

export const useCarrinho = () => {
  const [carrinho, setCarrinho] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchCarrinho = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/carrinho");
      if (response.ok) {
        const data = await response.json();
        setCarrinho(data.itens || []);
        return data;
      }
      throw new Error("Falha ao carregar carrinho");
    } catch (error) {
      console.error("Erro ao carregar carrinho:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const adicionarItem = useCallback(async (produto) => {
    try {
      setLoading(true);
      const response = await fetch("/api/carrinho", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ produto_id: produto.id, quantidade: 1 })
      });

      if (response.ok) {
        await fetchCarrinho();
        return { success: true, message: `${produto.nome} adicionado ao carrinho!` };
      }
      
      const errorData = await response.json();
      throw new Error(errorData.error || "Erro ao adicionar ao carrinho");
    } catch (error) {
      return { success: false, message: error.message };
    } finally {
      setLoading(false);
    }
  }, [fetchCarrinho]);

  const atualizarQuantidade = useCallback(async (produtoId, novaQuantidade) => {
    if (novaQuantidade < 1) {
      return removerItem(produtoId);
    }

    try {
      setLoading(true);
      const response = await fetch("/api/carrinho", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ produto_id: produtoId, quantidade: novaQuantidade })
      });

      if (response.ok) {
        await fetchCarrinho();
        return { success: true };
      }
      
      throw new Error("Erro ao atualizar quantidade");
    } catch (error) {
      return { success: false, message: error.message };
    } finally {
      setLoading(false);
    }
  }, [fetchCarrinho]);

  const removerItem = useCallback(async (produtoId) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/carrinho?produto_id=${produtoId}`, {
        method: "DELETE"
      });

      if (response.ok) {
        await fetchCarrinho();
        return { success: true, message: "Item removido do carrinho" };
      }
      
      throw new Error("Erro ao remover item");
    } catch (error) {
      return { success: false, message: error.message };
    } finally {
      setLoading(false);
    }
  }, [fetchCarrinho]);

  const finalizarPedido = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });

      if (response.ok) {
        const data = await response.json();
        await fetchCarrinho(); // Limpar carrinho após pedido
        return { 
          success: true, 
          message: "Pedido finalizado com sucesso!",
          pedido: data.pedido 
        };
      }
      
      const errorData = await response.json();
      throw new Error(errorData.error || "Erro ao finalizar pedido");
    } catch (error) {
      return { success: false, message: error.message };
    } finally {
      setLoading(false);
    }
  }, [fetchCarrinho]);

  const getQuantidadeItem = useCallback((produtoId) => {
    const item = carrinho.find(item => item.produto_id === produtoId);
    return item ? item.quantidade : 0;
  }, [carrinho]);

  const totalItens = carrinho.reduce((total, item) => total + item.quantidade, 0);
  const totalPreco = carrinho.reduce((total, item) => total + item.subtotal, 0);

  return {
    carrinho,
    loading,
    totalItens,
    totalPreco,
    fetchCarrinho,
    adicionarItem,
    atualizarQuantidade,
    removerItem,
    finalizarPedido,
    getQuantidadeItem
  };
};
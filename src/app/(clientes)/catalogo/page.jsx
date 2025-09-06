"use client";

import { useState, useEffect, useCallback } from "react";
import { Row, Col, Card, Button, Badge, Alert, Form, Spinner, CardTitle } from "react-bootstrap";
import { FaShoppingCart, FaFilter } from "react-icons/fa";
import ComponentContainerCard from "@/components/ComponentContainerCard";
import ProductCard from "@/components/shared/ProductCard";

export default function ProdutosPage() {
  const [produtos, setProdutos] = useState([]);
  const [carrinho, setCarrinho] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroNicho, setFiltroNicho] = useState("");
  const [nichos, setNichos] = useState([]);
  const [alert, setAlert] = useState({ show: false, message: "", variant: "" });

  const fetchProdutosCallback = useCallback(async (nicho = "") => {
    try {
      const url = nicho ? `/api/produtos?nicho=${nicho}` : "/api/produtos";
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setProdutos(data);
      } else {
        showAlert("Erro ao carregar produtos", "danger");
      }
    } catch (error) {
      showAlert("Erro ao carregar produtos", "danger");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProdutosCallback();
    fetchCarrinho();
    fetchNichos();
  }, [fetchProdutosCallback]);

  const fetchProdutos = async (nicho = "") => {
    try {
      const url = nicho ? `/api/produtos?nicho=${nicho}` : "/api/produtos";
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setProdutos(data);
      } else {
        showAlert("Erro ao carregar produtos", "danger");
      }
    } catch (error) {
      showAlert("Erro ao carregar produtos", "danger");
    } finally {
      setLoading(false);
    }
  };

  const fetchCarrinho = async () => {
    try {
      const response = await fetch("/api/carrinho");
      if (response.ok) {
        const data = await response.json();
        setCarrinho(data.itens || []);
      }
    } catch (error) {
      console.error("Erro ao carregar carrinho:", error);
    }
  };

  const fetchNichos = async () => {
    try {
      const response = await fetch("/api/nichos");
      if (response.ok) {
        const data = await response.json();
        setNichos(data);
      }
    } catch (error) {
      console.error("Erro ao carregar nichos:", error);
    }
  };

  const showAlert = (message, variant) => {
    setAlert({ show: true, message, variant });
    setTimeout(() => setAlert({ show: false, message: "", variant: "" }), 3000);
  };

  const adicionarAoCarrinho = async (produto) => {
    try {
      const response = await fetch("/api/carrinho", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ produto_id: produto.id, quantidade: 1 })
      });

      if (response.ok) {
        showAlert(`${produto.nome} adicionado ao carrinho!`, "success");
        fetchCarrinho();
      } else {
        const errorData = await response.json();
        showAlert(errorData.error || "Erro ao adicionar ao carrinho", "danger");
      }
    } catch (error) {
      showAlert("Erro ao adicionar ao carrinho", "danger");
    }
  };

  const atualizarQuantidade = async (produtoId, novaQuantidade) => {
    if (novaQuantidade < 1) {
      removerDoCarrinho(produtoId);
      return;
    }

    try {
      const response = await fetch("/api/carrinho", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ produto_id: produtoId, quantidade: novaQuantidade })
      });

      if (response.ok) {
        fetchCarrinho();
      } else {
        showAlert("Erro ao atualizar quantidade", "danger");
      }
    } catch (error) {
      showAlert("Erro ao atualizar quantidade", "danger");
    }
  };

  const removerDoCarrinho = async (produtoId) => {
    try {
      const response = await fetch(`/api/carrinho?produto_id=${produtoId}`, {
        method: "DELETE"
      });

      if (response.ok) {
        showAlert("Item removido do carrinho", "success");
        fetchCarrinho();
      } else {
        showAlert("Erro ao remover item", "danger");
      }
    } catch (error) {
      showAlert("Erro ao remover item", "danger");
    }
  };

  const handleFiltroChange = (nicho) => {
    setFiltroNicho(nicho);
    setLoading(true);
    fetchProdutosCallback(nicho);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const getQuantidadeNoCarrinho = (produtoId) => {
    const item = carrinho.find(item => item.produto_id === produtoId);
    return item ? item.quantidade : 0;
  };

  const totalItensCarrinho = carrinho.reduce((total, item) => total + item.quantidade, 0);

  if (loading) {
    return (
      <ComponentContainerCard id="catalogo-loading">
        <div className="d-flex justify-content-center align-items-center" style={{ height: "50vh" }}>
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Carregando...</span>
          </Spinner>
        </div>
      </ComponentContainerCard>
    );
  }

  return (
    <ComponentContainerCard id="catalogo-produtos">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <CardTitle as="h4" className="mb-0">Produtos Disponíveis</CardTitle>
        <Badge bg="primary" className="fs-6">
          <FaShoppingCart className="me-2" />
          {totalItensCarrinho} {totalItensCarrinho === 1 ? 'item' : 'itens'}
        </Badge>
      </div>

      {alert.show && (
        <Alert variant={alert.variant} className="mb-4">
          {alert.message}
        </Alert>
      )}

      {/* Filtros */}
      <Row className="mb-4">
        <Col>
          <Card className="bg-light">
            <Card.Body className="py-3">
              <div className="d-flex align-items-center gap-3">
                <FaFilter className="text-muted" />
                <Form.Label className="mb-0 me-2">Filtrar por categoria:</Form.Label>
                <Form.Select 
                  value={filtroNicho} 
                  onChange={(e) => handleFiltroChange(e.target.value)}
                  style={{ width: "200px" }}
                >
                  <option value="">Todas as categorias</option>
                  {nichos.map((nicho) => (
                    <option key={nicho.nicho} value={nicho.nicho}>
                      {nicho.nicho} ({nicho.count})
                    </option>
                  ))}
                </Form.Select>
                {filtroNicho && (
                  <Button variant="outline-secondary" size="sm" onClick={() => handleFiltroChange("")}>
                    Limpar filtro
                  </Button>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {produtos.length === 0 ? (
        <Row>
          <Col>
            <Card className="text-center py-5">
              <Card.Body>
                <h4 className="text-muted">Nenhum produto encontrado</h4>
                <p className="text-muted">Não há produtos disponíveis no momento.</p>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      ) : (
        <Row>
          {produtos.map((produto, index) => (
            <ProductCard
              key={produto.id}
              produto={produto}
              quantidadeNoCarrinho={getQuantidadeNoCarrinho(produto.id)}
              onAdicionarAoCarrinho={adicionarAoCarrinho}
              onAtualizarQuantidade={atualizarQuantidade}
              onRemoverDoCarrinho={removerDoCarrinho}
              showParceiro={true}
              index={index}
            />
          ))}
        </Row>
      )}
    </ComponentContainerCard>
  );
}
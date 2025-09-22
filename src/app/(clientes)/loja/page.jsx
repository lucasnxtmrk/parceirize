"use client";

import { useState, useEffect } from "react";
import ComponentContainerCard from "@/components/ComponentContainerCard";
import { Container, Row, Col, Card, Button, Badge, Alert, Form, Spinner, CardTitle, Modal } from "react-bootstrap";
import { FaShoppingCart, FaPlus, FaMinus, FaFilter, FaExclamationTriangle, FaTrash } from "react-icons/fa";
import { Nichos } from "@/data/nichos";

export default function ProdutosPage() {
  const [produtos, setProdutos] = useState([]);
  const [carrinho, setCarrinho] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroNicho, setFiltroNicho] = useState("");
  const [nichos, setNichos] = useState([]);
  const [alert, setAlert] = useState({ show: false, message: "", variant: "" });

  // Estados para modal de confirmação de parceiro diferente
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [produtoConflito, setProdutoConflito] = useState(null);
  const [parceiroAtual, setParceiroAtual] = useState("");

  useEffect(() => {
    fetchProdutos();
    fetchCarrinho();
    fetchNichos();
  }, []);

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

        // Tratar erro específico de parceiro diferente
        if (errorData.error === "PARCEIRO_DIFERENTE") {
          setProdutoConflito(produto);
          setParceiroAtual(errorData.parceiro_atual);
          setShowConflictModal(true);
          return;
        }

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
    fetchProdutos(nicho);
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

  const limparCarrinhoEAdicionar = async () => {
    try {
      // Primeiro limpar o carrinho
      const clearResponse = await fetch("/api/carrinho?limpar_tudo=true", {
        method: "DELETE"
      });

      if (clearResponse.ok) {
        // Depois adicionar o novo produto
        await adicionarAoCarrinho(produtoConflito);
      } else {
        showAlert("Erro ao limpar carrinho", "danger");
      }
    } catch (error) {
      showAlert("Erro ao limpar carrinho", "danger");
    } finally {
      setShowConflictModal(false);
      setProdutoConflito(null);
      setParceiroAtual("");
    }
  };

  const totalItensCarrinho = carrinho.reduce((total, item) => total + item.quantidade, 0);

  return (
    <ComponentContainerCard id="loja-produtos">
      {/* Cabeçalho: Título + Badge do carrinho */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <CardTitle as="h4" className="mb-0">Produtos Disponíveis</CardTitle>
        <Badge bg="primary" className="fs-6">
          <FaShoppingCart className="me-2" />
          {totalItensCarrinho} {totalItensCarrinho === 1 ? 'item' : 'itens'}
        </Badge>
      </div>

      {loading ? (
        <div className="d-flex justify-content-center align-items-center" style={{ height: "50vh" }}>
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Carregando...</span>
          </Spinner>
        </div>
      ) : (
        <>
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
              {produtos.map((produto) => {
                const quantidadeNoCarrinho = getQuantidadeNoCarrinho(produto.id);
                
                return (
                  <Col md={6} lg={4} key={produto.id} className="mb-4">
                    <Card className="h-100 shadow-sm">
                      {produto.imagem_url && (
                        <Card.Img 
                          variant="top" 
                          src={produto.imagem_url} 
                          style={{ height: "200px", objectFit: "cover" }}
                        />
                      )}
                      <Card.Body className="d-flex flex-column">
                        <div className="mb-2">
                          <Badge bg="secondary" className="mb-2">
                            {Nichos.find(n => n.id === Number(produto.parceiro_nicho))?.nome || "Categoria"}
                          </Badge>
                          <h5 className="card-title">{produto.nome}</h5>
                          <p className="text-muted small mb-2">
                            <strong>{produto.parceiro_nome}</strong>
                          </p>
                        </div>
                        
                        {produto.descricao && (
                          <p className="card-text text-muted small flex-grow-1">
                            {produto.descricao}
                          </p>
                        )}
                        
                        <div className="mt-auto">
                          <div className="d-flex justify-content-between align-items-center mb-3">
                            <span className="h5 mb-0 text-primary fw-bold">
                              {formatPrice(produto.preco)}
                            </span>
                          </div>
                          
                          {quantidadeNoCarrinho > 0 ? (
                            <div className="d-flex align-items-center justify-content-between">
                              <div className="d-flex align-items-center gap-2">
                                <Button 
                                  variant="outline-danger" 
                                  size="sm"
                                  onClick={() => atualizarQuantidade(produto.id, quantidadeNoCarrinho - 1)}
                                >
                                  <FaMinus />
                                </Button>
                                <span className="fw-bold mx-2">{quantidadeNoCarrinho}</span>
                                <Button 
                                  variant="outline-success" 
                                  size="sm"
                                  onClick={() => atualizarQuantidade(produto.id, quantidadeNoCarrinho + 1)}
                                >
                                  <FaPlus />
                                </Button>
                              </div>
                              <Button 
                                variant="outline-danger" 
                                size="sm"
                                onClick={() => removerDoCarrinho(produto.id)}
                              >
                                Remover
                              </Button>
                            </div>
                          ) : (
                            <Button 
                              variant="primary" 
                              className="w-100"
                              onClick={() => adicionarAoCarrinho(produto)}
                            >
                              <FaShoppingCart className="me-2" />
                              Adicionar ao Carrinho
                            </Button>
                          )}
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          )}
        </>
      )}

      {/* Modal de Confirmação - Parceiro Diferente */}
      <Modal show={showConflictModal} onHide={() => setShowConflictModal(false)} centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="d-flex align-items-center gap-2">
            <FaExclamationTriangle className="text-warning" />
            Produtos de Parceiros Diferentes
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-2">
          <div className="text-center mb-3">
            <p className="mb-3">
              Seu carrinho já contém produtos de <strong>{parceiroAtual}</strong>.
            </p>
            <p className="mb-3">
              Para adicionar <strong>{produtoConflito?.nome}</strong> ao carrinho, você precisa limpar os produtos atuais primeiro.
            </p>
            <div className="alert alert-info">
              <small>
                <FaShoppingCart className="me-2" />
                Isso garante que todos os produtos sejam validados pelo mesmo parceiro.
              </small>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <Button variant="secondary" onClick={() => setShowConflictModal(false)}>
            Cancelar
          </Button>
          <Button
            variant="warning"
            onClick={limparCarrinhoEAdicionar}
            className="d-flex align-items-center gap-2"
          >
            <FaTrash />
            Limpar e Adicionar
          </Button>
        </Modal.Footer>
      </Modal>
    </ComponentContainerCard>
  );
}
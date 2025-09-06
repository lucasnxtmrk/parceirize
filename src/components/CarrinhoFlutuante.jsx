"use client";

import { useState, useEffect } from "react";
import { Offcanvas, Button, ListGroup, Badge, Alert, Row, Col } from "react-bootstrap";
import { FaShoppingCart, FaPlus, FaMinus, FaTrash, FaQrcode } from "react-icons/fa";
import { useRouter } from "next/navigation";

export default function CarrinhoFlutuante() {
  const [show, setShow] = useState(false);
  const [carrinho, setCarrinho] = useState({ itens: [], total: 0, total_original: 0, economia_total: 0 });
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: "", variant: "" });
  const router = useRouter();

  useEffect(() => {
    fetchCarrinho();
    // Atualizar carrinho a cada 30 segundos se estiver aberto
    const interval = setInterval(() => {
      if (show) {
        fetchCarrinho();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [show]);

  const fetchCarrinho = async () => {
    try {
      const response = await fetch("/api/carrinho");
      if (response.ok) {
        const data = await response.json();
        setCarrinho(data);
      }
    } catch (error) {
      console.error("Erro ao carregar carrinho:", error);
    }
  };

  const showAlert = (message, variant) => {
    setAlert({ show: true, message, variant });
    setTimeout(() => setAlert({ show: false, message: "", variant: "" }), 3000);
  };

  const atualizarQuantidade = async (produtoId, novaQuantidade) => {
    if (novaQuantidade < 1) {
      removerItem(produtoId);
      return;
    }

    try {
      setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  const removerItem = async (produtoId) => {
    try {
      setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  const finalizarPedido = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });

      if (response.ok) {
        const data = await response.json();
        showAlert("Pedido finalizado! Redirecionando para o QR Code...", "success");
        
        setTimeout(() => {
          setShow(false);
          router.push(`/pedidos/${data.pedido.id}`);
        }, 2000);
      } else {
        const errorData = await response.json();
        showAlert(errorData.error || "Erro ao finalizar pedido", "danger");
      }
    } catch (error) {
      showAlert("Erro ao finalizar pedido", "danger");
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const totalItens = carrinho.itens?.reduce((total, item) => total + item.quantidade, 0) || 0;

  return (
    <>
      {/* Botão Flutuante */}
      <div 
        className="position-fixed"
        style={{
          bottom: "20px",
          right: "20px",
          zIndex: 1050
        }}
      >
        <Button 
          variant="primary" 
          className="rounded-circle shadow-lg position-relative"
          style={{ width: "60px", height: "60px" }}
          onClick={() => setShow(true)}
        >
          <FaShoppingCart size={20} />
          {totalItens > 0 && (
            <Badge 
              bg="danger" 
              className="position-absolute top-0 start-100 translate-middle rounded-pill"
              style={{ fontSize: "0.7em" }}
            >
              {totalItens}
            </Badge>
          )}
        </Button>
      </div>

      {/* Offcanvas do Carrinho */}
      <Offcanvas show={show} onHide={() => setShow(false)} placement="end" style={{ width: "400px" }}>
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>
            <FaShoppingCart className="me-2" />
            Meu Carrinho ({totalItens})
          </Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          {alert.show && (
            <Alert variant={alert.variant} className="mb-3">
              {alert.message}
            </Alert>
          )}

          {!carrinho.itens || carrinho.itens.length === 0 ? (
            <div className="text-center py-5">
              <FaShoppingCart size={48} className="text-muted mb-3" />
              <p className="text-muted">Seu carrinho está vazio</p>
              <Button variant="outline-primary" onClick={() => setShow(false)}>
                Continuar Comprando
              </Button>
            </div>
          ) : (
            <>
              {/* Lista de Itens */}
              <ListGroup variant="flush" className="mb-3">
                {carrinho.itens.map((item) => (
                  <ListGroup.Item key={item.produto_id} className="px-0">
                    <div className="d-flex align-items-start">
                      {item.produto_imagem && (
                        <img
                          src={item.produto_imagem}
                          alt={item.produto_nome}
                          className="me-3 rounded"
                          style={{ width: "50px", height: "50px", objectFit: "cover" }}
                        />
                      )}
                      <div className="flex-grow-1">
                        <h6 className="mb-1">{item.produto_nome}</h6>
                        <small className="text-muted">{item.parceiro_nome}</small>
                        {item.desconto > 0 && (
                          <div className="small text-success">
                            <span className="badge bg-success me-1">{item.desconto}% OFF</span>
                            Economize {formatPrice(item.economia)}
                          </div>
                        )}
                        <div className="d-flex justify-content-between align-items-center mt-2">
                          <div className="d-flex align-items-center gap-1">
                            <Button
                              variant="outline-secondary"
                              size="sm"
                              style={{ width: "24px", height: "24px", padding: 0 }}
                              onClick={() => atualizarQuantidade(item.produto_id, item.quantidade - 1)}
                              disabled={loading}
                            >
                              <FaMinus size={10} />
                            </Button>
                            <span className="mx-2 fw-bold" style={{ minWidth: "20px", textAlign: "center" }}>
                              {item.quantidade}
                            </span>
                            <Button
                              variant="outline-secondary"
                              size="sm"
                              style={{ width: "24px", height: "24px", padding: 0 }}
                              onClick={() => atualizarQuantidade(item.produto_id, item.quantidade + 1)}
                              disabled={loading}
                            >
                              <FaPlus size={10} />
                            </Button>
                          </div>
                          <div className="text-end">
                            <div className="fw-bold text-primary">
                              {formatPrice(item.subtotal)}
                            </div>
                            <Button
                              variant="link"
                              size="sm"
                              className="text-danger p-0"
                              onClick={() => removerItem(item.produto_id)}
                              disabled={loading}
                            >
                              <FaTrash size={12} />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </ListGroup.Item>
                ))}
              </ListGroup>

              {/* Total */}
              <div className="border-top pt-3 mb-3">
                {carrinho.economia_total > 0 && (
                  <>
                    <Row className="small text-muted">
                      <Col>Subtotal:</Col>
                      <Col className="text-end text-decoration-line-through">
                        {formatPrice(carrinho.total_original)}
                      </Col>
                    </Row>
                    <Row className="small text-success">
                      <Col>Economia:</Col>
                      <Col className="text-end">
                        -{formatPrice(carrinho.economia_total)}
                      </Col>
                    </Row>
                    <hr className="my-2" />
                  </>
                )}
                <Row>
                  <Col>
                    <strong>Total:</strong>
                  </Col>
                  <Col className="text-end">
                    <strong className="h5 text-primary">
                      {formatPrice(carrinho.total)}
                    </strong>
                    {carrinho.economia_total > 0 && (
                      <div className="small text-success">
                        Você economiza {formatPrice(carrinho.economia_total)}!
                      </div>
                    )}
                  </Col>
                </Row>
              </div>

              {/* Ações */}
              <div className="d-grid gap-2">
                <Button 
                  variant="success" 
                  size="lg"
                  onClick={finalizarPedido}
                  disabled={loading || totalItens === 0}
                >
                  <FaQrcode className="me-2" />
                  {loading ? "Finalizando..." : "Finalizar Pedido"}
                </Button>
                <Button 
                  variant="outline-secondary"
                  onClick={() => setShow(false)}
                >
                  Continuar Comprando
                </Button>
              </div>
            </>
          )}
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
}
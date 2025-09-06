"use client";

import { useState, useEffect } from "react";
import { Offcanvas, Button, ListGroup, Badge, Alert, Row, Col, Modal, Image } from "react-bootstrap";
import { FaShoppingCart, FaPlus, FaMinus, FaTrash, FaQrcode, FaEye } from "react-icons/fa";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useCarrinho } from "../hooks/useCarrinho";
import { useNotifications } from "../hooks/useNotifications";
import { NotificationBadge, LoadingSkeleton, Card } from "./ui";

export default function CarrinhoFlutuante() {
  const [show, setShow] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const router = useRouter();
  
  const { 
    carrinho: carrinhoItems, 
    loading, 
    totalItens, 
    totalPreco, 
    qrCode,
    fetchCarrinho,
    atualizarQuantidade,
    removerItem,
    finalizarPedido
  } = useCarrinho();
  
  const notifications = useNotifications();

  // Adaptar estrutura do carrinho
  const carrinho = {
    itens: carrinhoItems,
    total: totalPreco,
    total_original: totalPreco, // TODO: calcular valor original com desconto
    economia_total: 0 // TODO: calcular economia total
  };

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

  const handleFinalizarPedido = async () => {
    const result = await finalizarPedido();
    if (result.success) {
      setTimeout(() => {
        setShow(false);
        if (result.pedido?.id) {
          router.push(`/pedidos/${result.pedido.id}`);
        }
      }, 2000);
    }
  };

  const handleShowQrCode = () => {
    if (qrCode) {
      setShowQrModal(true);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

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
        <NotificationBadge count={totalItens} variant="danger" position="top-end">
          <Button 
            variant="primary" 
            className="rounded-circle"
            style={{ width: "60px", height: "60px" }}
            onClick={() => setShow(true)}
          >
            <FaShoppingCart size={20} />
          </Button>
        </NotificationBadge>
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
                {qrCode && (
                  <Button 
                    variant="outline-primary" 
                    size="sm"
                    onClick={handleShowQrCode}
                    className="mb-2"
                  >
                    <FaEye className="me-2" />
                    Ver QR Code do Carrinho
                  </Button>
                )}
                <Button 
                  variant="success" 
                  size="lg"
                  onClick={handleFinalizarPedido}
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

      {/* Modal do QR Code */}
      <Modal 
        show={showQrModal} 
        onHide={() => setShowQrModal(false)}
        centered
        size="sm"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <FaQrcode className="me-2" />
            QR Code do Carrinho
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          {qrCode ? (
            <>
              <Image 
                src={qrCode} 
                alt="QR Code do Carrinho"
                fluid 
                className="mb-3"
                style={{ maxWidth: "250px" }}
              />
              <p className="text-muted small">
                Escaneie este QR Code para visualizar ou compartilhar seu carrinho
              </p>
              <div className="small text-primary">
                <strong>Total: {formatPrice(totalPreco)}</strong>
                <br />
                {totalItens} {totalItens === 1 ? 'item' : 'itens'}
              </div>
            </>
          ) : (
            <LoadingSkeleton variant="card" height="250px" />
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowQrModal(false)}>
            Fechar
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
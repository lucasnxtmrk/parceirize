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
      <Offcanvas show={show} onHide={() => setShow(false)} placement="end" style={{ width: "450px" }}>
        <Offcanvas.Header closeButton className="border-0 pb-0">
          <Offcanvas.Title className="d-flex align-items-center">
            <div className="bg-primary bg-opacity-10 rounded-circle p-2 me-3">
              <FaShoppingCart className="text-white" size={20} />
            </div>
            <div>
              <h5 className="mb-0">Meu Carrinho</h5>
              <small style={{ color: "#64748b" }}>{totalItens} {totalItens === 1 ? 'item' : 'itens'}</small>
            </div>
          </Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="px-3">
          {!carrinho.itens || carrinho.itens.length === 0 ? (
            <div className="text-center py-5">
              <div className="bg-light bg-opacity-50 rounded-circle p-4 d-inline-flex mb-4">
                <FaShoppingCart size={48} style={{ color: "#94a3b8" }} />
              </div>
              <h5 className="mb-3" style={{ color: "#475569" }}>Seu carrinho está vazio</h5>
              <p className="mb-4" style={{ color: "#64748b" }}>Adicione produtos aos seus favoritos e eles aparecerão aqui!</p>
              <Button
                variant="primary"
                className="px-4 py-2"
                onClick={() => setShow(false)}
              >
                Descobrir Produtos
              </Button>
            </div>
          ) : (
            <>
              {/* Lista de Itens */}
              <div className="mb-4" style={{ maxHeight: "400px", overflowY: "auto" }}>
                {carrinho.itens.map((item, index) => (
                  <motion.div
                    key={item.produto_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -300 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="mb-3 border-0 bg-light">
                      <Card.Body className="p-3">
                        <div className="d-flex align-items-start">
                          {item.produto_imagem ? (
                            <div className="position-relative me-3">
                              <img
                                src={item.produto_imagem}
                                alt={item.produto_nome}
                                className="rounded-3"
                                style={{ width: "60px", height: "60px", objectFit: "cover" }}
                              />
                              {item.desconto > 0 && (
                                <Badge
                                  bg="success"
                                  className="position-absolute top-0 start-100 translate-middle"
                                  style={{ fontSize: "0.65rem" }}
                                >
                                  -{item.desconto}%
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <div className="bg-secondary bg-opacity-25 rounded-3 d-flex align-items-center justify-content-center me-3" style={{ width: "60px", height: "60px" }}>
                              <FaShoppingCart className="text-primary" size={20} />
                            </div>
                          )}

                          <div className="flex-grow-1">
                            <div className="d-flex justify-content-between align-items-start mb-2">
                              <div>
                                <h6 className="mb-1 fw-bold">{item.produto_nome}</h6>
                                <small className="d-flex align-items-center">
                                  <span className="badge text-white me-1" style={{
                                    fontSize: "0.6rem",
                                    backgroundColor: "#1B1236" // Primary dark com bom contraste
                                  }}>
                                    {item.parceiro_nome}
                                  </span>
                                </small>
                              </div>
                              <Button
                                variant="link"
                                size="sm"
                                className="p-1"
                                style={{ color: "#ef4444" }} // Danger color com bom contraste
                                onClick={() => removerItem(item.produto_id)}
                                disabled={loading}
                                title="Remover item"
                              >
                                <FaTrash size={12} />
                              </Button>
                            </div>

                            {item.desconto > 0 && (
                              <div className="mb-2">
                                <small className="text-success fw-bold">
                                  💰 Economia de {formatPrice(item.economia)}
                                </small>
                              </div>
                            )}

                            <div className="d-flex justify-content-between align-items-center">
                              <div className="d-flex align-items-center bg-white rounded-2 border p-1">
                                <Button
                                  variant="link"
                                  size="sm"
                                  className="p-1"
                                  style={{
                                    width: "32px",
                                    height: "32px",
                                    color: "#475569" // Gray-600 com melhor contraste
                                  }}
                                  onClick={() => atualizarQuantidade(item.produto_id, item.quantidade - 1)}
                                  disabled={loading}
                                >
                                  <FaMinus size={12} />
                                </Button>
                                <span className="mx-3 fw-bold" style={{
                                  minWidth: "24px",
                                  textAlign: "center",
                                  fontSize: "14px",
                                  color: "#1e293b" // Gray-800 para melhor legibilidade
                                }}>
                                  {item.quantidade}
                                </span>
                                <Button
                                  variant="link"
                                  size="sm"
                                  className="p-1"
                                  style={{
                                    width: "32px",
                                    height: "32px",
                                    color: "#1B1236" // Primary dark
                                  }}
                                  onClick={() => atualizarQuantidade(item.produto_id, item.quantidade + 1)}
                                  disabled={loading}
                                >
                                  <FaPlus size={12} />
                                </Button>
                              </div>

                              <div className="text-end">
                                {item.desconto > 0 && (
                                  <small className="text-decoration-line-through d-block" style={{
                                    color: "#64748b" // Gray-500 com melhor legibilidade
                                  }}>
                                    {formatPrice(item.subtotal_original)}
                                  </small>
                                )}
                                <div className="fw-bold fs-6" style={{
                                  color: "#1B1236" // Primary dark para melhor contraste
                                }}>
                                  {formatPrice(item.subtotal)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card.Body>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* Total */}
              <div className="bg-white rounded-3 p-4 mb-3 shadow-sm border">
                {carrinho.economia_total > 0 && (
                  <>
                    <div className="d-flex justify-content-between mb-2">
                      <span style={{ color: "#475569" }}>Subtotal:</span>
                      <span className="text-decoration-line-through" style={{ color: "#64748b" }}>
                        {formatPrice(carrinho.total_original)}
                      </span>
                    </div>
                    <div className="d-flex justify-content-between mb-3">
                      <span className="text-success fw-bold">💰 Economia:</span>
                      <span className="text-success fw-bold">
                        -{formatPrice(carrinho.economia_total)}
                      </span>
                    </div>
                    <hr className="my-3" />
                  </>
                )}
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="mb-0" style={{ color: "#1e293b" }}>Total:</h6>
                    <small style={{ color: "#475569" }}>{totalItens} {totalItens === 1 ? 'item' : 'itens'}</small>
                  </div>
                  <div className="text-end">
                    <h4 className="mb-0 fw-bold" style={{ color: "#1B1236" }}>
                      {formatPrice(carrinho.total)}
                    </h4>
                    {carrinho.economia_total > 0 && (
                      <small className="fw-bold" style={{ color: "#22c55e" }}>
                        Economia total: {formatPrice(carrinho.economia_total)}
                      </small>
                    )}
                  </div>
                </div>
              </div>

              {/* Ações */}
              <div className="d-grid gap-2">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-100 py-3 fw-bold"
                    onClick={handleFinalizarPedido}
                    disabled={loading || totalItens === 0}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" />
                        Finalizando pedido...
                      </>
                    ) : (
                      <>
                        <FaQrcode className="me-2" />
                        Finalizar Pedido
                      </>
                    )}
                  </Button>
                </motion.div>

                <Button
                  variant="primary"
                  className="py-2 w-100"
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
              <p className="small" style={{ color: "#64748b" }}>
                Escaneie este QR Code para visualizar ou compartilhar seu carrinho
              </p>
              <div className="small" style={{ color: "#1B1236" }}>
                <strong>Total: {formatPrice(totalPreco)}</strong>
                <br />
                {totalItens} {totalItens === 1 ? 'item' : 'itens'}
              </div>
            </>
          ) : (
            <LoadingSkeleton variant="card" height="250px" />
          )}
        </Modal.Body>
        <Modal.Footer className="border-0">
          <Button
            variant="secondary"
            onClick={() => setShowQrModal(false)}
          >
            Fechar
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
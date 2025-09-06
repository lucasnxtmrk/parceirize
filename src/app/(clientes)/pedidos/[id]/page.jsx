"use client";

import { useState, useEffect } from "react";
import { Container, Row, Col, Card, Badge, Button, Table, Spinner, Alert } from "react-bootstrap";
import { FaQrcode, FaShoppingBag, FaClock, FaCheckCircle, FaArrowLeft, FaEye } from "react-icons/fa";
import { motion } from "framer-motion";
import Link from "next/link";
import { useParams } from "next/navigation";
import QRCodeModal from "@/components/shared/QRCodeModal";
import PageTransition from "@/components/shared/PageTransition";
import { formatPrice, formatDateTime } from "@/utils/formatters";

export default function PedidoDetailPage() {
  const [pedido, setPedido] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ show: false, message: "", variant: "" });
  const [showQRModal, setShowQRModal] = useState(false);
  const params = useParams();


  useEffect(() => {
    if (params.id) {
      fetchPedido();
      // Atualizar a cada 30 segundos para verificar mudanças de status
      const interval = setInterval(fetchPedido, 30000);
      return () => clearInterval(interval);
    }
  }, [params.id]);

  const fetchPedido = async () => {
    try {
      const response = await fetch(`/api/pedidos/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setPedido(data);
        
      } else {
        showAlert("Erro ao carregar pedido", "danger");
      }
    } catch (error) {
      showAlert("Erro ao carregar pedido", "danger");
    } finally {
      setLoading(false);
    }
  };


  const showAlert = (message, variant) => {
    setAlert({ show: true, message, variant });
    setTimeout(() => setAlert({ show: false, message: "", variant: "" }), 3000);
  };


  const getStatusBadge = (status) => {
    const statusConfig = {
      'pendente': { bg: 'warning', text: 'Aguardando Validação', icon: FaClock },
      'validado': { bg: 'success', text: 'Completamente Validado', icon: FaCheckCircle }
    };
    
    const config = statusConfig[status] || { bg: 'secondary', text: 'Desconhecido', icon: FaClock };
    const IconComponent = config.icon;
    
    return (
      <Badge bg={config.bg} className="d-flex align-items-center gap-1">
        <IconComponent size={12} />
        {config.text}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ height: "50vh" }}>
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Carregando...</span>
        </Spinner>
      </Container>
    );
  }

  if (!pedido) {
    return (
      <Container className="py-4">
        <Alert variant="danger">
          Pedido não encontrado.
        </Alert>
        <Link href="/pedidos">
          <Button variant="primary">
            <FaArrowLeft className="me-2" />
            Voltar aos Pedidos
          </Button>
        </Link>
      </Container>
    );
  }


  return (
    <PageTransition>
      <Container className="py-4">
        {alert.show && (
          <Alert variant={alert.variant} className="mb-4">
            {alert.message}
          </Alert>
        )}

        <Row className="mb-4">
          <Col>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <Link href="/pedidos" className="text-decoration-none">
                  <FaArrowLeft className="me-2" />
                  Voltar aos Pedidos
                </Link>
                <h2 className="mt-2">Pedido #{pedido.pedido.id}</h2>
              </div>
              {getStatusBadge(pedido.pedido.status)}
            </div>
          </Col>
        </Row>

        <Row>
          {/* QR Code */}
          <Col lg={6} className="mb-4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="text-center h-100 shadow-sm">
                <Card.Body>
                  <h5 className="mb-4">
                    <FaQrcode className="me-2 text-primary" />
                    QR Code do Pedido
                  </h5>
                  
                  {/* Preview do QR Code */}
                  <motion.div
                    className="mb-4 d-flex justify-content-center"
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <div 
                      className="border rounded p-3 bg-light cursor-pointer position-relative"
                      onClick={() => setShowQRModal(true)}
                      style={{ width: "150px", height: "150px" }}
                    >
                      <div className="d-flex align-items-center justify-content-center h-100 text-muted">
                        <div className="text-center">
                          <FaQrcode size={40} className="mb-2" />
                          <div className="small">Clique para visualizar</div>
                        </div>
                      </div>
                      <motion.div
                        className="position-absolute top-0 end-0 m-2"
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <FaEye className="text-primary" />
                      </motion.div>
                    </div>
                  </motion.div>
                  
                  <div className="mb-3">
                    <small className="text-muted d-block mb-2">Código do pedido:</small>
                    <code className="bg-light px-2 py-1 rounded user-select-all">{pedido.pedido.qr_code}</code>
                  </div>

                  <div className="d-grid gap-2">
                    <Button 
                      variant="primary" 
                      onClick={() => setShowQRModal(true)}
                      className="position-relative overflow-hidden"
                    >
                      <motion.div
                        animate={{ x: ["100%", "-100%"] }}
                        transition={{ 
                          duration: 2, 
                          repeat: Infinity, 
                          repeatType: "loop",
                          ease: "linear"
                        }}
                        className="position-absolute top-0 start-0 w-100 h-100 bg-white opacity-25"
                        style={{ transform: "skewX(-20deg)" }}
                      />
                      <FaQrcode className="me-2" />
                      Visualizar QR Code
                    </Button>
                  </div>

                  {pedido.pedido.status === 'pendente' && (
                    <Alert variant="info" className="mt-3 mb-0">
                      <small>
                        <FaClock className="me-1" />
                        Apresente este QR Code no estabelecimento para validação dos produtos.
                      </small>
                    </Alert>
                  )}

                  {pedido.pedido.status === 'validado' && (
                    <Alert variant="success" className="mt-3 mb-0">
                      <small>
                        <FaCheckCircle className="me-1" />
                        Pedido validado em {formatDateTime(pedido.pedido.validated_at)}
                      </small>
                    </Alert>
                  )}
                </Card.Body>
              </Card>
            </motion.div>
          </Col>

          {/* Detalhes do Pedido */}
          <Col lg={6} className="mb-4">
            <Card className="h-100">
              <Card.Body>
                <h5 className="mb-4">Detalhes do Pedido</h5>
                
                <Row className="mb-3">
                  <Col sm={6}>
                    <small className="text-muted">Data do Pedido:</small>
                    <div>{formatDateTime(pedido.pedido.created_at)}</div>
                  </Col>
                  <Col sm={6}>
                    <small className="text-muted">Cliente:</small>
                    <div>{pedido.pedido.cliente_nome} {pedido.pedido.cliente_sobrenome}</div>
                  </Col>
                </Row>

                <div className="mb-4">
                  <div className="d-flex justify-content-between align-items-center p-3 bg-light rounded">
                    <span className="fw-bold">Total do Pedido:</span>
                    <span className="h5 mb-0 text-primary">{formatPrice(pedido.pedido.total)}</span>
                  </div>
                </div>

                <h6 className="mb-3">Itens do Pedido ({pedido.itens.length})</h6>
                <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                  <Table size="sm" className="mb-0">
                    <thead className="table-light sticky-top">
                      <tr>
                        <th>Produto</th>
                        <th>Qtd</th>
                        <th>Preço</th>
                        <th>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pedido.itens.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <div className="d-flex align-items-center">
                              {item.produto_imagem && (
                                <img
                                  src={item.produto_imagem}
                                  alt={item.produto_nome}
                                  className="me-2 rounded"
                                  style={{ width: "30px", height: "30px", objectFit: "cover" }}
                                />
                              )}
                              <div>
                                <div className="fw-bold small">{item.produto_nome}</div>
                                <small className="text-muted">{item.parceiro_nome}</small>
                              </div>
                            </div>
                          </td>
                          <td className="align-middle">{item.quantidade}</td>
                          <td className="align-middle">{formatPrice(item.preco_unitario)}</td>
                          <td className="align-middle fw-bold text-primary">
                            {formatPrice(item.subtotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Row className="mt-4">
          <Col className="text-center">
            <Link href="/catalogo">
              <Button variant="primary" size="lg">
                <FaShoppingBag className="me-2" />
                Fazer Outro Pedido
              </Button>
            </Link>
          </Col>
        </Row>
      </Container>

      {/* Modal do QR Code */}
      <QRCodeModal
        show={showQRModal}
        onHide={() => setShowQRModal(false)}
        qrValue={pedido?.pedido?.qr_code}
        title={`QR Code - Pedido #${pedido?.pedido?.id}`}
      />
    </PageTransition>
  );
}
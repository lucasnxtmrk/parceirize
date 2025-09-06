"use client";

import { useState, useEffect } from "react";
import { Container, Row, Col, Card, Badge, Button, Table, Spinner, Alert } from "react-bootstrap";
import { FaQrcode, FaShoppingBag, FaClock, FaCheckCircle } from "react-icons/fa";
import Link from "next/link";

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ show: false, message: "", variant: "" });

  useEffect(() => {
    fetchPedidos();
  }, []);

  const fetchPedidos = async () => {
    try {
      const response = await fetch("/api/pedidos");
      if (response.ok) {
        const data = await response.json();
        setPedidos(data);
      } else {
        showAlert("Erro ao carregar pedidos", "danger");
      }
    } catch (error) {
      showAlert("Erro ao carregar pedidos", "danger");
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (message, variant) => {
    setAlert({ show: true, message, variant });
    setTimeout(() => setAlert({ show: false, message: "", variant: "" }), 3000);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'pendente': { bg: 'warning', text: 'Pendente', icon: FaClock },
      'validado': { bg: 'success', text: 'Validado', icon: FaCheckCircle }
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

  return (
    <Container className="py-4">
      {alert.show && (
        <Alert variant={alert.variant} className="mb-4">
          {alert.message}
        </Alert>
      )}

      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <h2>Meus Pedidos</h2>
            <Link href="/loja">
              <Button variant="primary">
                <FaShoppingBag className="me-2" />
                Continuar Comprando
              </Button>
            </Link>
          </div>
        </Col>
      </Row>

      {pedidos.length === 0 ? (
        <Row>
          <Col>
            <Card className="text-center py-5">
              <Card.Body>
                <FaShoppingBag size={48} className="text-muted mb-3" />
                <h4 className="text-muted">Nenhum pedido encontrado</h4>
                <p className="text-muted mb-4">Você ainda não fez nenhum pedido.</p>
                <Link href="/loja">
                  <Button variant="primary">
                    Fazer Primeiro Pedido
                  </Button>
                </Link>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      ) : (
        <Row>
          {pedidos.map((pedido) => (
            <Col md={6} lg={4} key={pedido.id} className="mb-4">
              <Card className="h-100 shadow-sm">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div>
                      <h6 className="text-muted mb-1">Pedido #{pedido.id}</h6>
                      <small className="text-muted">{formatDateTime(pedido.created_at)}</small>
                    </div>
                    {getStatusBadge(pedido.status)}
                  </div>

                  <div className="mb-3">
                    <div className="d-flex justify-content-between mb-2">
                      <span>Total:</span>
                      <strong className="text-primary">{formatPrice(pedido.total)}</strong>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span>Itens:</span>
                      <span>{pedido.total_itens}</span>
                    </div>
                  </div>

                  {pedido.status === 'validado' && pedido.validated_at && (
                    <div className="mb-3">
                      <small className="text-success">
                        <FaCheckCircle className="me-1" />
                        Validado em {formatDateTime(pedido.validated_at)}
                      </small>
                    </div>
                  )}

                  <div className="d-grid">
                    <Link href={`/pedidos/${pedido.id}`}>
                      <Button variant="outline-primary" className="w-100">
                        <FaQrcode className="me-2" />
                        Ver QR Code
                      </Button>
                    </Link>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </Container>
  );
}
"use client";

import { useState, useEffect } from "react";
import ComponentContainerCard from "@/components/ComponentContainerCard";
import { Row, Col, Card, Badge, Button, Table, Spinner, Alert, CardTitle, ProgressBar } from "react-bootstrap";
import { FaQrcode, FaShoppingBag, FaClock, FaCheckCircle, FaBox, FaTruck, FaReceipt, FaFilter, FaCalendarAlt } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState([]);
  const [filteredPedidos, setFilteredPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ show: false, message: "", variant: "" });
  const [filtroStatus, setFiltroStatus] = useState("todos");

  useEffect(() => {
    fetchPedidos();
  }, []);

  useEffect(() => {
    // Filtrar pedidos baseado no status selecionado
    if (filtroStatus === "todos") {
      setFilteredPedidos(pedidos);
    } else {
      setFilteredPedidos(pedidos.filter(pedido => pedido.status === filtroStatus));
    }
  }, [pedidos, filtroStatus]);

  const fetchPedidos = async () => {
    try {
      const response = await fetch("/api/pedidos");
      if (response.ok) {
        const data = await response.json();
        // Ordenar pedidos por data de criação (mais recentes primeiro)
        const pedidosOrdenados = data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setPedidos(pedidosOrdenados);
      } else {
        showAlert("Erro ao carregar pedidos", "danger");
      }
    } catch (error) {
      showAlert("Erro ao carregar pedidos", "danger");
    } finally {
      setLoading(false);
    }
  };

  // Estatísticas dos pedidos
  const getEstatisticas = () => {
    const total = pedidos.length;
    const pendentes = pedidos.filter(p => p.status === 'pendente').length;
    const validados = pedidos.filter(p => p.status === 'validado').length;
    const valorTotal = pedidos.reduce((acc, p) => acc + parseFloat(p.total || 0), 0);

    return { total, pendentes, validados, valorTotal };
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

  const getStatusConfig = (status) => {
    const statusConfig = {
      'pendente': {
        bg: 'warning',
        text: 'Aguardando Validação',
        icon: FaClock,
        description: 'Leve o QR Code ao estabelecimento',
        progress: 50
      },
      'validado': {
        bg: 'dark',
        text: 'Compra Realizada',
        icon: FaCheckCircle,
        description: 'Pedido validado com sucesso!',
        progress: 100
      }
    };

    return statusConfig[status] || {
      bg: 'light',
      text: 'Status Desconhecido',
      icon: FaClock,
      description: '',
      progress: 0
    };
  };

  const getStatusBadge = (status) => {
    const config = getStatusConfig(status);
    const IconComponent = config.icon;

    return (
      <Badge bg={config.bg} className="d-flex align-items-center gap-1 px-3 py-2">
        <IconComponent size={12} />
        {config.text}
      </Badge>
    );
  };

  const { total, pendentes, validados, valorTotal } = getEstatisticas();

  return (
    <ComponentContainerCard id="meus-pedidos">
      {/* Cabeçalho: Título + Botão */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <CardTitle as="h4" className="mb-1">Meus Pedidos</CardTitle>
          <small className="text-muted">Acompanhe seus pedidos e histórico de compras</small>
        </div>
        <Link href="/catalogo">
          <Button variant="primary" className="d-flex align-items-center gap-2">
            <FaShoppingBag />
            Continuar Comprando
          </Button>
        </Link>
      </div>

      {!loading && pedidos.length > 0 && (
        <>
          {/* Estatísticas */}
          <Row className="mb-4">
            <Col md={3}>
              <Card className="border h-100">
                <Card.Body className="text-center">
                  <FaReceipt className="text-dark mb-2" size={24} />
                  <h4 className="text-dark fw-bold mb-1">{total}</h4>
                  <small className="text-muted">Total de Pedidos</small>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="border h-100">
                <Card.Body className="text-center">
                  <FaClock className="text-warning mb-2" size={24} />
                  <h4 className="text-warning fw-bold mb-1">{pendentes}</h4>
                  <small className="text-muted">Aguardando</small>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="border h-100">
                <Card.Body className="text-center">
                  <FaCheckCircle className="text-dark mb-2" size={24} />
                  <h4 className="text-dark fw-bold mb-1">{validados}</h4>
                  <small className="text-muted">Validados</small>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="border h-100">
                <Card.Body className="text-center">
                  <FaBox className="text-dark mb-2" size={24} />
                  <h4 className="text-dark fw-bold mb-1">{formatPrice(valorTotal)}</h4>
                  <small className="text-muted">Valor Total</small>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Filtros */}
          <Card className="mb-4 border-0 bg-light">
            <Card.Body className="py-3">
              <div className="d-flex align-items-center gap-3">
                <FaFilter className="text-muted" />
                <span className="fw-bold">Filtrar por status:</span>
                <div className="d-flex gap-2">
                  <Button
                    variant={filtroStatus === "todos" ? "primary" : "outline-secondary"}
                    size="sm"
                    onClick={() => setFiltroStatus("todos")}
                  >
                    Todos ({total})
                  </Button>
                  <Button
                    variant={filtroStatus === "pendente" ? "warning" : "outline-warning"}
                    size="sm"
                    onClick={() => setFiltroStatus("pendente")}
                  >
                    Pendentes ({pendentes})
                  </Button>
                  <Button
                    variant={filtroStatus === "validado" ? "dark" : "outline-dark"}
                    size="sm"
                    onClick={() => setFiltroStatus("validado")}
                  >
                    Validados ({validados})
                  </Button>
                </div>
              </div>
            </Card.Body>
          </Card>
        </>
      )}

      {loading ? (
        <div className="d-flex flex-column justify-content-center align-items-center" style={{ height: "50vh" }}>
          <Spinner animation="border" role="status" className="mb-3">
            <span className="visually-hidden">Carregando...</span>
          </Spinner>
          <p className="text-muted">Carregando seus pedidos...</p>
        </div>
      ) : (
        <>
          {alert.show && (
            <Alert variant={alert.variant} className="mb-4">
              {alert.message}
            </Alert>
          )}

          {pedidos.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="text-center py-5 border-0 bg-light">
                <Card.Body>
                  <div className="bg-primary bg-opacity-10 rounded-circle p-4 d-inline-flex mb-4">
                    <FaShoppingBag size={48} className="text-primary" />
                  </div>
                  <h4 className="text-dark mb-3">Nenhum pedido encontrado</h4>
                  <p className="text-muted mb-4">Você ainda não fez nenhum pedido. Que tal explorar nossos produtos?</p>
                  <div className="d-flex gap-2 justify-content-center">
                    <Link href="/catalogo">
                      <Button variant="primary" className="px-4">
                        <FaShoppingBag className="me-2" />
                        Fazer Primeiro Pedido
                      </Button>
                    </Link>
                    <Link href="/lojas">
                      <Button variant="outline-primary" className="px-4">
                        Ver Lojas Parceiras
                      </Button>
                    </Link>
                  </div>
                </Card.Body>
              </Card>
            </motion.div>
          ) : (
        <Row>
          <AnimatePresence>
            {filteredPedidos.map((pedido, index) => {
              const statusConfig = getStatusConfig(pedido.status);
              const IconComponent = statusConfig.icon;

              return (
                <Col md={6} lg={4} key={pedido.id} className="mb-4">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ y: -5 }}
                  >
                    <Card className="h-100 shadow-sm border-0 overflow-hidden">
                      <div
                        className={`bg-${statusConfig.bg} bg-opacity-10 p-3 border-bottom`}
                      >
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <h6 className="mb-1 fw-bold text-dark">Pedido #{pedido.id}</h6>
                            <small className="text-muted d-flex align-items-center">
                              <FaCalendarAlt className="me-1" size={10} />
                              {formatDateTime(pedido.created_at)}
                            </small>
                          </div>
                          {getStatusBadge(pedido.status)}
                        </div>
                      </div>

                      <Card.Body className="p-4">
                        {/* Progress Bar */}
                        <div className="mb-3">
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <small className="text-muted fw-bold">Status do Pedido</small>
                            <small className="text-muted">{statusConfig.progress}%</small>
                          </div>
                          <ProgressBar
                            now={statusConfig.progress}
                            variant={statusConfig.bg}
                            style={{ height: '6px' }}
                            className="rounded-pill"
                          />
                          <small className="text-muted mt-1 d-block">
                            {statusConfig.description}
                          </small>
                        </div>

                        {/* Detalhes do Pedido */}
                        <div className="bg-light rounded-3 p-3 mb-3">
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <span className="text-muted">Valor Total:</span>
                            <strong className="text-primary fs-5">{formatPrice(pedido.total)}</strong>
                          </div>
                          <div className="d-flex justify-content-between align-items-center">
                            <span className="text-muted">Quantidade:</span>
                            <Badge bg="secondary" className="px-3 py-2">
                              <FaBox className="me-1" size={10} />
                              {pedido.total_itens} {pedido.total_itens === 1 ? 'item' : 'itens'}
                            </Badge>
                          </div>
                        </div>

                        {/* Data de Validação */}
                        {pedido.status === 'validado' && pedido.validated_at && (
                          <div className="bg-light border rounded-3 p-3 mb-3">
                            <div className="d-flex align-items-center text-dark">
                              <div className="bg-dark rounded-circle p-2 me-3">
                                <FaCheckCircle size={14} className="text-white" />
                              </div>
                              <div>
                                <small className="fw-bold d-block">Pedido Validado!</small>
                                <small className="text-muted">{formatDateTime(pedido.validated_at)}</small>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Botão de Ação */}
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <Link href={`/pedidos/${pedido.id}`} className="text-decoration-none">
                            <Button
                              variant={pedido.status === 'validado' ? 'dark' : 'warning'}
                              className="w-100 py-2 fw-bold"
                            >
                              <FaQrcode className="me-2" />
                              {pedido.status === 'validado' ? 'Ver Comprovante' : 'Mostrar QR Code'}
                            </Button>
                          </Link>
                        </motion.div>
                      </Card.Body>
                    </Card>
                  </motion.div>
                </Col>
              );
            })}
          </AnimatePresence>
        </Row>
          )}
        </>
      )}
    </ComponentContainerCard>
  );
}
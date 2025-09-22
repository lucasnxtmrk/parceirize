"use client";

import { useState, useEffect } from "react";
import { Row, Col, Card, Button, Badge, Alert, Spinner, Modal, Form } from "react-bootstrap";
import { FaTicketAlt, FaUser, FaCalendar, FaCheckCircle, FaTimesCircle, FaEye, FaClock } from "react-icons/fa";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import ComponentContainerCard from "@/components/ComponentContainerCard";
import IconifyIcon from "@/components/wrappers/IconifyIcon";

export default function SolicitacoesVoucherPage() {
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: "", variant: "" });
  const [showModal, setShowModal] = useState(false);
  const [selectedSolicitacao, setSelectedSolicitacao] = useState(null);
  const [resposta, setResposta] = useState("");
  const [acao, setAcao] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("all");
  const { data: session } = useSession();

  useEffect(() => {
    fetchSolicitacoes();
  }, []);

  const fetchSolicitacoes = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/voucher/solicitacoes-parceiro");
      if (response.ok) {
        const data = await response.json();
        setSolicitacoes(data.solicitacoes || []);
      } else {
        showAlert("Erro ao carregar solicitações", "danger");
      }
    } catch (error) {
      showAlert("Erro ao carregar solicitações", "danger");
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (message, variant) => {
    setAlert({ show: true, message, variant });
    setTimeout(() => setAlert({ show: false, message: "", variant: "" }), 5000);
  };

  const handleProcessar = (solicitacao, tipoAcao) => {
    setSelectedSolicitacao(solicitacao);
    setAcao(tipoAcao);
    setResposta("");
    setShowModal(true);
  };

  const confirmarProcessamento = async () => {
    if (!selectedSolicitacao) return;

    setProcessing(true);
    try {
      const response = await fetch("/api/voucher/aprovar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          solicitacao_id: selectedSolicitacao.id,
          acao,
          resposta_parceiro: resposta.trim() || null
        })
      });

      const data = await response.json();

      if (response.ok) {
        showAlert(
          `Solicitação ${acao === 'aprovar' ? 'aprovada' : 'rejeitada'} com sucesso!`,
          "success"
        );
        fetchSolicitacoes();
        setShowModal(false);

        if (acao === 'aprovar' && data.codigo_validacao) {
          showAlert(
            `Voucher aprovado! Código de validação: ${data.codigo_validacao}`,
            "success"
          );
        }
      } else {
        showAlert(data.error || "Erro ao processar solicitação", "danger");
      }
    } catch (error) {
      showAlert("Erro ao processar solicitação", "danger");
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'pendente': { bg: 'warning', icon: FaClock, text: 'Pendente' },
      'aprovado': { bg: 'success', icon: FaCheckCircle, text: 'Aprovado' },
      'rejeitado': { bg: 'danger', icon: FaTimesCircle, text: 'Rejeitado' },
      'usado': { bg: 'info', icon: FaTicketAlt, text: 'Usado' },
      'expirado': { bg: 'secondary', icon: FaClock, text: 'Expirado' }
    };

    const config = statusConfig[status] || statusConfig['pendente'];
    const IconComponent = config.icon;

    return (
      <Badge bg={config.bg} className="d-flex align-items-center gap-1">
        <IconComponent size={12} />
        {config.text}
      </Badge>
    );
  };

  const formatData = (dataString) => {
    if (!dataString) return '-';
    return new Date(dataString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const solicitacoesFiltradas = solicitacoes.filter(solicitacao => {
    if (filtroStatus === 'all') return true;
    return solicitacao.status === filtroStatus;
  });

  const stats = {
    total: solicitacoes.length,
    pendentes: solicitacoes.filter(s => s.status === 'pendente').length,
    aprovadas: solicitacoes.filter(s => s.status === 'aprovado').length,
    rejeitadas: solicitacoes.filter(s => s.status === 'rejeitado').length
  };

  if (loading) {
    return (
      <ComponentContainerCard id="solicitacoes-loading">
        <div className="d-flex justify-content-center align-items-center" style={{ height: "50vh" }}>
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Carregando...</span>
          </Spinner>
        </div>
      </ComponentContainerCard>
    );
  }

  return (
    <ComponentContainerCard id="solicitacoes-voucher">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="fw-bold mb-0 d-flex align-items-center">
          <FaTicketAlt className="me-2 text-primary" />
          Solicitações de Voucher
        </h3>
      </div>

      {alert.show && (
        <Alert variant={alert.variant} className="mb-4">
          {alert.message}
        </Alert>
      )}

      {/* Stats Cards */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body className="text-center">
              <div className="text-primary mb-2">
                <IconifyIcon icon="heroicons:ticket" width={32} />
              </div>
              <h4 className="fw-bold">{stats.total}</h4>
              <small className="text-muted">Total</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body className="text-center">
              <div className="text-warning mb-2">
                <FaClock size={32} />
              </div>
              <h4 className="fw-bold">{stats.pendentes}</h4>
              <small className="text-muted">Pendentes</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body className="text-center">
              <div className="text-success mb-2">
                <FaCheckCircle size={32} />
              </div>
              <h4 className="fw-bold">{stats.aprovadas}</h4>
              <small className="text-muted">Aprovadas</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body className="text-center">
              <div className="text-danger mb-2">
                <FaTimesCircle size={32} />
              </div>
              <h4 className="fw-bold">{stats.rejeitadas}</h4>
              <small className="text-muted">Rejeitadas</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Filtros */}
      <Row className="mb-4">
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Body className="py-2">
              <div className="d-flex gap-2 align-items-center">
                <small className="text-muted me-2">Filtrar por status:</small>
                <Button
                  size="sm"
                  variant={filtroStatus === 'all' ? 'primary' : 'outline-secondary'}
                  onClick={() => setFiltroStatus('all')}
                >
                  Todos ({stats.total})
                </Button>
                <Button
                  size="sm"
                  variant={filtroStatus === 'pendente' ? 'warning' : 'outline-warning'}
                  onClick={() => setFiltroStatus('pendente')}
                >
                  Pendentes ({stats.pendentes})
                </Button>
                <Button
                  size="sm"
                  variant={filtroStatus === 'aprovado' ? 'success' : 'outline-success'}
                  onClick={() => setFiltroStatus('aprovado')}
                >
                  Aprovadas ({stats.aprovadas})
                </Button>
                <Button
                  size="sm"
                  variant={filtroStatus === 'rejeitado' ? 'danger' : 'outline-danger'}
                  onClick={() => setFiltroStatus('rejeitado')}
                >
                  Rejeitadas ({stats.rejeitadas})
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Lista de Solicitações */}
      {solicitacoesFiltradas.length === 0 ? (
        <Card className="border-0 shadow-sm text-center py-5">
          <Card.Body>
            <div className="text-muted mb-3">
              <FaTicketAlt size={60} />
            </div>
            <h4 className="text-muted">
              {filtroStatus === 'all'
                ? 'Nenhuma solicitação encontrada'
                : `Nenhuma solicitação ${filtroStatus === 'pendente' ? 'pendente' : filtroStatus}`
              }
            </h4>
            <p className="text-muted">
              {filtroStatus === 'all'
                ? 'Quando clientes solicitarem vouchers, elas aparecerão aqui.'
                : 'Tente alterar o filtro para ver outras solicitações.'
              }
            </p>
          </Card.Body>
        </Card>
      ) : (
        <AnimatePresence>
          {solicitacoesFiltradas.map((solicitacao, index) => (
            <motion.div
              key={solicitacao.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="border-0 shadow-sm mb-3">
                <Card.Body className="p-4">
                  <Row className="align-items-center">
                    <Col md={2}>
                      <div className="d-flex align-items-center">
                        <Image
                          src="/assets/images/avatar.jpg"
                          alt={solicitacao.cliente_nome}
                          width={50}
                          height={50}
                          className="rounded-circle me-3"
                          style={{ objectFit: "cover" }}
                        />
                        <div>
                          <h6 className="mb-0 fw-bold">{solicitacao.cliente_nome}</h6>
                          <small className="text-muted">{solicitacao.cliente_email}</small>
                        </div>
                      </div>
                    </Col>

                    <Col md={3}>
                      <div className="mb-2">
                        <small className="text-muted d-block">Data da Solicitação</small>
                        <span className="fw-semibold">
                          <FaCalendar className="me-1" />
                          {formatData(solicitacao.data_solicitacao)}
                        </span>
                      </div>
                      {solicitacao.data_resposta && (
                        <div>
                          <small className="text-muted d-block">Data da Resposta</small>
                          <span className="fw-semibold">
                            <FaCalendar className="me-1" />
                            {formatData(solicitacao.data_resposta)}
                          </span>
                        </div>
                      )}
                    </Col>

                    <Col md={2}>
                      <div className="mb-2">
                        <small className="text-muted d-block">Status</small>
                        {getStatusBadge(solicitacao.status)}
                      </div>
                      {solicitacao.codigo_validacao && (
                        <div>
                          <small className="text-muted d-block">Código</small>
                          <Badge bg="light" text="dark" className="font-monospace">
                            {solicitacao.codigo_validacao}
                          </Badge>
                        </div>
                      )}
                    </Col>

                    <Col md={3}>
                      {solicitacao.mensagem_cliente && (
                        <div className="mb-2">
                          <small className="text-muted d-block">Mensagem do Cliente</small>
                          <p className="small mb-0 bg-light p-2 rounded">
                            "{solicitacao.mensagem_cliente}"
                          </p>
                        </div>
                      )}
                      {solicitacao.resposta_parceiro && (
                        <div>
                          <small className="text-muted d-block">Sua Resposta</small>
                          <p className="small mb-0 bg-primary bg-opacity-10 p-2 rounded">
                            "{solicitacao.resposta_parceiro}"
                          </p>
                        </div>
                      )}
                    </Col>

                    <Col md={2}>
                      {solicitacao.status === 'pendente' ? (
                        <div className="d-grid gap-1">
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => handleProcessar(solicitacao, 'aprovar')}
                          >
                            <FaCheckCircle className="me-1" />
                            Aprovar
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleProcessar(solicitacao, 'rejeitar')}
                          >
                            <FaTimesCircle className="me-1" />
                            Rejeitar
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center">
                          <small className="text-muted">
                            {solicitacao.status === 'aprovado' && 'Voucher aprovado'}
                            {solicitacao.status === 'rejeitado' && 'Solicitação rejeitada'}
                            {solicitacao.status === 'usado' && 'Voucher utilizado'}
                            {solicitacao.status === 'expirado' && 'Voucher expirado'}
                          </small>
                        </div>
                      )}
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      )}

      {/* Modal de Confirmação */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="d-flex align-items-center">
            {acao === 'aprovar' ? (
              <>
                <FaCheckCircle className="me-2 text-success" />
                Aprovar Voucher
              </>
            ) : (
              <>
                <FaTimesCircle className="me-2 text-danger" />
                Rejeitar Solicitação
              </>
            )}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedSolicitacao && (
            <div className="mb-3">
              <div className="d-flex align-items-center mb-3">
                <Image
                  src="/assets/images/avatar.jpg"
                  alt={selectedSolicitacao.cliente_nome}
                  width={50}
                  height={50}
                  className="rounded-circle me-3"
                />
                <div>
                  <h6 className="mb-0">{selectedSolicitacao.cliente_nome}</h6>
                  <small className="text-muted">{selectedSolicitacao.cliente_email}</small>
                </div>
              </div>

              {selectedSolicitacao.mensagem_cliente && (
                <div className="mb-3">
                  <label className="form-label fw-bold">Mensagem do Cliente:</label>
                  <div className="bg-light p-3 rounded">
                    "{selectedSolicitacao.mensagem_cliente}"
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mb-3">
            <label className="form-label fw-bold">
              {acao === 'aprovar' ? 'Mensagem de aprovação (opcional)' : 'Motivo da rejeição (opcional)'}
            </label>
            <textarea
              className="form-control"
              rows="3"
              placeholder={
                acao === 'aprovar'
                  ? "Ex: Voucher aprovado! Aproveite o desconto..."
                  : "Ex: Solicitação não atende aos critérios..."
              }
              value={resposta}
              onChange={(e) => setResposta(e.target.value)}
              maxLength={500}
            />
            <small className="text-muted">{resposta.length}/500 caracteres</small>
          </div>

          <Alert variant={acao === 'aprovar' ? 'success' : 'warning'} className="small">
            <IconifyIcon icon="heroicons:information-circle" className="me-1" />
            {acao === 'aprovar'
              ? 'Ao aprovar, um código de validação único será gerado automaticamente para o cliente.'
              : 'Esta ação não pode ser desfeita. O cliente será notificado sobre a rejeição.'
            }
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancelar
          </Button>
          <Button
            variant={acao === 'aprovar' ? 'success' : 'danger'}
            onClick={confirmarProcessamento}
            disabled={processing}
          >
            {processing ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Processando...
              </>
            ) : (
              <>
                {acao === 'aprovar' ? (
                  <>
                    <FaCheckCircle className="me-2" />
                    Confirmar Aprovação
                  </>
                ) : (
                  <>
                    <FaTimesCircle className="me-2" />
                    Confirmar Rejeição
                  </>
                )}
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </ComponentContainerCard>
  );
}
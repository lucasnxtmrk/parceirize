"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { Container, Row, Col, Card, Button, Badge, Table, Modal, Form, Pagination, Spinner, Alert } from 'react-bootstrap';
import ComponentContainerCard from '@/components/ComponentContainerCard';

const statusColors = {
  queued: 'secondary',
  running: 'primary',
  completed: 'success',
  failed: 'danger'
};

const statusLabels = {
  queued: 'Na Fila',
  running: 'Processando',
  completed: 'Concluída',
  failed: 'Erro'
};

function ProgressBar({ percent, variant = 'primary' }) {
  return (
    <div className="progress" style={{ height: '8px' }}>
      <div
        className={`progress-bar bg-${variant}`}
        role="progressbar"
        style={{ width: `${Math.min(Math.max(percent || 0, 0), 100)}%` }}
        aria-valuenow={percent}
        aria-valuemin="0"
        aria-valuemax="100"
      />
    </div>
  );
}

function ImportacaoCard({ importacao, onViewDetails, onRefresh }) {
  const formatDuration = (seconds) => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatETA = (seconds) => {
    if (!seconds) return '';
    if (seconds < 60) return `${seconds}s restantes`;
    const mins = Math.floor(seconds / 60);
    return `${mins}m restantes`;
  };

  return (
    <Card className="mb-3">
      <Card.Body>
        <Row className="align-items-center">
          <Col md={3}>
            <div className="d-flex align-items-center">
              <Badge bg={statusColors[importacao.status]} className="me-2">
                {statusLabels[importacao.status]}
              </Badge>
              <div>
                <h6 className="mb-1">{importacao.nome_importacao}</h6>
                <small className="text-muted">
                  ID: #{importacao.id} | {new Date(importacao.created_at).toLocaleString('pt-BR')}
                </small>
              </div>
            </div>
          </Col>

          <Col md={4}>
            {importacao.status === 'running' && (
              <div>
                <ProgressBar
                  percent={importacao.progresso_percent}
                  variant="primary"
                />
                <div className="d-flex justify-content-between mt-1">
                  <small>{importacao.processados || 0} / {importacao.total_estimado || 0}</small>
                  <small>{importacao.progresso_percent?.toFixed(1) || 0}%</small>
                </div>
                {importacao.eta_segundos && (
                  <small className="text-info">{formatETA(importacao.eta_segundos)}</small>
                )}
              </div>
            )}

            {importacao.status === 'completed' && (
              <div className="text-success">
                <small>
                  ✅ {importacao.criados || 0} criados, {importacao.atualizados || 0} atualizados
                  {importacao.erros > 0 && `, ${importacao.erros} erros`}
                </small>
              </div>
            )}

            {importacao.status === 'queued' && (
              <div className="text-secondary">
                <small>⏳ Na fila (posição {importacao.queue_position || '?'})</small>
              </div>
            )}

            {importacao.status === 'failed' && (
              <div className="text-danger">
                <small>❌ {importacao.mensagem_atual || 'Erro na importação'}</small>
              </div>
            )}
          </Col>

          <Col md={3}>
            {importacao.mensagem_atual && (
              <small className="text-muted d-block">{importacao.mensagem_atual}</small>
            )}
          </Col>

          <Col md={2} className="text-end">
            <Button
              variant="outline-primary"
              size="sm"
              onClick={() => onViewDetails(importacao.id)}
            >
              Detalhes
            </Button>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
}

function ImportacaoDetailsModal({ show, onHide, importacaoId }) {
  const [importacao, setImportacao] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (show && importacaoId) {
      loadDetails();
    }
  }, [show, importacaoId]);

  const loadDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/integracoes/sgp/importacoes/${importacaoId}`);
      const data = await response.json();

      if (data.success) {
        setImportacao(data.data);
      } else {
        setError(data.error || 'Erro ao carregar detalhes');
      }
    } catch (err) {
      setError('Erro ao carregar detalhes: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const cancelImportacao = async () => {
    if (!window.confirm('Tem certeza que deseja cancelar esta importação?')) return;

    try {
      const response = await fetch(`/api/admin/integracoes/sgp/importacoes/${importacaoId}`, {
        method: 'DELETE'
      });
      const data = await response.json();

      if (data.success) {
        alert('Importação cancelada com sucesso!');
        onHide();
      } else {
        alert('Erro ao cancelar: ' + (data.error || 'Erro desconhecido'));
      }
    } catch (err) {
      alert('Erro ao cancelar: ' + err.message);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Detalhes da Importação #{importacaoId}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {loading && (
          <div className="text-center p-4">
            <Spinner animation="border" />
            <div className="mt-2">Carregando detalhes...</div>
          </div>
        )}

        {error && (
          <Alert variant="danger">{error}</Alert>
        )}

        {importacao && (
          <div>
            <Row className="mb-4">
              <Col md={6}>
                <Card>
                  <Card.Header>Status</Card.Header>
                  <Card.Body>
                    <Badge bg={statusColors[importacao.status]} className="mb-2">
                      {statusLabels[importacao.status]}
                    </Badge>
                    <p><strong>Nome:</strong> {importacao.nome_importacao}</p>
                    <p><strong>Criada:</strong> {new Date(importacao.created_at).toLocaleString('pt-BR')}</p>
                    {importacao.started_at && (
                      <p><strong>Iniciada:</strong> {new Date(importacao.started_at).toLocaleString('pt-BR')}</p>
                    )}
                    {importacao.finalizado_em && (
                      <p><strong>Finalizada:</strong> {new Date(importacao.finalizado_em).toLocaleString('pt-BR')}</p>
                    )}
                    {importacao.worker_id && (
                      <p><strong>Worker:</strong> {importacao.worker_id}</p>
                    )}
                  </Card.Body>
                </Card>
              </Col>

              <Col md={6}>
                <Card>
                  <Card.Header>Progresso</Card.Header>
                  <Card.Body>
                    {importacao.status === 'running' && (
                      <ProgressBar percent={importacao.progresso_percent} />
                    )}
                    <p><strong>Total:</strong> {importacao.total_estimado || 0}</p>
                    <p><strong>Processados:</strong> {importacao.processados || 0}</p>
                    <p><strong>Criados:</strong> {importacao.criados || 0}</p>
                    <p><strong>Atualizados:</strong> {importacao.atualizados || 0}</p>
                    <p><strong>Erros:</strong> {importacao.erros || 0}</p>
                    {importacao.eta_segundos && (
                      <p><strong>Tempo restante:</strong> {Math.ceil(importacao.eta_segundos / 60)}min</p>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            {importacao.mensagem_atual && (
              <Alert variant="info">
                <strong>Status atual:</strong> {importacao.mensagem_atual}
              </Alert>
            )}

            {importacao.logs && importacao.logs.length > 0 && (
              <Card className="mb-3">
                <Card.Header>Logs</Card.Header>
                <Card.Body style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {importacao.logs.map((log, index) => (
                    <div key={index} className="border-bottom pb-1 mb-1">
                      <small className="text-muted">
                        {log.timestamp ? new Date(log.timestamp).toLocaleString('pt-BR') : ''}
                      </small>
                      <div>{log.mensagem || log}</div>
                    </div>
                  ))}
                </Card.Body>
              </Card>
            )}

            {importacao.configuracao && (
              <Card className="mb-3">
                <Card.Header>Configuração</Card.Header>
                <Card.Body>
                  <pre style={{ fontSize: '12px', maxHeight: '150px', overflowY: 'auto' }}>
                    {JSON.stringify(importacao.configuracao, null, 2)}
                  </pre>
                </Card.Body>
              </Card>
            )}

            {importacao.resultados && Object.keys(importacao.resultados).length > 0 && (
              <Card>
                <Card.Header>Resultados</Card.Header>
                <Card.Body>
                  <pre style={{ fontSize: '12px', maxHeight: '150px', overflowY: 'auto' }}>
                    {JSON.stringify(importacao.resultados, null, 2)}
                  </pre>
                </Card.Body>
              </Card>
            )}
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        {importacao?.status === 'queued' && (
          <Button variant="danger" onClick={cancelImportacao}>
            Cancelar Importação
          </Button>
        )}
        <Button variant="secondary" onClick={onHide}>Fechar</Button>
        <Button variant="primary" onClick={loadDetails}>Atualizar</Button>
      </Modal.Footer>
    </Modal>
  );
}

export default function ImportacoesStatusPage() {
  const [importacoes, setImportacoes] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filtros
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  // Modal
  const [showDetails, setShowDetails] = useState(false);
  const [selectedImportacao, setSelectedImportacao] = useState(null);

  // Auto-refresh para importações em andamento
  const [autoRefresh, setAutoRefresh] = useState(true);

  const loadImportacoes = useCallback(async () => {
    try {
      const offset = (currentPage - 1) * limit;
      const response = await fetch(
        `/api/admin/integracoes/sgp/importacoes/lista?status=${statusFilter}&limit=${limit}&offset=${offset}`
      );
      const data = await response.json();

      if (data.success) {
        setImportacoes(data.data.importacoes);
        setStats(data.data.stats);
        setTotalPages(Math.ceil(data.data.pagination.total / limit));
      } else {
        setError(data.error || 'Erro ao carregar importações');
      }
    } catch (err) {
      setError('Erro ao carregar importações: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [currentPage, statusFilter]);

  useEffect(() => {
    loadImportacoes();
  }, [loadImportacoes]);

  // Auto-refresh a cada 5 segundos se houver importações rodando e auto-refresh estiver ativo
  useEffect(() => {
    if (!autoRefresh) return;

    const hasRunningImports = importacoes.some(imp => ['queued', 'running'].includes(imp.status));
    if (!hasRunningImports) return;

    const interval = setInterval(loadImportacoes, 5000);
    return () => clearInterval(interval);
  }, [importacoes, autoRefresh, loadImportacoes]);

  const handleViewDetails = (importacaoId) => {
    setSelectedImportacao(importacaoId);
    setShowDetails(true);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleStatusFilterChange = (status) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  if (loading && importacoes.length === 0) {
    return (
      <Container fluid className="p-4">
        <div className="text-center p-5">
          <Spinner animation="border" />
          <div className="mt-2">Carregando importações...</div>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="p-4">
      <ComponentContainerCard
        title="Status das Importações SGP"
        subtitle="Acompanhe o progresso das importações de clientes do SGP"
      >
        {error && (
          <Alert variant="danger" className="mb-4">
            {error}
          </Alert>
        )}

        {/* Estatísticas */}
        <Row className="mb-4">
          <Col md={3}>
            <Card className="bg-light">
              <Card.Body className="text-center">
                <h5 className="text-secondary">{stats.queued || 0}</h5>
                <small>Na Fila</small>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="bg-primary text-white">
              <Card.Body className="text-center">
                <h5>{stats.running || 0}</h5>
                <small>Processando</small>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="bg-success text-white">
              <Card.Body className="text-center">
                <h5>{stats.completed || 0}</h5>
                <small>Concluídas</small>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="bg-danger text-white">
              <Card.Body className="text-center">
                <h5>{stats.failed || 0}</h5>
                <small>Com Erro</small>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Controles */}
        <Row className="mb-3 align-items-center">
          <Col md={6}>
            <div className="d-flex gap-2">
              <Button
                variant={statusFilter === 'all' ? 'primary' : 'outline-primary'}
                size="sm"
                onClick={() => handleStatusFilterChange('all')}
              >
                Todas
              </Button>
              <Button
                variant={statusFilter === 'queued' ? 'secondary' : 'outline-secondary'}
                size="sm"
                onClick={() => handleStatusFilterChange('queued')}
              >
                Na Fila
              </Button>
              <Button
                variant={statusFilter === 'running' ? 'primary' : 'outline-primary'}
                size="sm"
                onClick={() => handleStatusFilterChange('running')}
              >
                Processando
              </Button>
              <Button
                variant={statusFilter === 'completed' ? 'success' : 'outline-success'}
                size="sm"
                onClick={() => handleStatusFilterChange('completed')}
              >
                Concluídas
              </Button>
              <Button
                variant={statusFilter === 'failed' ? 'danger' : 'outline-danger'}
                size="sm"
                onClick={() => handleStatusFilterChange('failed')}
              >
                Com Erro
              </Button>
            </div>
          </Col>
          <Col md={6} className="text-end">
            <div className="d-flex justify-content-end align-items-center gap-3">
              <Form.Check
                type="switch"
                id="auto-refresh"
                label="Auto-refresh"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              <Button variant="outline-primary" size="sm" onClick={() => loadImportacoes()}>
                ↻ Atualizar
              </Button>
            </div>
          </Col>
        </Row>

        {/* Lista de importações */}
        {importacoes.length === 0 ? (
          <Card>
            <Card.Body className="text-center py-5">
              <div className="text-muted">
                <h5>Nenhuma importação encontrada</h5>
                <p>Não há importações com o status selecionado.</p>
              </div>
            </Card.Body>
          </Card>
        ) : (
          importacoes.map(importacao => (
            <ImportacaoCard
              key={importacao.id}
              importacao={importacao}
              onViewDetails={handleViewDetails}
              onRefresh={loadImportacoes}
            />
          ))
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="d-flex justify-content-center mt-4">
            <Pagination>
              <Pagination.Prev
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
              />

              {[...Array(totalPages)].map((_, index) => {
                const page = index + 1;
                if (
                  page === 1 ||
                  page === totalPages ||
                  Math.abs(page - currentPage) <= 2
                ) {
                  return (
                    <Pagination.Item
                      key={page}
                      active={page === currentPage}
                      onClick={() => handlePageChange(page)}
                    >
                      {page}
                    </Pagination.Item>
                  );
                } else if (
                  page === currentPage - 3 ||
                  page === currentPage + 3
                ) {
                  return <Pagination.Ellipsis key={page} />;
                }
                return null;
              })}

              <Pagination.Next
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
              />
            </Pagination>
          </div>
        )}
      </ComponentContainerCard>

      {/* Modal de detalhes */}
      <ImportacaoDetailsModal
        show={showDetails}
        onHide={() => setShowDetails(false)}
        importacaoId={selectedImportacao}
      />
    </Container>
  );
}
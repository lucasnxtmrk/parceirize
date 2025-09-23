"use client";

import React from 'react';
import { Card, ProgressBar, Button, Badge, Row, Col } from 'react-bootstrap';
import { FaDownload, FaCheck, FaExclamationTriangle, FaTimes, FaClock, FaSpinner } from 'react-icons/fa';

const ImportProgressBar = ({
  progress,
  isImporting,
  isCompleted,
  error,
  onCancel,
  variant = 'card', // 'card' ou 'inline'
  className = ''
}) => {
  const {
    fase,
    mensagem,
    processados,
    total,
    criados,
    atualizados,
    erros,
    progresso_percent,
    eta_segundos
  } = progress;

  // Função para formatar ETA
  const formatETA = (seconds) => {
    if (!seconds || seconds <= 0) return null;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return minutes > 0 ? `${minutes}min ${remainingSeconds}s` : `${remainingSeconds}s`;
  };

  // Função para obter cor da barra baseada na fase
  const getProgressVariant = () => {
    if (error) return 'danger';
    if (isCompleted) return 'success';
    if (fase === 'buscando') return 'info';
    if (fase === 'processando') return 'primary';
    return 'secondary';
  };

  // Função para obter ícone baseado no estado
  const getStatusIcon = () => {
    if (error) return <FaExclamationTriangle className="text-danger" />;
    if (isCompleted) return <FaCheck className="text-success" />;
    if (isImporting) return <FaSpinner className="text-primary spin" />;
    return <FaDownload className="text-muted" />;
  };

  // Função para obter texto do status
  const getStatusText = () => {
    if (error) return 'Erro na importação';
    if (isCompleted) return 'Importação concluída';
    if (isImporting) {
      switch (fase) {
        case 'buscando': return 'Buscando dados do SGP...';
        case 'processando': return 'Processando clientes...';
        case 'preparando': return 'Preparando importação...';
        default: return 'Importando...';
      }
    }
    return 'Pronto para importar';
  };

  const progressPercent = Math.round(progresso_percent || 0);
  const etaText = formatETA(eta_segundos);

  if (variant === 'inline') {
    return (
      <div className={`import-progress-inline ${className}`}>
        <Row className="align-items-center g-2">
          <Col xs="auto">
            {getStatusIcon()}
          </Col>
          <Col>
            <div className="d-flex align-items-center gap-2">
              <ProgressBar
                now={progressPercent}
                variant={getProgressVariant()}
                className="flex-grow-1"
                style={{ height: '8px' }}
              />
              <small className="text-muted fw-bold">{progressPercent}%</small>
            </div>
            <small className="text-muted d-block">
              {mensagem || getStatusText()}
              {etaText && (
                <span className="ms-2">
                  <FaClock className="me-1" />
                  {etaText}
                </span>
              )}
            </small>
          </Col>
          {isImporting && onCancel && (
            <Col xs="auto">
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={onCancel}
                title="Cancelar importação"
              >
                <FaTimes />
              </Button>
            </Col>
          )}
        </Row>
      </div>
    );
  }

  return (
    <Card className={`import-progress-card ${className}`}>
      <Card.Header className="border-0 pb-2">
        <div className="d-flex justify-content-between align-items-center">
          <h6 className="mb-0 d-flex align-items-center gap-2">
            {getStatusIcon()}
            Importação SGP
          </h6>
          {isImporting && onCancel && (
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={onCancel}
              title="Cancelar importação"
            >
              <FaTimes className="me-1" />
              Cancelar
            </Button>
          )}
        </div>
      </Card.Header>

      <Card.Body className="pt-0">
        {/* Barra de Progresso */}
        <div className="mb-3">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <small className="text-muted fw-bold">Progresso</small>
            <small className="text-muted">{progressPercent}%</small>
          </div>
          <ProgressBar
            now={progressPercent}
            variant={getProgressVariant()}
            style={{ height: '12px' }}
            className="mb-2"
          />
          <small className="text-muted">
            {mensagem || getStatusText()}
          </small>
        </div>

        {/* Estatísticas */}
        {(total > 0 || processados > 0) && (
          <Row className="g-2 mb-3">
            <Col xs={6} sm={3}>
              <div className="text-center p-2 bg-light rounded">
                <div className="fw-bold text-primary">{processados}</div>
                <small className="text-muted">Processados</small>
              </div>
            </Col>
            <Col xs={6} sm={3}>
              <div className="text-center p-2 bg-light rounded">
                <div className="fw-bold text-success">{criados}</div>
                <small className="text-muted">Criados</small>
              </div>
            </Col>
            <Col xs={6} sm={3}>
              <div className="text-center p-2 bg-light rounded">
                <div className="fw-bold text-info">{atualizados}</div>
                <small className="text-muted">Atualizados</small>
              </div>
            </Col>
            <Col xs={6} sm={3}>
              <div className="text-center p-2 bg-light rounded">
                <div className="fw-bold text-warning">{erros}</div>
                <small className="text-muted">Erros</small>
              </div>
            </Col>
          </Row>
        )}

        {/* Informações Adicionais */}
        <div className="d-flex justify-content-between align-items-center">
          {total > 0 && (
            <small className="text-muted">
              <Badge bg="light" text="dark" className="me-2">
                {processados}/{total}
              </Badge>
              registros
            </small>
          )}

          {etaText && (
            <small className="text-muted d-flex align-items-center gap-1">
              <FaClock />
              Restam {etaText}
            </small>
          )}
        </div>

        {/* Erro */}
        {error && (
          <div className="alert alert-danger mt-3 mb-0">
            <FaExclamationTriangle className="me-2" />
            {error}
          </div>
        )}

        {/* Sucesso */}
        {isCompleted && !error && (
          <div className="alert alert-success mt-3 mb-0">
            <FaCheck className="me-2" />
            Importação concluída com sucesso!
            {total > 0 && (
              <div className="mt-2">
                <strong>{criados}</strong> clientes criados,
                <strong className="ms-1">{atualizados}</strong> atualizados
                {erros > 0 && <span className="text-warning ms-1">({erros} erros)</span>}
              </div>
            )}
          </div>
        )}
      </Card.Body>

      <style jsx>{`
        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Card>
  );
};

export default ImportProgressBar;
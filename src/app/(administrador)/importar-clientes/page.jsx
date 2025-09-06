"use client";

import React, { useState, useEffect } from 'react';
import ComponentContainerCard from '@/components/ComponentContainerCard';
import { Button, Modal, Form, Card, Container, Row, Col, Badge, Alert } from 'react-bootstrap';

export default function ImportarClientesPage() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [senhaPadrao, setSenhaPadrao] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/admin/integracoes/sgp');
      const data = await response.json();
      if (response.ok && data?.config) {
        setConfig(data.config);
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenImportModal = () => {
    setShowModal(true);
    setImportError(null);
    setImportResult(null);
    setSenhaPadrao('');
  };

  const handleCloseImportModal = () => {
    setShowModal(false);
    setImportError(null);
    setImportResult(null);
    setSenhaPadrao('');
  };

  const handleImport = async () => {
    if (!senhaPadrao || senhaPadrao.length < 6) {
      setImportError('Senha padrão deve ter pelo menos 6 caracteres');
      return;
    }

    setImportLoading(true);
    setImportError(null);
    setImportResult(null);

    try {
      const response = await fetch('/api/admin/integracoes/sgp/importar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senha_padrao: senhaPadrao })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erro na importação');
      }

      setImportResult(data);
    } catch (error) {
      setImportError(error.message);
    } finally {
      setImportLoading(false);
    }
  };

  if (loading) {
    return (
      <ComponentContainerCard id="importar-clientes" title="Importar Clientes" description="Importe clientes do SGP">
        <div className="text-center py-4">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Carregando...</span>
          </div>
        </div>
      </ComponentContainerCard>
    );
  }

  return (
    <ComponentContainerCard id="importar-clientes" title="Importar Clientes" description="Importe e sincronize clientes do SGP">
      <Container fluid>
        {!config ? (
          <Row>
            <Col xs={12}>
              <Alert variant="warning" className="d-flex align-items-center gap-2">
                <i className="bi bi-exclamation-triangle-fill"></i>
                <div>
                  <strong>Integração SGP não configurada</strong><br />
                  Configure a integração SGP primeiro para poder importar clientes.
                </div>
              </Alert>
              <Button variant="primary" href="/admin/integracoes">
                Configurar Integração SGP
              </Button>
            </Col>
          </Row>
        ) : (
          <>
            {/* Status da Integração */}
            <Row className="mb-4">
              <Col xs={12}>
                <Card className="shadow-sm border-0">
                  <Card.Header className="bg-light border-0 py-3">
                    <div className="d-flex justify-content-between align-items-center">
                      <h6 className="mb-0 d-flex align-items-center gap-2">
                        <i className="bi bi-router text-primary"></i>
                        Status da Integração SGP
                      </h6>
                      <Badge bg="success">Configurada</Badge>
                    </div>
                  </Card.Header>
                  <Card.Body>
                    <Row>
                      <Col md={6}>
                        <p className="mb-1"><strong>Subdomínio:</strong> {config.subdominio}</p>
                        <p className="mb-1"><strong>App:</strong> {config.app_name}</p>
                      </Col>
                      <Col md={6}>
                        <p className="mb-1">
                          <strong>Modo:</strong>{' '}
                          <Badge bg={config.modo_ativacao === 'integracao' ? 'info' : 'secondary'}>
                            {config.modo_ativacao === 'integracao' ? 'Automático' : 'Manual'}
                          </Badge>
                        </p>
                        <p className="mb-1">
                          <strong>Última Sync:</strong>{' '}
                          {config.last_sync ? 
                            new Date(config.last_sync).toLocaleString('pt-BR') : 
                            'Nunca'
                          }
                        </p>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            {/* Ações */}
            <Row>
              <Col xs={12}>
                <Card className="shadow-sm border-0">
                  <Card.Header className="bg-light border-0 py-3">
                    <h6 className="mb-0">Importação Manual</h6>
                  </Card.Header>
                  <Card.Body className="text-center py-5">
                    <div className="display-4 text-primary mb-3">
                      <i className="bi bi-cloud-download"></i>
                    </div>
                    <h5 className="mb-3">Importar Clientes do SGP</h5>
                    <p className="text-muted mb-4">
                      Importe todos os clientes ativos do seu SGP para o sistema de clube de desconto.
                      <br />
                      <small>
                        • Clientes com contratos ativos serão importados<br />
                        • Clientes já existentes terão apenas o status atualizado<br />
                        • Não afeta clientes que já foram transformados em parceiros
                      </small>
                    </p>
                    <Button 
                      variant="primary" 
                      size="lg" 
                      onClick={handleOpenImportModal}
                      className="d-inline-flex align-items-center gap-2"
                    >
                      <i className="bi bi-download"></i>
                      Iniciar Importação
                    </Button>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </>
        )}

        {/* Modal de Importação */}
        <Modal show={showModal} onHide={handleCloseImportModal} centered>
          <Modal.Header closeButton>
            <Modal.Title className="d-flex align-items-center gap-2">
              <i className="bi bi-download text-primary"></i>
              Importar Clientes do SGP
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="alert alert-info d-flex align-items-start gap-2 mb-3">
              <i className="bi bi-info-circle-fill"></i>
              <div>
                <strong>Sobre a importação:</strong><br />
                <small>
                  Os clientes importados receberão uma senha padrão e poderão alterá-la no primeiro login.
                  Apenas clientes com contratos ativos no SGP serão importados.
                </small>
              </div>
            </div>

            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Senha padrão para novos clientes *</Form.Label>
                <Form.Control 
                  type="password" 
                  placeholder="Mínimo 6 caracteres" 
                  value={senhaPadrao}
                  onChange={(e) => setSenhaPadrao(e.target.value)}
                  required
                />
                <Form.Text className="text-muted">
                  Esta será a senha temporária para todos os novos clientes importados
                </Form.Text>
              </Form.Group>

              {importError && (
                <Alert variant="danger" className="d-flex align-items-center gap-2">
                  <i className="bi bi-exclamation-circle-fill"></i>
                  {importError}
                </Alert>
              )}

              {importResult && (
                <Alert variant="success">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <i className="bi bi-check-circle-fill"></i>
                    <strong>Importação concluída com sucesso!</strong>
                  </div>
                  <div className="small">
                    <div>• <strong>{importResult.criados}</strong> novos clientes criados</div>
                    <div>• <strong>{importResult.atualizados}</strong> clientes atualizados</div>
                    <div>• <strong>{importResult.totalProcessados}</strong> clientes processados</div>
                    {importResult.erros && (
                      <div className="mt-2">
                        <strong>Avisos:</strong>
                        <ul className="mb-0 mt-1">
                          {importResult.erros.slice(0, 3).map((erro, i) => (
                            <li key={i}>{erro}</li>
                          ))}
                          {importResult.erros.length > 3 && <li>... e mais {importResult.erros.length - 3} avisos</li>}
                        </ul>
                      </div>
                    )}
                  </div>
                </Alert>
              )}
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseImportModal}>
              {importResult ? 'Fechar' : 'Cancelar'}
            </Button>
            {!importResult && (
              <Button 
                variant="primary" 
                onClick={handleImport} 
                disabled={importLoading || !senhaPadrao}
                className="d-inline-flex align-items-center gap-2"
              >
                {importLoading ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    Importando...
                  </>
                ) : (
                  <>
                    <i className="bi bi-download"></i>
                    Confirmar Importação
                  </>
                )}
              </Button>
            )}
          </Modal.Footer>
        </Modal>
      </Container>
    </ComponentContainerCard>
  );
}
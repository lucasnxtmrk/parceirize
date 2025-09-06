"use client";

import React, { useEffect, useState } from 'react';
import ComponentContainerCard from '@/components/ComponentContainerCard';
import { Button, Col, Form, FormControl, FormGroup, FormLabel, Row, Modal, Card, Container, Badge } from 'react-bootstrap';

export default function IntegracoesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [msg, setMsg] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [config, setConfig] = useState(null);
  const [lastSync, setLastSync] = useState(null);
  const [cronStatus, setCronStatus] = useState({ running: false, lastRun: null, nextRun: null });
  const [cronLoading, setCronLoading] = useState(false);

  const [subdominio, setSubdominio] = useState('');
  const [token, setToken] = useState('');
  const [appName, setAppName] = useState('');
  const [cpfCentral, setCpfCentral] = useState('');
  const [senhaCentral, setSenhaCentral] = useState('');
  const [modo, setModo] = useState('manual');

  useEffect(() => {
    const load = async () => {
      setError(null); setMsg(null); setLoading(true);
      try {
        const [configRes, cronRes] = await Promise.all([
          fetch('/api/admin/integracoes/sgp'),
          fetch('/api/admin/sync-cron')
        ]);
        
        const configData = await configRes.json();
        if (configRes.ok && configData?.config) {
          setConfig(configData.config);
          setLastSync(configData.lastSync);
          setSubdominio(configData.config.subdominio || '');
          setToken(configData.config.token || '');
          setAppName(configData.config.app_name || '');
          setCpfCentral(configData.config.cpf_central || '');
          setSenhaCentral(configData.config.senha_central || '');
          setModo(configData.config.modo_ativacao || 'manual');
        }
        
        const cronData = await cronRes.json();
        if (cronRes.ok) {
          setCronStatus(cronData);
        }
      } catch (e) { setError('Falha ao carregar configuração'); }
      setLoading(false);
    };
    load();
  }, []);

  const openModal = () => {
    setShowModal(true);
    setError(null);
    setMsg(null);
  };

  const closeModal = () => {
    setShowModal(false);
    setError(null);
    setMsg(null);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null); setMsg(null);
    try {
      const r = await fetch('/api/admin/integracoes/sgp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          subdominio, 
          token, 
          app_name: appName, 
          cpf_central: cpfCentral, 
          senha_central: senhaCentral, 
          modo_ativacao: modo 
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Erro ao salvar');
      setMsg('Integração SGP salva com sucesso.');
      setConfig(data.config);
      setTimeout(() => {
        closeModal();
        setMsg(null);
      }, 2000);
    } catch (e) {
      setError(e.message);
    }
  };

  const formatLastSync = (timestamp) => {
    if (!timestamp) return 'Nunca sincronizado';
    const date = new Date(timestamp);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleCronAction = async (action) => {
    setCronLoading(true);
    try {
      const response = await fetch('/api/admin/sync-cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      
      const data = await response.json();
      if (response.ok) {
        setCronStatus(data.status);
        if (action === 'run_now') {
          // Recarregar dados da sincronização
          const configRes = await fetch('/api/admin/integracoes/sgp');
          const configData = await configRes.json();
          if (configRes.ok) {
            setLastSync(configData.lastSync);
          }
        }
      }
    } catch (error) {
      console.error('Erro ao controlar cron:', error);
    } finally {
      setCronLoading(false);
    }
  };

  return (
    <ComponentContainerCard id="integracoes" title="Integrações" description="Configure integrações disponíveis para importar clientes.">
      {loading && (
        <div className="text-center py-4">
          <div className="spinner-border text-primary mb-2" role="status">
            <span className="visually-hidden">Carregando...</span>
          </div>
          <p className="text-muted mb-0">Carregando integrações...</p>
        </div>
      )}
      
      {!loading && (
        <Container fluid>
          {/* Status da Sincronização Automática */}
          {config && config.modo_ativacao === 'integracao' && (
            <Row className="mb-4">
              <Col xs={12}>
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-light border-0 py-3">
                    <div className="d-flex justify-content-between align-items-center">
                      <h6 className="mb-0 d-flex align-items-center gap-2">
                        <i className="bi bi-clock-history text-primary"></i>
                        Sincronização Automática (SGP)
                      </h6>
                      <Badge bg={cronStatus.running ? 'success' : 'secondary'}>
                        {cronStatus.running ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </div>
                  </div>
                  <div className="card-body py-3">
                    <Row className="align-items-center">
                      <Col md={8}>
                        <div className="d-flex flex-column gap-1">
                          <div className="d-flex align-items-center gap-3 text-sm">
                            <span>
                              <strong>Última sincronização:</strong> {formatLastSync(lastSync)}
                            </span>
                            {cronStatus.nextRun && (
                              <span className="text-muted">
                                <strong>Próxima:</strong> {formatLastSync(cronStatus.nextRun)}
                              </span>
                            )}
                          </div>
                          <small className="text-muted">
                            Sincronização automática a cada 8 horas para atualizar status dos clientes
                          </small>
                        </div>
                      </Col>
                      <Col md={4} className="text-end">
                        <div className="d-flex gap-2 justify-content-end">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => handleCronAction('run_now')}
                            disabled={cronLoading}
                            className="d-inline-flex align-items-center gap-1"
                          >
                            {cronLoading ? (
                              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                            ) : (
                              <i className="bi bi-arrow-clockwise"></i>
                            )}
                            Sincronizar Agora
                          </Button>
                          <Button
                            variant={cronStatus.running ? "outline-danger" : "outline-success"}
                            size="sm"
                            onClick={() => handleCronAction(cronStatus.running ? 'stop' : 'start')}
                            disabled={cronLoading}
                            className="d-inline-flex align-items-center gap-1"
                          >
                            <i className={`bi ${cronStatus.running ? 'bi-stop-circle' : 'bi-play-circle'}`}></i>
                            {cronStatus.running ? 'Parar' : 'Iniciar'}
                          </Button>
                        </div>
                      </Col>
                    </Row>
                  </div>
                </div>
              </Col>
            </Row>
          )}

          <Row className="g-4">
            {/* Card SGP */}
            <Col xs={12} sm={6} md={4} lg={3}>
              <Card 
                className="h-100 shadow-sm border-0 integration-card"
                style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                onClick={openModal}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                }}
              >
                <Card.Body className="text-center p-4">
                  <div className="display-4 text-primary mb-3">
                    <i className="bi bi-router"></i>
                  </div>
                  <h5 className="mb-2">SGP</h5>
                  <p className="text-muted small mb-3">Sistema de Gestão de Provedores</p>
                  
                  {config ? (
                    <Badge bg="success" className="mb-2">
                      <i className="bi bi-check-circle me-1"></i>
                      Configurado
                    </Badge>
                  ) : (
                    <Badge bg="secondary" className="mb-2">
                      <i className="bi bi-gear me-1"></i>
                      Não configurado
                    </Badge>
                  )}
                  
                  {config && (
                    <div className="mt-2">
                      <small className="text-muted d-block">
                        Última sincronização:
                      </small>
                      <small className="text-primary">
                        {formatLastSync(lastSync)}
                      </small>
                    </div>
                  )}
                  
                  <div className="mt-3">
                    <Button 
                      variant={config ? "outline-primary" : "primary"} 
                      size="sm"
                      className="d-inline-flex align-items-center gap-1"
                    >
                      <i className={`bi ${config ? 'bi-pencil' : 'bi-plus-circle'}`}></i>
                      {config ? 'Editar' : 'Configurar'}
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            {/* Placeholder para futuras integrações */}
            <Col xs={12} sm={6} md={4} lg={3}>
              <Card 
                className="h-100 shadow-sm border-0 text-center"
                style={{ 
                  borderStyle: 'dashed',
                  borderWidth: '2px',
                  borderColor: '#dee2e6',
                  backgroundColor: '#f8f9fa'
                }}
              >
                <Card.Body className="d-flex flex-column justify-content-center align-items-center p-4 text-muted">
                  <div className="display-4 mb-3">
                    <i className="bi bi-plus-circle"></i>
                  </div>
                  <h6 className="mb-2">Mais integrações</h6>
                  <p className="small mb-0">Em breve</p>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      )}

      {/* Modal SGP */}
      <Modal show={showModal} onHide={closeModal} centered size="lg">
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="d-flex align-items-center gap-2">
            <i className="bi bi-router text-primary"></i>
            Configurar Integração SGP
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-0">
          <Form onSubmit={onSubmit}>
            <Row className="g-3">
              <Col xs={12}>
                <div className="alert alert-info d-flex align-items-start gap-2">
                  <i className="bi bi-info-circle-fill"></i>
                  <div>
                    <strong>Sobre a integração:</strong><br />
                    <small>Conecte-se ao SGP para importar e sincronizar clientes de seu provedor automaticamente.</small>
                  </div>
                </div>
              </Col>

              <Col md={6}>
                <FormGroup>
                  <FormLabel>Subdomínio *</FormLabel>
                  <FormControl 
                    placeholder="ex: meuprovedor" 
                    value={subdominio} 
                    onChange={(e) => setSubdominio(e.target.value)} 
                    required 
                  />
                  <small className="text-muted">Endpoint: https://{subdominio || '{subdomínio}'}.sgp.net.br/api/clientes</small>
                </FormGroup>
              </Col>

              <Col md={6}>
                <FormGroup>
                  <FormLabel>Modo de ativação</FormLabel>
                  <Form.Select value={modo} onChange={(e) => setModo(e.target.value)}>
                    <option value="manual">Manual</option>
                    <option value="integracao">Automático (Integração)</option>
                  </Form.Select>
                  <small className="text-muted">
                    {modo === 'integracao' ? 'Status sincronizado automaticamente a cada 8h' : 'Controle manual do status'}
                  </small>
                </FormGroup>
              </Col>

              <Col xs={12}>
                <hr className="my-3" />
                <h6 className="text-primary mb-3">
                  <i className="bi bi-key me-2"></i>
                  Credenciais de Autenticação
                </h6>
              </Col>

              <Col md={6}>
                <FormGroup>
                  <FormLabel>Token *</FormLabel>
                  <FormControl 
                    value={token} 
                    onChange={(e) => setToken(e.target.value)} 
                    required 
                    placeholder="Insira o token do SGP"
                  />
                  <small className="text-muted">Sistema → Ferramentas → Painel Admin → Tokens</small>
                </FormGroup>
              </Col>

              <Col md={6}>
                <FormGroup>
                  <FormLabel>Nome da Aplicação *</FormLabel>
                  <FormControl 
                    placeholder="ex: parceirize" 
                    value={appName} 
                    onChange={(e) => setAppName(e.target.value)} 
                    required 
                  />
                  <small className="text-muted">Sistema → Usuários</small>
                </FormGroup>
              </Col>

              {msg && (
                <Col xs={12}>
                  <div className="alert alert-success d-flex align-items-center gap-2">
                    <i className="bi bi-check-circle-fill"></i>
                    {msg}
                  </div>
                </Col>
              )}

              {error && (
                <Col xs={12}>
                  <div className="alert alert-danger d-flex align-items-center gap-2">
                    <i className="bi bi-exclamation-circle-fill"></i>
                    {error}
                  </div>
                </Col>
              )}
            </Row>
          </Form>
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <Button variant="secondary" onClick={closeModal}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={onSubmit} className="d-inline-flex align-items-center gap-2">
            <i className="bi bi-check-circle"></i>
            Salvar Configuração
          </Button>
        </Modal.Footer>
      </Modal>
    </ComponentContainerCard>
  );
}
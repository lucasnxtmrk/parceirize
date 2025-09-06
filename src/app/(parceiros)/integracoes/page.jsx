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
        const r = await fetch('/api/parceiro/integracoes/sgp');
        const data = await r.json();
        if (r.ok && data?.config) {
          setConfig(data.config);
          setSubdominio(data.config.subdominio || '');
          setToken(data.config.token || '');
          setAppName(data.config.app_name || '');
          setCpfCentral(data.config.cpf_central || '');
          setSenhaCentral(data.config.senha_central || '');
          setModo(data.config.modo_ativacao || 'manual');
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
      const r = await fetch('/api/parceiro/integracoes/sgp', {
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

  return (
    <ComponentContainerCard id="integracoes" title="Integrações" description="Configure integrações disponíveis para sua conta.">
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
                    <small>Conecte-se ao SGP para importar e sincronizar seus clientes automaticamente.</small>
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
                    {modo === 'integracao' ? 'Status sincronizado automaticamente' : 'Controle manual do status'}
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

